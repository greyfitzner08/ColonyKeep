import {
  organizationTypeLabel,
  partnershipStatusLabel,
} from "@/lib/community-partners/constants";
import { downloadCsv } from "@/lib/reports/export-csv";
import type { CommunityPartner } from "@/lib/types";

export const COMMUNITY_PARTNER_EXPORT_HEADERS = [
  "Organization Name",
  "Organization Type",
  "Partnership Status",
  "Website",
  "Address",
  "City",
  "State",
  "ZIP",
  "Phone",
  "Email",
  "Contact Name",
  "Contact Title",
  "Contact Email",
  "Contact Phone",
  "Notes",
  "Active",
] as const;

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function partnerRow(partner: CommunityPartner): string[] {
  return [
    partner.name,
    organizationTypeLabel(partner.organization_type),
    partnershipStatusLabel(partner.partnership_status),
    partner.website ?? "",
    partner.address ?? "",
    partner.city ?? "",
    partner.state ?? "",
    partner.zip ?? "",
    partner.phone ?? "",
    partner.email ?? "",
    partner.contact_name ?? "",
    partner.contact_title ?? "",
    partner.contact_email ?? "",
    partner.contact_phone ?? "",
    partner.notes ?? "",
    partner.is_active ? "Yes" : "No",
  ];
}

export function partnersToCsv(partners: CommunityPartner[]): string {
  const lines = [
    COMMUNITY_PARTNER_EXPORT_HEADERS.map(escapeCsv).join(","),
    ...partners.map((partner) => partnerRow(partner).map(escapeCsv).join(",")),
  ];
  return lines.join("\n");
}

export function collectPartnerEmails(partners: CommunityPartner[]): string[] {
  const emails = new Set<string>();
  for (const partner of partners) {
    for (const value of [partner.contact_email, partner.email]) {
      const email = value?.trim().toLowerCase();
      if (email) emails.add(email);
    }
  }
  return Array.from(emails).sort((a, b) => a.localeCompare(b));
}

export function partnersToEmailCsv(partners: CommunityPartner[]): string {
  const rows: string[] = ['"Organization Name","Email","Source"'];
  for (const partner of partners) {
    const name = partner.name;
    if (partner.contact_email?.trim()) {
      rows.push(
        [name, partner.contact_email.trim(), "Contact"].map(escapeCsv).join(",")
      );
    }
    if (partner.email?.trim()) {
      const orgEmail = partner.email.trim();
      if (orgEmail.toLowerCase() !== partner.contact_email?.trim().toLowerCase()) {
        rows.push([name, orgEmail, "Organization"].map(escapeCsv).join(","));
      }
    }
  }
  return rows.join("\n");
}

export function exportPartnersCsv(partners: CommunityPartner[]) {
  downloadCsv("community-partners.csv", partnersToCsv(partners));
}

export function exportPartnerEmailsCsv(partners: CommunityPartner[]) {
  downloadCsv("community-partner-emails.csv", partnersToEmailCsv(partners));
}

export function exportPartnerEmailsPlain(partners: CommunityPartner[]) {
  const content = collectPartnerEmails(partners).join("\n");
  downloadCsv("community-partner-emails.txt", content);
}
