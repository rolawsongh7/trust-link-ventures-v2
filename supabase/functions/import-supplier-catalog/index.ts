// Supabase Edge Function: import-supplier-catalog
// - Generic importer for supplier catalogs via Firecrawl
// - Accepts supplier, category, and source URL; hotlinks images and optional background download to Storage
// - Publicly invokable (CORS enabled)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import FirecrawlApp from "npm:@mendable/firecrawl-js";

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequestBody {
  supplier: string;
  category: string;
  url: string;
  brand?: string | null;
  download?: boolean;
  clearExisting?: boolean;
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

function filenameToName(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "";
    const base = last.replace(/\.[a-zA-Z0-9]+$/, "");
    return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return url;
  }
}

function parseProductsGenericFromMarkdown(md: string) {
  const lines = md.split(/\r?\n/);
  type Item = { name: string; image: string };
  const items: Item[] = [];

  function isGenericAlt(alt: string | undefined) {
    if (!alt) return true;
    const a = alt.trim().toLowerCase();
    return a === "image" || a === "photo" || a === "picture" || a.length < 2;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match markdown image syntax
    const imgMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
    if (!imgMatch) continue;
    const alt = imgMatch[1];
    const image = imgMatch[2];

    let name: string | null = null;
    if (!isGenericAlt(alt)) {
      name = alt.trim();
    }

    // Search nearby lines for a plausible name if alt isn't helpful
    if (!name) {
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        if (/^!\[.*\]\(https?:\/\//.test(candidate)) break; // another image soon after
        if (/^https?:\/\//.test(candidate)) continue; // skip bare URLs
        // Strip markdown headings and formatting symbols
        const clean = candidate.replace(/^#+\s*/, "").replace(/^\*+\s*/, "").replace(/^\-+\s*/, "").trim();
        if (clean && /[a-zA-Z]{2,}/.test(clean)) {
          name = clean;
          break;
        }
      }
    }

    if (!name) {
      name = filenameToName(image);
    }

    if (name) items.push({ name, image });
  }

  // Deduplicate by name (case-insensitive)
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    const key = it.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

function parseProductsGenericFromHtml(html: string) {
  const items: { name: string; image: string }[] = [];
  const add = (name?: string | null, image?: string | null) => {
    if (!image) return;
    const n = (name && name.trim()) || filenameToName(image);
    if (!n) return;
    items.push({ name: n, image });
  };
  // Parse <img> tags with alt text and lazy-loaded sources
  const imgTagRegex = /<img[^>]*>/gi;
  const srcAttrRegex = /\s(?:data-src|data-original|src|srcset)\s*=\s*"([^"]+)"|\s(?:data-src|data-original|src|srcset)\s*=\s*'([^']+)'/i;
  const altAttrRegex = /\salt\s*=\s*"([^"]*)"|\salt\s*=\s*'([^']*)'/i;
  const candidates = html.match(imgTagRegex) || [];
  for (const tag of candidates) {
    const altMatch = tag.match(altAttrRegex);
    const altRaw = altMatch ? (altMatch[1] || altMatch[2] || '').trim() : '';
    let srcRaw = '';
    const srcMatch = tag.match(srcAttrRegex);
    if (srcMatch) {
      srcRaw = (srcMatch[1] || srcMatch[2] || '').trim();
      // If srcset, take the first URL
      if (srcRaw.includes(' ')) srcRaw = srcRaw.split(',')[0].trim().split(' ')[0];
    }
    if (!/^https?:\/\//.test(srcRaw)) continue;
    add(altRaw, srcRaw);
  }
  // Deduplicate by name (case-insensitive)
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

    const body = (await req.json().catch(() => ({}))) as Partial<ImportRequestBody>;
    const url = body.url?.trim();
    const supplier = body.supplier?.trim();
    const category = body.category?.trim();

    if (!url || !supplier || !category) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: supplier, category, url" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const brand = (body.brand ?? supplier) as string | null;
    const download = Boolean(body.download ?? true);
    const clearExisting = body.clearExisting !== false; // default true

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });

    // Crawl the page
    const crawlRes: any = await firecrawl.crawlUrl(url, {
      limit: 200,
      scrapeOptions: { formats: ["markdown", "html"] },
    });

    if (!crawlRes?.success) {
      return new Response(
        JSON.stringify({ error: "Failed to crawl source page", details: crawlRes }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const md = typeof crawlRes?.data?.[0]?.markdown === "string"
      ? crawlRes.data.map((p: any) => p.markdown).join("\n\n")
      : JSON.stringify(crawlRes.data);

    const html = typeof crawlRes?.data?.[0]?.html === "string"
      ? crawlRes.data.map((p: any) => p.html).join("\n\n")
      : "";

    const parsedMd = parseProductsGenericFromMarkdown(md);
    const parsedHtml = html ? parseProductsGenericFromHtml(html) : [];
    const mergedMap = new Map<string, { name: string; image: string }>();
    for (const it of [...parsedHtml, ...parsedMd]) {
      const key = it.name.toLowerCase();
      if (!mergedMap.has(key)) mergedMap.set(key, it);
    }
    const parsed = Array.from(mergedMap.values());

    if (clearExisting) {
      await supabase
        .from("supplier_products")
        .delete()
        .eq("supplier", supplier)
        .eq("category", category);
    }

    const rows: SupplierProductRow[] = parsed.map((p) => ({
      supplier,
      brand,
      category,
      name: p.name,
      slug: slugify(`${supplier}-${category}-${p.name}`),
      description: null,
      source_url: url,
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

    if (download) {
      downloadStarted = true;
      EdgeRuntime.waitUntil((async () => {
        const { data: fresh, error } = await supabase
          .from("supplier_products")
          .select("id, name, slug, remote_image_url")
          .eq("supplier", supplier)
          .eq("category", category);
        if (error || !fresh) {
          console.error("Fetch for download failed", error);
          return;
        }

        for (const item of fresh) {
          try {
            const imgUrl: string | null = (item as any).remote_image_url;
            if (!imgUrl) continue;

            const resp = await fetch(imgUrl);
            if (!resp.ok) throw new Error(`Failed to download image (${resp.status})`);
            const contentType = resp.headers.get("content-type") || "image/png";
            const arrayBuffer = await resp.arrayBuffer();

            const ext = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
            const path = `${slugify(supplier)}/${slugify(category)}/${(item as any).slug}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from("supplier-products")
              .upload(path, new Uint8Array(arrayBuffer), {
                contentType,
                upsert: true,
              });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from("supplier-products").getPublicUrl(path);
            const publicUrl = (pub as any)?.publicUrl || null;

            await supabase
              .from("supplier_products")
              .update({ image_path: path, image_public_url: publicUrl })
              .eq("id", (item as any).id);
          } catch (e) {
            console.error(`Image upload failed for ${(item as any).name}:`, e);
            continue;
          }
        }
      })());
    }

    const summary = {
      imported: rows.length,
      supplier,
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
