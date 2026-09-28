"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCatImportTemplateCsv } from "@/lib/adoption/import-cats";

export function AdoptableCatImporter({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([buildCatImportTemplateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "adoptable-cats-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const csvText = await file.text();
    if (!csvText.trim()) {
      setMessage(null);
      setWarning(null);
      setError("CSV file is empty or missing a header row.");
      return;
    }

    setImporting(true);
    setMessage(null);
    setWarning(null);
    setError(null);
    const response = await fetch("/api/adoption/cats/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText }),
    });
    const result = await response.json().catch(() => null);
    setImporting(false);

    const imported = Number(result?.imported ?? 0);
    const names = Array.isArray(result?.names) ? result.names.filter((name: unknown) => typeof name === "string") : [];
    const errors = Array.isArray(result?.errors) ? result.errors : [];
    const details = errors
      .slice(0, 3)
      .map((entry: { row?: number; error?: string }) =>
        entry.row ? `Row ${entry.row}: ${entry.error}` : entry.error
      )
      .filter(Boolean)
      .join("; ");
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
    const warningText = warnings
      .slice(0, 3)
      .map((entry: { row?: number; error?: string }) =>
        entry.row ? `Row ${entry.row}: ${entry.error}` : entry.error
      )
      .filter(Boolean)
      .join("; ");

    if (!response.ok || imported === 0) {
      setError(details || result?.error || "Import failed");
      return;
    }

    const listed = names.slice(0, 8).join(", ");
    const extra = names.length > 8 ? ` and ${names.length - 8} more` : "";
    if (warningText) setWarning(warningText);
    if (errors.length > 0) {
      setError(`Imported ${imported} cat${imported === 1 ? "" : "s"} (${listed}${extra}). ${details}`);
    } else {
      setMessage(`Imported ${imported} cat${imported === 1 ? "" : "s"}: ${listed}${extra}.`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {importing ? "Importing…" : "Import CSV"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2.5" onClick={downloadTemplate}>
          Template
        </Button>
        {children}
      </div>
      <p className="max-w-xl text-right text-xs text-muted-foreground">
        One row per cat. Cat name is required. Gender can be Female, Male, F, or M. Adopted can be Yes, No, or blank.
        Dates use YYYY-MM-DD. Vaccinations
        and next veterinary care list each item as Service YYYY-MM-DD, separated by semicolons.
      </p>
      {message ? <p className="max-w-md text-right text-sm text-muted-foreground">{message}</p> : null}
      {warning ? <p className="max-w-md text-right text-sm text-muted-foreground">{warning}</p> : null}
      {error ? <p className="max-w-md text-right text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
