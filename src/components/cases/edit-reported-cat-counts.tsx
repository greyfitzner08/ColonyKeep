"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HelpRequest } from "@/lib/types";
import { Pencil } from "lucide-react";

type ReportedCountPatch = Pick<
  HelpRequest,
  | "reported_cats_over_8_weeks"
  | "reported_kittens_under_8_weeks"
  | "cats_over_8_weeks"
  | "kittens_under_8_weeks"
  | "cats_remaining"
  | "history_log"
>;

interface EditReportedCatCountsProps {
  helpRequestId: string;
  adults: number;
  kittens: number;
  onSaved: (patch: ReportedCountPatch) => void;
}

export function EditReportedCatCounts({
  helpRequestId,
  adults,
  kittens,
  onSaved,
}: EditReportedCatCountsProps) {
  const [open, setOpen] = useState(false);
  const [adultsValue, setAdultsValue] = useState(String(adults));
  const [kittensValue, setKittensValue] = useState(String(kittens));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function beginEdit() {
    setAdultsValue(String(adults));
    setKittensValue(String(kittens));
    setError(null);
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    setError(null);
  }

  async function save() {
    const nextAdults = Number(adultsValue);
    const nextKittens = Number(kittensValue);
    if (
      !Number.isFinite(nextAdults) ||
      !Number.isFinite(nextKittens) ||
      nextAdults < 0 ||
      nextKittens < 0 ||
      !Number.isInteger(nextAdults) ||
      !Number.isInteger(nextKittens)
    ) {
      setError("Enter whole numbers 0 or greater for adults and kittens.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/help-requests/reported-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId,
        adults: nextAdults,
        kittens: nextKittens,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to update reported counts.");
      return;
    }

    onSaved({
      reported_cats_over_8_weeks: result.reported_cats_over_8_weeks,
      reported_kittens_under_8_weeks: result.reported_kittens_under_8_weeks,
      cats_over_8_weeks: result.cats_over_8_weeks,
      kittens_under_8_weeks: result.kittens_under_8_weeks,
      cats_remaining: result.cats_remaining,
      history_log: result.history_log,
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={beginEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Correct reported counts
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-md bg-muted/30 p-3">
      <p className="text-sm font-medium">Correct originally reported cats</p>
      <p className="text-xs text-muted-foreground">
        Use this when intake had a typo or the colony size changed. Still need fixing and
        reporting totals update from the new reported counts.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reported-adults">Adults</Label>
          <Input
            id="reported-adults"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={adultsValue}
            onChange={(event) => setAdultsValue(event.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reported-kittens">Kittens</Label>
          <Input
            id="reported-kittens"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={kittensValue}
            onChange={(event) => setKittensValue(event.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save counts"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
