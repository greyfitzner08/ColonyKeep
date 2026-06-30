"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildCommunityPartnerImportTemplateCsv,
  COMMUNITY_PARTNER_IMPORT_HEADERS,
} from "@/lib/community-partners/import-mapper";
import { Upload } from "lucide-react";

export function CommunityPartnerImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importRows(csvText: string) {
    setImporting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/community-partners/import", {
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
      setError(
        `Imported ${result.imported} organization(s) and ${result.imported_contacts ?? 0} contact(s) with ${result.errors.length} error(s). ${details}`
      );
    } else {
      setMessage(
        `Imported ${result.imported} organization(s) and ${result.imported_contacts ?? 0} contact(s). Repeat the same organization name on additional rows to add more contacts.`
      );
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
    const blob = new Blob([buildCommunityPartnerImportTemplateCsv()], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "community-partners-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import Partners</CardTitle>
        <CardDescription>
          Upload a CSV with organization and contact details. Use the same organization name on
          multiple rows to import several contacts for one partner. Organization Type accepts values
          like Local Business, Rescue / Sanctuary, Grantor / Funder, Sponsor, Municipal / Government,
          Media, or Other. Download the template for all {COMMUNITY_PARTNER_IMPORT_HEADERS.length}{" "}
          columns.
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
          <Upload className="mr-2 h-4 w-4" />
          {importing ? "Importing..." : "Upload CSV"}
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          Download template
        </Button>
        {message && <p className="w-full text-sm text-muted-foreground">{message}</p>}
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
