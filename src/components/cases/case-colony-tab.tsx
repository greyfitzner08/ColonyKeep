"use client";

import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFeederSection } from "@/components/cases/case-feeder-section";
import { InfoRow } from "@/components/cases/case-detail-fields";
import {
  displayColonyNotes,
  formatSingleLineAddress,
} from "@/lib/cases/colony-notes";
import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import type { ClinicFix, HelpRequest } from "@/lib/types";

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
  clinicFixes: ClinicFix[];
  savingFeeder?: boolean;
  onChange: (next: HelpRequest) => void;
  onSaveFeeder: () => void;
}

export function CaseColonyTab({
  helpRequest: hr,
  clinicFixes,
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
  const counts = summarizeCatCounts(hr, clinicFixes);

  return (
    <div className="space-y-4">
      <CaseCollapsibleSection title="Colony location" defaultOpen>
        <dl>
          <InfoRow label="Address" value={colonyAddress} alwaysShow />
        </dl>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Cat counts" defaultOpen>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatPill label="Reported adults" value={counts.reportedAdults} />
          <StatPill label="Reported kittens" value={counts.reportedKittens} />
          <StatPill label="Fixed" value={counts.fixedTotal} />
          <StatPill label="Remaining adults" value={counts.remainingAdults} />
          <StatPill label="Remaining kittens" value={counts.remainingKittens} />
          <StatPill label="Suspected pregnant" value={hr.pregnant_count} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Log clinic fixes on the Tracked Cats tab. Edit originally reported counts there if intake
          numbers need correction.
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
