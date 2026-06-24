"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardCopy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NEWSLETTER_SIGNUP_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export interface NewsletterSignupRow {
  id: string;
  case_number: string | null;
  contact_name: string;
  contact_email: string;
  created_at: string;
  newsletter_list_added_at: string | null;
}

function uniqueEmails(rows: NewsletterSignupRow[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const row of rows) {
    const email = row.contact_email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(row.contact_email.trim());
  }
  return emails;
}

export function NewsletterSignupPanel({ signups }: { signups: NewsletterSignupRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdded, setShowAdded] = useState(false);

  const pending = useMemo(
    () => signups.filter((row) => !row.newsletter_list_added_at),
    [signups]
  );
  const added = useMemo(
    () => signups.filter((row) => row.newsletter_list_added_at),
    [signups]
  );

  const visibleRows = showAdded ? added : pending;
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const row of visibleRows) next.delete(row.id);
        return next;
      });
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of visibleRows) next.add(row.id);
      return next;
    });
  }

  async function copyEmails(rows: NewsletterSignupRow[]) {
    const emails = uniqueEmails(rows);
    if (!emails.length) return;

    await navigator.clipboard.writeText(emails.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function updateSignups(action: "mark_added" | "restore") {
    const ids = [...selected];
    if (!ids.length) return;

    setBusy(true);
    setError(null);

    const response = await fetch("/api/reports/newsletter-signups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    const result = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to update signups");
      return;
    }

    setSelected(new Set());
    router.refresh();
  }

  const selectedRows = signups.filter((row) => selected.has(row.id));
  const selectedPending = selectedRows.filter((row) => !row.newsletter_list_added_at);
  const selectedAdded = selectedRows.filter((row) => row.newsletter_list_added_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{NEWSLETTER_SIGNUP_LABEL}</CardTitle>
        <CardDescription>
          People who opted in to Friends of Feral Felines communications. Copy emails for your
          mailing list, then mark them as added so they leave the pending queue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={showAdded ? "outline" : "default"}
            size="sm"
            onClick={() => {
              setShowAdded(false);
              setSelected(new Set());
            }}
          >
            Pending ({pending.length})
          </Button>
          <Button
            type="button"
            variant={showAdded ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowAdded(true);
              setSelected(new Set());
            }}
          >
            Added to list ({added.length})
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!visibleRows.length}
            onClick={() => copyEmails(selectedRows.length ? selectedRows : visibleRows)}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="h-4 w-4 mr-2" />
                {selectedRows.length
                  ? `Copy ${uniqueEmails(selectedRows).length} selected`
                  : `Copy all ${uniqueEmails(visibleRows).length}`}
              </>
            )}
          </Button>

          {!showAdded && (
            <Button
              type="button"
              size="sm"
              disabled={busy || !selectedPending.length}
              onClick={() => updateSignups("mark_added")}
            >
              Mark {selectedPending.length || ""} as added to list
            </Button>
          )}

          {showAdded && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !selectedAdded.length}
              onClick={() => updateSignups("restore")}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Move back to pending
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {visibleRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {showAdded ? "No signups marked as added yet." : "No pending newsletter signups."}
          </p>
        ) : (
          <div className="rounded-lg border divide-y">
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 text-sm font-medium">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleAllVisible}
                aria-label="Select all"
              />
              <span className="flex-1">Contact</span>
              <span className="w-28 hidden sm:block">Case</span>
              <span className="w-36 hidden md:block">{showAdded ? "Added" : "Signed up"}</span>
            </div>
            {visibleRows.map((row) => (
              <label
                key={row.id}
                className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
              >
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={() => toggleRow(row.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{row.contact_name || "Unknown"}</p>
                  <p className="text-muted-foreground truncate">{row.contact_email}</p>
                </div>
                <span className="w-28 hidden sm:block shrink-0">
                  {row.case_number ? (
                    <Link href={`/case/${row.id}`} className="text-primary hover:underline">
                      {row.case_number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="w-36 hidden md:block shrink-0 text-muted-foreground text-xs">
                  {formatDateTime(showAdded ? row.newsletter_list_added_at! : row.created_at)}
                </span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
