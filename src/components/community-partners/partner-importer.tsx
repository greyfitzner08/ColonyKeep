"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCommunityPartnerImportTemplateCsv } from "@/lib/community-partners/import-mapper";

interface CommunityPartnerImporterProps {
  children?: React.ReactNode;
  exportCount: number;
  onExport: () => void;
  copyCount: number;
  copyCopied: boolean;
  copyDisabled?: boolean;
  onCopyEmails: () => void;
}

export function CommunityPartnerImporter({
  children,
  exportCount,
  onExport,
  copyCount,
  copyCopied,
  copyDisabled,
  onCopyEmails,
}: CommunityPartnerImporterProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [menuOpen]);

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
    event.target.value = "";
    if (!file) return;

    const text = await file.text();
    if (!text.trim()) {
      setError("CSV file is empty or missing a header row.");
      return;
    }

    await importRows(text);
  }

  function downloadTemplate() {
    setMenuOpen(false);
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
            aria-label="Partner tools"
            aria-expanded={menuOpen}
            disabled={importing}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  inputRef.current?.click();
                }}
              >
                {importing ? "Uploading…" : "Upload CSV"}
              </button>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={downloadTemplate}
              >
                Download template
              </button>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  onExport();
                }}
              >
                Export CSV{exportCount > 0 ? ` (${exportCount})` : ""}
              </button>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                disabled={copyDisabled}
                onClick={() => {
                  setMenuOpen(false);
                  onCopyEmails();
                }}
              >
                {copyCopied
                  ? "Copied!"
                  : `Copy ${copyCount} email${copyCount === 1 ? "" : "s"}`}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {message ? <p className="max-w-md text-right text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="max-w-md text-right text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
