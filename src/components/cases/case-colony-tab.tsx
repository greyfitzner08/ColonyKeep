"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederSection } from "@/components/cases/case-feeder-section";
import { InfoRow } from "@/components/cases/case-detail-fields";
import {
  displayColonyNotes,
  formatSingleLineAddress,
} from "@/lib/cases/colony-notes";
import type { HelpRequest } from "@/lib/types";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

interface CaseColonyTabProps {
  helpRequest: HelpRequest;
  savingFeeder?: boolean;
  onChange: (next: HelpRequest) => void;
  onSaveFeeder: () => void;
}

export function CaseColonyTab({
  helpRequest: hr,
  savingFeeder = false,
  onChange,
  onSaveFeeder,
}: CaseColonyTabProps) {
  const colonyAddress = formatSingleLineAddress([
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
  ]);
  const colonyNotes = displayColonyNotes(hr.intake_notes, hr);
  const totalCats = hr.cats_over_8_weeks + hr.kittens_under_8_weeks;

  return (
    <div className="space-y-4">
      <CaseCollapsibleSection title="Colony location" defaultOpen>
        <dl>
          <InfoRow label="Address" value={colonyAddress} alwaysShow />
        </dl>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Cat counts" defaultOpen>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Adults (8+ wks)" value={hr.cats_over_8_weeks} />
          <StatPill label="Kittens under 8 wks" value={hr.kittens_under_8_weeks} />
          <StatPill label="Suspected pregnant" value={hr.pregnant_count} />
          <StatPill label="Total" value={totalCats} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Edit counts on the Tracked Cats tab.
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
        onSave={onSaveFeeder}
      />
    </div>
  );
}
