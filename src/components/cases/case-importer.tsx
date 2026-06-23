"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCsv } from "@/lib/csv";
import { Upload } from "lucide-react";

const TEMPLATE = `contact_name,contact_email,contact_phone,colony_address,colony_city,colony_county,colony_zip,kittens_under_8_weeks,cats_over_8_weeks,intake_notes
Jane Doe,jane@example.com,555-0100,123 Main St,Springfield,Greene,65801,2,5,One cat appears injured and limping`;

export function CaseImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importRows(rows: Record<string, string>[]) {
    setImporting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/help-requests/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const result = await response.json().catch(() => null);
    setImporting(false);

    if (!response.ok) {
      setError(result?.error ?? "Import failed");
      return;
    }

    if (result.errors?.length) {
      const details = result.errors
        .slice(0, 3)
        .map((entry: { row: number; error: string }) => `Row ${entry.row}: ${entry.error}`)
        .join("; ");
      setError(`Imported ${result.imported} case(s) with ${result.errors.length} error(s). ${details}`);
    } else {
      setMessage(`Imported ${result.imported} case(s): ${result.caseNumbers?.join(", ")}`);
    }

    router.refresh();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setError("CSV file is empty or missing a header row.");
      return;
    }

    await importRows(rows);
    event.target.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "case-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Cases</CardTitle>
        <CardDescription>
          Admin only. Upload a CSV to bulk-create intake cases. Required columns: contact_name,
          contact_email, contact_phone, colony_address, colony_city, colony_county, colony_zip.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {importing ? "Importing..." : "Upload CSV"}
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          Download template
        </Button>
        {message && <p className="text-sm text-green-700 w-full">{message}</p>}
        {error && <p className="text-sm text-destructive w-full">{error}</p>}
      </CardContent>
    </Card>
  );
}
