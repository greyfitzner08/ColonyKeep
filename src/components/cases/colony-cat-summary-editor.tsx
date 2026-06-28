"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";

interface ColonyCatSummaryEditorProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  cats: Cat[];
}

export function ColonyCatSummaryEditor({
  helpRequest,
  clinicFixes,
  cats,
}: ColonyCatSummaryEditorProps) {
  const counts = summarizeCatCounts(helpRequest, clinicFixes, cats);

  return (
    <CaseCollapsibleSection title="Colony cat counts" defaultOpen>
      <CatCountSummaryDisplay
        counts={counts}
        pregnantCount={helpRequest.pregnant_count}
      />
    </CaseCollapsibleSection>
  );
}
