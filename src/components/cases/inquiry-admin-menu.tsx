"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardCopy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseImporter } from "@/components/cases/case-importer";

function uniqueEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of emails) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  return unique;
}

interface InquiryAdminMenuProps {
  /** Submitter emails from the current trap-queue view (admin copy tool). */
  submitterEmails?: string[];
}

export function InquiryAdminMenu({ submitterEmails = [] }: InquiryAdminMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const emails = useMemo(() => uniqueEmails(submitterEmails), [submitterEmails]);

  async function copyAllEmails() {
    setCopyError(null);
    if (emails.length === 0) {
      setCopyError("No submitter emails in this view.");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy to clipboard. Check browser permissions.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Case admin tools"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Case admin tools</DialogTitle>
            <DialogDescription>
              Import legacy cases, assign trap teams by colony size/ZIP, and copy submitter emails
              from the current queue view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Copy submitter emails</p>
              <p className="text-sm text-muted-foreground">
                Copies unique reporter emails from the cases currently shown in this trap queue
                view ({emails.length} unique
                {submitterEmails.length !== emails.length
                  ? ` from ${submitterEmails.length} cases`
                  : ""}
                ).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void copyAllEmails()}
              disabled={emails.length === 0}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  Copied {emails.length} email{emails.length === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  Copy all emails
                </>
              )}
            </Button>
            {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}
          </div>

          <CaseImporter variant="panel" />
        </DialogContent>
      </Dialog>
    </>
  );
}
