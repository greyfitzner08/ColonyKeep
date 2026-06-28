"use client";

import { useEffect, useRef, useState } from "react";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
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
  const [pregnant, setPregnant] = useState(helpRequest.pregnant_count);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const skipAutosaveRef = useRef(true);

  useEffect(() => {
    skipAutosaveRef.current = true;
    setPregnant(helpRequest.pregnant_count);
    const timer = setTimeout(() => {
      skipAutosaveRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [helpRequest]);

  const counts = summarizeCatCounts(helpRequest, clinicFixes);

  async function savePregnantCount(nextPregnant: number) {
    setSaveState("saving");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("help_requests")
      .update({ pregnant_count: nextPregnant })
      .eq("id", helpRequest.id);

    if (updateError) {
      setSaveState("error");
      setError(updateError.message);
      return;
    }

    onUpdated({ ...helpRequest, pregnant_count: nextPregnant });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  const debouncedSave = useDebouncedCallback((nextPregnant: number) => {
    void savePregnantCount(nextPregnant);
  }, 800);

  function queueSave(nextPregnant: number) {
    if (skipAutosaveRef.current) return;
    debouncedSave(nextPregnant);
  }

  return (
    <CaseCollapsibleSection title="Colony cat counts" defaultOpen>
      <div className="space-y-4">
        <CatCountSummaryDisplay counts={counts} pregnantCount={pregnant} />

        <div className="max-w-xs space-y-2">
          <Label>Suspected pregnant</Label>
          <Input
            type="number"
            min={0}
            value={pregnant}
            onChange={(e) => {
              const value = Math.max(0, parseInt(e.target.value, 10) || 0);
              setPregnant(value);
              queueSave(value);
            }}
          />
        </div>

        {saveState === "saving" && (
          <p className="text-xs text-muted-foreground">Saving…</p>
        )}
        {saveState === "saved" && (
          <p className="text-xs text-muted-foreground">Saved</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </CaseCollapsibleSection>
  );
}
