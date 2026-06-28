"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederSection } from "@/components/cases/case-feeder-section";
import { CatCountSummaryDisplay } from "@/components/cases/cat-count-summary-display";
import { InfoRow } from "@/components/cases/case-detail-fields";
import {
  displayColonyNotes,
  formatSingleLineAddress,
} from "@/lib/cases/colony-notes";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";

interface CaseColonyTabProps {
  helpRequest: HelpRequest;
  clinicFixes: ClinicFix[];
  cats: Cat[];
  savingFeeder?: boolean;
  onChange: (next: HelpRequest) => void;
}

export function CaseColonyTab({
  helpRequest: hr,
  clinicFixes,
  cats,
  savingFeeder = false,
  onChange,
}: CaseColonyTabProps) {
  const colonyAddress = formatSingleLineAddress([
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
  ]);
  const colonyNotes = displayColonyNotes(hr.intake_notes, hr);
  const counts = summarizeCatCounts(hr, clinicFixes, cats);

  return (
    <div className="space-y-4">
      <CaseCollapsibleSection title="Colony location" defaultOpen>
        <dl>
          <InfoRow label="Address" value={colonyAddress} alwaysShow />
        </dl>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Cat counts" defaultOpen>
        <CatCountSummaryDisplay
          counts={counts}
          pregnantCount={hr.pregnant_count}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Log clinic fixes on the Tracked Cats tab. Cats sent to foster/facility are removed from
          still-at-colony counts; fixed cats returned to the colony remain counted there.
        </p>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Care & trapping" defaultOpen={false}>
        <dl>
          <InfoRow label="Feeding cats?" value={hr.feeding_cats} />
          <InfoRow label="Feeder note from intake" value={hr.feeder_if_not} />
          <InfoRow label="Trapping experience" value={hr.trapping_experience} />
          <InfoRow label="Needs traps?" value={hr.need_traps} />
          <InfoRow label="Willing to trap & transport" value={hr.willing_to_trap_transport} />
          <InfoRow label="Able to trap & transport" value={hr.able_to_trap_transport} />
          <InfoRow label="Recovery space" value={hr.has_recovery_space} />
          {colonyNotes && <InfoRow label="Additional notes" value={colonyNotes} />}
        </dl>
      </CaseCollapsibleSection>

      <CaseFeederSection
        helpRequest={hr}
        saving={savingFeeder}
        onChange={onChange}
      />
    </div>
  );
}
