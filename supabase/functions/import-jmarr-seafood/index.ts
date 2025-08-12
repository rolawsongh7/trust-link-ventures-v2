// Supabase Edge Function: import-jmarr-seafood
// - Crawls J. Marr seafood catalog and imports 102 products
// - Hotlinks images first, optional background download to Supabase Storage
// - Publicly invokable (CORS enabled)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import FirecrawlApp from "npm:@mendable/firecrawl-js";

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface ImportOptions {
  download?: boolean;
}

interface SupplierProductRow {
  supplier: string;
  brand?: string | null;
  category: string;
  name: string;
  slug: string;
  description?: string | null;
  source_url?: string | null;
  remote_image_url?: string | null;
  image_path?: string | null;
  image_public_url?: string | null;
  is_active?: boolean;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function parseProductsFromMarkdown(md: string) {
  // Heuristic parser based on marsea.co.uk/fish page structure in markdown
  const lines = md.split(/\r?\n/);
  type Item = { name: string; image: string; origin?: string; };
  const items: Item[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const imgMatch = line.match(/^!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
    if (!imgMatch) continue;
    const image = imgMatch[1];

    // Look ahead for 'Common Name' then the next non-empty line as the name
    let name: string | null = null;
    let origin: string | undefined;
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const lj = lines[j].trim();
      if (!name && /^Common Name$/i.test(lj)) {
        // Next non-empty becomes name
        for (let k = j + 1; k < Math.min(j + 6, lines.length); k++) {
          const candidate = lines[k].trim();
          if (candidate) {
            name = candidate;
            break;
          }
        }
      }
      if (!origin && /^Origin$/i.test(lj)) {
        // Next non-empty becomes origin
        for (let k = j + 1; k < Math.min(j + 6, lines.length); k++) {
          const candidate = lines[k].trim();
          if (candidate) {
            origin = candidate;
            break;
          }
        }
      }
      if (name && origin) break;
    }

    if (name) {
      items.push({ name, image, origin });
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    const key = it.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase service credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Missing FIRECRAWL_API_KEY secret" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const opts: ImportOptions = {
      download: Boolean(body.download ?? url.searchParams.get("download")),
    };

    // Crawl the page (limit high enough to get all entries)
    const crawlRes: any = await firecrawl.crawlUrl("https://marsea.co.uk/fish", {
      limit: 200,
      scrapeOptions: { formats: ["markdown", "html"] },
    });

    if (!crawlRes?.success) {
      return new Response(
        JSON.stringify({ error: "Failed to crawl J. Marr seafood page", details: crawlRes }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prefer markdown content for parsing
    const md = typeof crawlRes?.data?.[0]?.markdown === "string"
      ? crawlRes.data.map((p: any) => p.markdown).join("\n\n")
      : JSON.stringify(crawlRes.data);

    const parsed = parseProductsFromMarkdown(md);

    // Build rows
    const supplierName = "J. Marr";
    const category = "Seafood";

    // Clear existing batch for idempotency
    await supabase
      .from("supplier_products")
      .delete()
      .eq("supplier", supplierName)
      .eq("category", category);

    const rows: SupplierProductRow[] = parsed.map((p) => ({
      supplier: supplierName,
      brand: supplierName,
      category,
      name: p.name,
      slug: slugify(`${supplierName}-${category}-${p.name}`),
      description: p.origin ? `Origin: ${p.origin}` : null,
      source_url: "https://marsea.co.uk/fish",
      remote_image_url: p.image,
      is_active: true,
    }));

    // Insert in chunks
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("supplier_products").insert(chunk);
      if (error) {
        console.error("Insert error", error);
        return new Response(
          JSON.stringify({ error: "Insert failed", details: error }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    let downloadStarted = false;

    // Background download and upload to storage
    if (opts.download) {
      downloadStarted = true;
      EdgeRuntime.waitUntil((async () => {
        const { data: fresh, error } = await supabase
          .from("supplier_products")
          .select("id, name, slug, remote_image_url")
          .eq("supplier", supplierName)
          .eq("category", category);
        if (error || !fresh) {
          console.error("Fetch for download failed", error);
          return;
        }

        for (const item of fresh) {
          try {
            const imgUrl: string | null = item.remote_image_url;
            if (!imgUrl) continue;

            const resp = await fetch(imgUrl);
            if (!resp.ok) throw new Error(`Failed to download image (${resp.status})`);
            const contentType = resp.headers.get("content-type") || "image/png";
            const arrayBuffer = await resp.arrayBuffer();

            const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "bin";
            const path = `jmarr/seafood/${item.slug}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from("supplier-products")
              .upload(path, new Uint8Array(arrayBuffer), {
                contentType,
                upsert: true,
              });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from("supplier-products").getPublicUrl(path);
            const publicUrl = pub?.publicUrl || null;

            await supabase
              .from("supplier_products")
              .update({ image_path: path, image_public_url: publicUrl })
              .eq("id", item.id);
          } catch (e) {
            console.error(`Image upload failed for ${item.name}:`, e);
            continue;
          }
        }
      })());
    }

    const summary = {
      imported: rows.length,
      supplier: supplierName,
      category,
      downloadStarted,
      sample: rows.slice(0, 5).map((r) => ({ name: r.name, remote_image_url: r.remote_image_url })),
    };

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
