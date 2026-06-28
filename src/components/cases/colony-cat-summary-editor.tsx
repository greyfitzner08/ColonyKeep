"use client";

import { useEffect, useRef, useState } from "react";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { reportedAdults, reportedKittens, summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { ClinicFix, HelpRequest } from "@/lib/types";

interface ColonyCatSummaryEditorProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  onUpdated: (next: HelpRequest) => void;
}

export function ColonyCatSummaryEditor({
  helpRequest,
  clinicFixes,
  onUpdated,
}: ColonyCatSummaryEditorProps) {
  const [adults, setAdults] = useState(reportedAdults(helpRequest));
  const [kittens, setKittens] = useState(reportedKittens(helpRequest));
  const [pregnant, setPregnant] = useState(helpRequest.pregnant_count);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const skipAutosaveRef = useRef(true);

  useEffect(() => {
    skipAutosaveRef.current = true;
    setAdults(reportedAdults(helpRequest));
    setKittens(reportedKittens(helpRequest));
    setPregnant(helpRequest.pregnant_count);
    const timer = setTimeout(() => {
      skipAutosaveRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [helpRequest]);

  const counts = summarizeCatCounts(
    {
      ...helpRequest,
      reported_cats_over_8_weeks: adults,
      reported_kittens_under_8_weeks: kittens,
    },
    clinicFixes
  );

  async function saveCounts(
    nextAdults: number,
    nextKittens: number,
    nextPregnant: number
  ) {
    const nextCounts = summarizeCatCounts(
      {
        ...helpRequest,
        reported_cats_over_8_weeks: nextAdults,
        reported_kittens_under_8_weeks: nextKittens,
      },
      clinicFixes
    );

    setSaveState("saving");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("help_requests")
      .update({
        reported_cats_over_8_weeks: nextAdults,
        reported_kittens_under_8_weeks: nextKittens,
        cats_over_8_weeks: nextCounts.remainingAdults,
        kittens_under_8_weeks: nextCounts.remainingKittens,
        cats_remaining: nextCounts.remainingTotal,
        pregnant_count: nextPregnant,
      })
      .eq("id", helpRequest.id);

    if (updateError) {
      setSaveState("error");
      setError(updateError.message);
      return;
    }

    onUpdated({
      ...helpRequest,
      reported_cats_over_8_weeks: nextAdults,
      reported_kittens_under_8_weeks: nextKittens,
      cats_over_8_weeks: nextCounts.remainingAdults,
      kittens_under_8_weeks: nextCounts.remainingKittens,
      cats_remaining: nextCounts.remainingTotal,
      pregnant_count: nextPregnant,
      outcome_tnvr_count: nextCounts.fixedTotal,
    });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  const debouncedSave = useDebouncedCallback(
    (nextAdults: number, nextKittens: number, nextPregnant: number) => {
      void saveCounts(nextAdults, nextKittens, nextPregnant);
    },
    800
  );

  function queueSave(nextAdults: number, nextKittens: number, nextPregnant: number) {
    if (skipAutosaveRef.current) return;
    debouncedSave(nextAdults, nextKittens, nextPregnant);
  }

  return (
    <CaseCollapsibleSection title="Colony cat counts" defaultOpen>
      <div className="space-y-4">
        <CatCountSummaryDisplay counts={counts} pregnantCount={pregnant} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Originally reported adults (8+ weeks)</Label>
            <Input
              type="number"
              min={counts.fixedAdults}
              value={adults}
              onChange={(e) => {
                const value = Math.max(counts.fixedAdults, parseInt(e.target.value, 10) || 0);
                setAdults(value);
                queueSave(value, kittens, pregnant);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Originally reported kittens (&lt;8 weeks)</Label>
            <Input
              type="number"
              min={counts.fixedKittens}
              value={kittens}
              onChange={(e) => {
                const value = Math.max(counts.fixedKittens, parseInt(e.target.value, 10) || 0);
                setKittens(value);
                queueSave(adults, value, pregnant);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Suspected pregnant</Label>
            <Input
              type="number"
              min={0}
              value={pregnant}
              onChange={(e) => {
                const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                setPregnant(value);
                queueSave(adults, kittens, value);
              }}
            />
          </div>
        </div>

        {saveState === "saving" && (
          <p className="text-xs text-muted-foreground">Saving cat counts…</p>
        )}
        {saveState === "saved" && (
          <p className="text-xs text-muted-foreground">Cat counts saved</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </CaseCollapsibleSection>
  );
}
