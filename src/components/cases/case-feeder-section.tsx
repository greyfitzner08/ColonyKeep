"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederFields } from "@/components/cases/case-feeder-fields";
import type { HelpRequest } from "@/lib/types";

interface CaseFeederSectionProps {
  helpRequest: HelpRequest;
  saving?: boolean;
  onChange: (next: HelpRequest) => void;
}

export function CaseFeederSection({
  helpRequest,
  saving = false,
  onChange,
}: CaseFeederSectionProps) {
  return (
    <CaseCollapsibleSection
      title="Colony feeder"
      description="Contact for the person feeding the colony when they are not the reporter."
      defaultOpen
    >
      <div className="space-y-4">
        <CaseFeederFields helpRequest={helpRequest} onChange={onChange} idPrefix="colony-feeder" />
        {saving && <p className="text-xs text-muted-foreground">Saving feeder info…</p>}
      </div>
    </CaseCollapsibleSection>
  );
}
