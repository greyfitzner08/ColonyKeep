"use client";

import { useState } from "react";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { HelpRequest } from "@/lib/types";

interface ColonyCatSummaryEditorProps {
  helpRequest: HelpRequest;
  onUpdated: (next: HelpRequest) => void;
}

export function ColonyCatSummaryEditor({ helpRequest, onUpdated }: ColonyCatSummaryEditorProps) {
  const [adults, setAdults] = useState(helpRequest.cats_over_8_weeks);
  const [kittens, setKittens] = useState(helpRequest.kittens_under_8_weeks);
  const [pregnant, setPregnant] = useState(helpRequest.pregnant_count);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    adults !== helpRequest.cats_over_8_weeks ||
    kittens !== helpRequest.kittens_under_8_weeks ||
    pregnant !== helpRequest.pregnant_count;

  async function saveCounts() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("help_requests")
      .update({
        cats_over_8_weeks: adults,
        kittens_under_8_weeks: kittens,
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
      cats_over_8_weeks: adults,
      kittens_under_8_weeks: kittens,
      pregnant_count: pregnant,
    });
  }

  return (
    <CaseCollapsibleSection title="Colony cat counts" defaultOpen>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Adults (8+ weeks)</Label>
            <Input
              type="number"
              min={0}
              value={adults}
              onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label>Kittens (&lt;8 weeks)</Label>
            <Input
              type="number"
              min={0}
              value={kittens}
              onChange={(e) => setKittens(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
        <p className="text-sm text-muted-foreground">
          Total colony size: {adults + kittens} cat{adults + kittens !== 1 ? "s" : ""}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={saveCounts} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save colony counts"}
        </Button>
      </div>
    </CaseCollapsibleSection>
  );
}
