import { InfoCard, InfoRow } from "@/components/cases/case-detail-fields";
import {
  displayColonyNotes,
  displayContactName,
  formatSingleLineAddress,
} from "@/lib/cases/colony-notes";
import { NEWSLETTER_SIGNUP_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export function CaseReporterSection({ helpRequest: hr }: { helpRequest: HelpRequest }) {
  const reporterAddress = formatSingleLineAddress([
    hr.contact_street,
    hr.contact_city,
    hr.contact_state,
    hr.contact_zip,
    hr.contact_county,
  ]);

  return (
    <InfoCard title="Reporter">
      <InfoRow label="Name" value={displayContactName(hr)} alwaysShow />
      <InfoRow label="Phone" value={hr.contact_phone} alwaysShow />
      <InfoRow label="Email" value={hr.contact_email} alwaysShow />
      <InfoRow label="Address" value={reporterAddress} alwaysShow />
      <InfoRow label="Relationship to cats" value={hr.relationship_to_cats} />
      <InfoRow label="How they heard about us" value={hr.how_heard} />
      <InfoRow label="Apartment / community" value={hr.apartment_name} />
      <InfoRow label={NEWSLETTER_SIGNUP_LABEL} value={hr.consent_communications} />
      <InfoRow label="Submitted" value={formatDateTime(hr.created_at)} alwaysShow />
    </InfoCard>
  );
}

export function CaseColonySection({ helpRequest: hr }: { helpRequest: HelpRequest }) {
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
    <InfoCard title="Colony">
      <InfoRow label="Location" value={colonyAddress} alwaysShow />
      <div className="py-4 border-b border-border/50">
        <p className="text-sm text-muted-foreground mb-3">Cat counts</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Adults (8+ wks)" value={hr.cats_over_8_weeks} />
          <StatPill label="Kittens under 8 wks" value={hr.kittens_under_8_weeks} />
          <StatPill label="Suspected pregnant" value={hr.pregnant_count} />
          <StatPill label="Total" value={totalCats} />
        </div>
      </div>
      <InfoRow label="Feeding cats?" value={hr.feeding_cats} />
      <InfoRow label="Feeder (if not reporter)" value={hr.feeder_if_not} />
      <InfoRow label="Trapping experience" value={hr.trapping_experience} />
      <InfoRow label="Needs traps?" value={hr.need_traps} />
      <InfoRow label="Willing to trap & transport" value={hr.willing_to_trap_transport} />
      <InfoRow label="Able to trap & transport" value={hr.able_to_trap_transport} />
      <InfoRow label="Recovery space" value={hr.has_recovery_space} />
      {colonyNotes && <InfoRow label="Additional notes" value={colonyNotes} />}
    </InfoCard>
  );
}
