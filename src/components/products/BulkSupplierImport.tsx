import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImportJob {
  supplier: string;
  category: string;
  url: string;
  brand?: string | null;
}

type JobStatus = "pending" | "running" | "success" | "error";

export const BulkSupplierImport: React.FC = () => {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ job: ImportJob; status: JobStatus; info?: any; error?: string }>>([]);

  const jobs: ImportJob[] = [
    // J. Marr Meat & Poultry
    { supplier: "J. Marr", category: "Meat & Poultry", url: "https://marsea.co.uk/meat" },
    // Seapro SAS Seafood & Meat
    { supplier: "Seapro SAS", category: "Seafood", url: "https://seaprosas.com/en/seafood/" },
    { supplier: "Seapro SAS", category: "Meat", url: "https://seaprosas.com/en/meat/" },
    // JAB Brothers Seafood, Beef, Pork, Poultry
    { supplier: "JAB Brothers", category: "Seafood", url: "https://www.jab-bros.com.ar/seafood" },
    { supplier: "JAB Brothers", category: "Beef", url: "https://www.jab-bros.com.ar/beef" },
    { supplier: "JAB Brothers", category: "Pork", url: "https://www.jab-bros.com.ar/pork" },
    { supplier: "JAB Brothers", category: "Poultry", url: "https://www.jab-bros.com.ar/poultry" },
  ];

  const startImports = async () => {
    setRunning(true);
    setResults(jobs.map((j) => ({ job: j, status: "pending" })));

    try {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)));
        try {
          const { data, error } = await supabase.functions.invoke("import-supplier-catalog", {
            body: {
              supplier: job.supplier,
              category: job.category,
              url: job.url,
              brand: job.supplier,
              download: true,
              clearExisting: true,
            },
          });

          if (error) throw new Error(error.message || "Import failed");

          setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "success", info: data?.summary } : r)));
        } catch (e) {
          setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "error", error: (e as Error).message } : r)));
        }
      }

      toast({ title: "Imports complete", description: "All supplier imports have finished." });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>Supplier Catalog Imports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button onClick={startImports} disabled={running} className="min-w-[200px]">
            {running ? "Importing..." : "Run All Imports"}
          </Button>
          <span className="text-sm opacity-70">Runs image downloads in background where available.</span>
        </div>
        <ul className="space-y-2 text-sm">
          {jobs.map((job, idx) => {
            const res = results[idx];
            const status = res?.status || "pending";
            return (
              <li key={`${job.supplier}-${job.category}`} className="flex items-start justify-between gap-4 border rounded-md p-3">
                <div>
                  <div className="font-medium">{job.supplier} — {job.category}</div>
                  <div className="opacity-70">{job.url}</div>
                </div>
                <div className="text-right min-w-[140px]">
                  {status === "pending" && <span className="opacity-70">Pending</span>}
                  {status === "running" && <span className="text-primary">Running…</span>}
                  {status === "success" && <span className="text-green-600">Done</span>}
                  {status === "error" && <span className="text-red-600">Error</span>}
                  {res?.info?.imported !== undefined && (
                    <div className="opacity-70">Imported: {res.info.imported}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default BulkSupplierImport;
