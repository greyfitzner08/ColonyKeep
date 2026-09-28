"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCatImportTemplateCsv } from "@/lib/adoption/import-cats";

export function AdoptableCatImporter({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [menuOpen]);

  function downloadTemplate() {
    setMenuOpen(false);
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

    const listed = names.slice(0, 8).join(" · ");
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
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {children}
        <div className="relative" ref={menuRef}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Import options"
            aria-expanded={menuOpen}
            disabled={importing}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  inputRef.current?.click();
                }}
              >
                {importing ? "Importing…" : "Import CSV"}
              </button>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={downloadTemplate}
              >
                Download template
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {message ? <p className="max-w-md text-right text-sm text-muted-foreground">{message}</p> : null}
      {warning ? <p className="max-w-md text-right text-sm text-muted-foreground">{warning}</p> : null}
      {error ? <p className="max-w-md text-right text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
