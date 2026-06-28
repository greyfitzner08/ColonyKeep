"use client";

import { useState } from "react";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = summarizeCatCounts(
    {
      ...helpRequest,
      reported_cats_over_8_weeks: adults,
      reported_kittens_under_8_weeks: kittens,
    },
    clinicFixes
  );

  const dirty =
    adults !== reportedAdults(helpRequest) ||
    kittens !== reportedKittens(helpRequest) ||
    pregnant !== helpRequest.pregnant_count;

  async function saveCounts() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("help_requests")
      .update({
        reported_cats_over_8_weeks: adults,
        reported_kittens_under_8_weeks: kittens,
        cats_over_8_weeks: counts.remainingAdults,
        kittens_under_8_weeks: counts.remainingKittens,
        cats_remaining: counts.remainingTotal,
        pregnant_count: pregnant,
      })
      .eq("id", helpRequest.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onUpdated({
      ...helpRequest,
      reported_cats_over_8_weeks: adults,
      reported_kittens_under_8_weeks: kittens,
      cats_over_8_weeks: counts.remainingAdults,
      kittens_under_8_weeks: counts.remainingKittens,
      cats_remaining: counts.remainingTotal,
      pregnant_count: pregnant,
      outcome_tnvr_count: counts.fixedTotal,
    });
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
              onChange={(e) => setAdults(Math.max(counts.fixedAdults, parseInt(e.target.value, 10) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Originally reported kittens (&lt;8 weeks)</Label>
            <Input
              type="number"
              min={counts.fixedKittens}
              value={kittens}
              onChange={(e) => setKittens(Math.max(counts.fixedKittens, parseInt(e.target.value, 10) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Suspected pregnant</Label>
            <Input
              type="number"
              min={0}
              value={pregnant}
              onChange={(e) => setPregnant(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={saveCounts} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save reported counts"}
        </Button>
      </div>
    </CaseCollapsibleSection>
  );
}
