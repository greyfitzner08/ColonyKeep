"use client";

import { useState } from "react";
import { Check, ClipboardCopy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type VolunteerCopyFormat = "emails" | "names" | "name_email" | "name_email_phone";

export interface VolunteerCopyContact {
  name: string;
  email: string;
  phone: string;
}

function formatVolunteerContacts(
  contacts: VolunteerCopyContact[],
  format: VolunteerCopyFormat
): string {
  switch (format) {
    case "names":
      return contacts.map((entry) => entry.name).join("\n");
    case "name_email":
      return contacts.map((entry) => `${entry.name} <${entry.email}>`).join("\n");
    case "name_email_phone":
      return contacts
        .map((entry) => [entry.name, entry.email, entry.phone].filter(Boolean).join("\t"))
        .join("\n");
    case "emails":
    default:
      return contacts.map((entry) => entry.email).join("\n");
  }
}

interface VolunteersAdminMenuProps {
  contacts: VolunteerCopyContact[];
  shownCount: number;
}

export function VolunteersAdminMenu({ contacts, shownCount }: VolunteersAdminMenuProps) {
  const [open, setOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyContacts(format: VolunteerCopyFormat) {
    setCopyError(null);
    if (contacts.length === 0) {
      setCopyError("No volunteers in the current filtered list.");
      return;
    }

    try {
      await navigator.clipboard.writeText(formatVolunteerContacts(contacts, format));
      const label =
        format === "emails"
          ? `${contacts.length} email${contacts.length === 1 ? "" : "s"}`
          : format === "names"
            ? `${contacts.length} name${contacts.length === 1 ? "" : "s"}`
            : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`;
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2000);
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
        onClick={() => {
          setCopyError(null);
          setOpen(true);
        }}
        aria-label="Volunteer admin tools"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Volunteer admin tools</DialogTitle>
            <DialogDescription>
              Copy contact details from the volunteers currently shown by your filters
              ({shownCount} shown · {contacts.length} unique email
              {contacts.length === 1 ? "" : "s"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Copy filtered contacts</p>
              <p className="text-sm text-muted-foreground">
                Filter the list first (for example Approved + Any TNVR field role), then copy.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                disabled={contacts.length === 0}
                onClick={() => void copyContacts("emails")}
              >
                {copiedLabel ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Copied {copiedLabel}
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy emails
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={contacts.length === 0}
                onClick={() => void copyContacts("names")}
              >
                Copy names
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={contacts.length === 0}
                onClick={() => void copyContacts("name_email")}
              >
                Copy name + email
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={contacts.length === 0}
                onClick={() => void copyContacts("name_email_phone")}
              >
                Copy name + email + phone
              </Button>
            </div>
            {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
