import {
  organizationTypeLabel,
  partnershipStatusLabel,
} from "@/lib/community-partners/constants";
import { primaryPartnerContact, sortPartnerContacts } from "@/lib/community-partners/contacts";
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
  "Contact Notes",
  "Primary Contact",
  "Organization Notes",
  "Active",
] as const;

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function partnerOrgCells(partner: CommunityPartner): string[] {
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
  ];
}

function exportRowsForPartner(partner: CommunityPartner): string[][] {
  const contacts = sortPartnerContacts(partner.contacts ?? []);
  const orgCells = partnerOrgCells(partner);
  const tail = [partner.notes ?? "", partner.is_active ? "Yes" : "No"];

  if (contacts.length === 0) {
    return [[...orgCells, "", "", "", "", "", "No", ...tail]];
  }

  return contacts.map((contact) => [
    ...orgCells,
    contact.name ?? "",
    contact.title ?? "",
    contact.email ?? "",
    contact.phone ?? "",
    contact.notes ?? "",
    contact.is_primary ? "Yes" : "No",
    ...tail,
  ]);
}

export function partnersToCsv(partners: CommunityPartner[]): string {
  const lines = [
    COMMUNITY_PARTNER_EXPORT_HEADERS.map(escapeCsv).join(","),
    ...partners.flatMap((partner) =>
      exportRowsForPartner(partner).map((row) => row.map(escapeCsv).join(","))
    ),
  ];
  return lines.join("\n");
}

export function exportPartnersCsv(partners: CommunityPartner[]) {
  downloadCsv("community-partners.csv", partnersToCsv(partners));
}

export { primaryPartnerContact };
