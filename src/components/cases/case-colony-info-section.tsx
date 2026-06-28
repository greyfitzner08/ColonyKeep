"use client";

import { InfoCard, InfoRow } from "@/components/cases/case-detail-fields";
import {
  displayColonyNotes,
  displayContactName,
  formatSingleLineAddress,
} from "@/lib/cases/colony-notes";
import { NEWSLETTER_SIGNUP_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest } from "@/lib/types";

export function CaseReporterSection({ helpRequest: hr }: { helpRequest: HelpRequest }) {
  const reporterAddress = formatSingleLineAddress([
    hr.contact_street,
    hr.contact_city,
    hr.contact_state,
    hr.contact_zip,
    hr.contact_county,
  ]);
  const colonyNotes = displayColonyNotes(hr.intake_notes, hr);

  return (
    <div className="space-y-4">
      <InfoCard title="Contact" defaultOpen>
        <InfoRow label="Name" value={displayContactName(hr)} alwaysShow />
        <InfoRow label="Phone" value={hr.contact_phone} alwaysShow />
        <InfoRow label="Email" value={hr.contact_email} alwaysShow />
        <InfoRow label="Address" value={reporterAddress} alwaysShow />
      </InfoCard>

      <InfoCard title="Background" defaultOpen={false}>
        <InfoRow label="Relationship to cats" value={hr.relationship_to_cats} />
        <InfoRow label="How they heard about us" value={hr.how_heard} />
        <InfoRow label="Apartment / community" value={hr.apartment_name} />
        <InfoRow label={NEWSLETTER_SIGNUP_LABEL} value={hr.consent_communications} />
        <InfoRow label="Submitted" value={formatDateTime(hr.created_at)} alwaysShow />
      </InfoCard>

      <InfoCard title="Care & trapping" defaultOpen={false}>
        <InfoRow label="Feeding cats?" value={hr.feeding_cats} />
        <InfoRow label="Feeder note from intake" value={hr.feeder_if_not} />
        <InfoRow label="Trapping experience" value={hr.trapping_experience} />
        <InfoRow label="Needs traps?" value={hr.need_traps} />
        <InfoRow label="Willing to trap & transport" value={hr.willing_to_trap_transport} />
        <InfoRow label="Able to trap & transport" value={hr.able_to_trap_transport} />
        <InfoRow label="Recovery space" value={hr.has_recovery_space} />
        {colonyNotes && <InfoRow label="Additional notes" value={colonyNotes} />}
      </InfoCard>
    </div>
  );
}

