"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCaseImportTemplateCsv, CASE_IMPORT_HEADERS } from "@/lib/cases/import-mapper";
import { Upload } from "lucide-react";

export function CaseImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [backfilling, setBackfilling] = useState(false);

  async function backfillTeams() {
    setBackfilling(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/help-requests/backfill-teams", { method: "POST" });
    const result = await response.json().catch(() => null);
    setBackfilling(false);

    if (!response.ok) {
      setError(result?.error ?? "Team backfill failed");
      return;
    }

    setMessage(`Assigned ${result.updated} unassigned case(s) to trap teams by colony ZIP.`);
    router.refresh();
  }

  async function importRows(csvText: string) {
    setImporting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/help-requests/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText }),
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
    if (!text.trim()) {
      setError("CSV file is empty or missing a header row.");
      return;
    }

    await importRows(text);
    event.target.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([buildCaseImportTemplateCsv()], { type: "text/csv" });
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
          Admin only. Upload a CSV using the Friends of Feral Felines case export columns.
          Each row needs at least a Case Number, Email, or Phone Number. Download the template
          for the full {CASE_IMPORT_HEADERS.length}-column header row.
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
        <Button variant="ghost" size="sm" disabled={backfilling} onClick={backfillTeams}>
          {backfilling ? "Assigning teams..." : "Assign teams by ZIP"}
        </Button>
        {message && <p className="text-sm text-green-700 w-full">{message}</p>}
        {error && <p className="text-sm text-destructive w-full">{error}</p>}
      </CardContent>
    </Card>
  );
}
