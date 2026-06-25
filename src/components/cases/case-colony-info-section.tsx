"use client";

import { InfoCard, InfoRow } from "@/components/cases/case-detail-fields";
import {
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
    </div>
  );
}

