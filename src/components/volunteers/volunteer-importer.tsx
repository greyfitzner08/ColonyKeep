"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildVolunteerImportTemplateCsv,
  VOLUNTEER_IMPORT_HEADERS,
} from "@/lib/volunteers/import-mapper";
import type {
  VolunteerImportDuplicateAction,
  VolunteerImportPreview,
} from "@/lib/volunteers/import-duplicate";
import { VolunteerImportDuplicateDialog } from "@/components/volunteers/volunteer-import-duplicate-dialog";
import { Upload } from "lucide-react";

export function VolunteerImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<VolunteerImportPreview | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  function formatImportResult(result: {
    imported: number;
    errors?: Array<{ row: number; error: string }>;
  }) {
    if (result.errors?.length) {
      const details = result.errors
        .slice(0, 3)
        .map((entry) => `Row ${entry.row}: ${entry.error}`)
        .join("; ");
      setError(
        `Imported ${result.imported} application(s) with ${result.errors.length} error(s). ${details}`
      );
      return;
    }

    setMessage(`Imported ${result.imported} volunteer application(s).`);
  }

  async function commitImport(
    text: string,
    resolutions: Record<string, VolunteerImportDuplicateAction> = {}
  ) {
    setImporting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/volunteers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: text, resolutions }),
    });
    const result = await response.json().catch(() => null);
    setImporting(false);

    if (!response.ok) {
      setError(result?.error ?? "Import failed");
      return false;
    }

    formatImportResult(result);
    setDuplicateDialogOpen(false);
    setCsvText(null);
    setPreview(null);
    router.refresh();
    return true;
  }

  async function previewImport(text: string) {
    setImporting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/volunteers/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: text }),
    });
    const result = await response.json().catch(() => null);
    setImporting(false);

    if (!response.ok) {
      setError(result?.error ?? "Could not preview import");
      return;
    }

    setCsvText(text);
    setPreview(result.preview as VolunteerImportPreview);
    setReadyCount(result.readyCount ?? 0);
    setErrorCount(result.errorCount ?? 0);

    if ((result.duplicateCount ?? 0) > 0) {
      setDuplicateDialogOpen(true);
      return;
    }

    await commitImport(text);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    if (!text.trim()) {
      setError("CSV file is empty or missing a header row.");
      return;
    }

    await previewImport(text);
    event.target.value = "";
  }

  async function handleConfirmDuplicates(
    resolutions: Record<string, VolunteerImportDuplicateAction>
  ) {
    if (!csvText) return;
    await commitImport(csvText, resolutions);
  }

  function downloadTemplate() {
    const blob = new Blob([buildVolunteerImportTemplateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "volunteer-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Volunteers</CardTitle>
          <CardDescription>
            Admin only. Upload volunteer applications as CSV. Duplicate emails are flagged so you
            can keep the current record, replace it, or merge fields. Roles Requested should
            match labels from Admin → Volunteer Roles (comma-separated), including custom or
            renamed roles. Legacy names like Clinic Coordination still work. Birthday and phone
            columns are optional when blank. Imported volunteers must still open and accept the liability waiver and policy on first login, even if the
            CSV marks them signed. Roles Requested should use role labels like &quot;Trapper&quot; or
            &quot;Trap Loaner&quot;, separated by commas. Download the template for all{" "}
            {VOLUNTEER_IMPORT_HEADERS.length} columns.
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
            {importing ? "Processing..." : "Upload CSV"}
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            Download template
          </Button>
          {message && <p className="text-sm text-green-700 w-full">{message}</p>}
          {error && <p className="text-sm text-destructive w-full">{error}</p>}
        </CardContent>
      </Card>

      <VolunteerImportDuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        preview={preview}
        readyCount={readyCount}
        errorCount={errorCount}
        importing={importing}
        onConfirm={handleConfirmDuplicates}
      />
    </>
  );
}
