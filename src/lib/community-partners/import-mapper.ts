import {
  parseOrganizationType,
  parsePartnershipStatus,
} from "@/lib/community-partners/constants";
import { COMMUNITY_PARTNER_EXPORT_HEADERS } from "@/lib/community-partners/export-csv";
import type { CommunityPartnerOrganizationType, CommunityPartnerStatus } from "@/lib/types";

export const COMMUNITY_PARTNER_IMPORT_HEADERS = COMMUNITY_PARTNER_EXPORT_HEADERS;

const HEADER_ALIASES: Record<string, string> = {
  organization_name: "name",
  name: "name",
  business_name: "name",
  organization: "name",
  organization_type: "organization_type",
  type: "organization_type",
  category: "organization_type",
  partnership_status: "partnership_status",
  status: "partnership_status",
  website: "website",
  url: "website",
  address: "address",
  street: "address",
  city: "city",
  state: "state",
  zip: "zip",
  zip_code: "zip",
  postal_code: "zip",
  phone: "phone",
  organization_phone: "phone",
  email: "email",
  organization_email: "email",
  contact_name: "contact_name",
  contact: "contact_name",
  contact_title: "contact_title",
  title: "contact_title",
  role: "contact_title",
  contact_email: "contact_email",
  contact_phone: "contact_phone",
  contact_notes: "contact_notes",
  notes: "notes",
  organization_notes: "notes",
  active: "is_active",
  is_active: "is_active",
  primary_contact: "is_primary_contact",
  is_primary: "is_primary_contact",
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeCommunityPartnerImportRow(
  raw: Record<string, unknown>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (!key) continue;
    const text = String(value ?? "").trim();
    if (!text) continue;
    normalized[key] = text;
  }

  return normalized;
}

function parseBoolean(value: string | undefined, fallback = true): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "true", "1", "active", "primary"].includes(normalized)) return true;
  if (["no", "n", "false", "0", "inactive"].includes(normalized)) return false;
  return fallback;
}

export type CommunityPartnerImportPayload = {
  partner: {
    name: string;
    organization_type: CommunityPartnerOrganizationType;
    partnership_status: CommunityPartnerStatus;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    is_active: boolean;
  };
  contact: {
    name: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    is_primary: boolean;
  } | null;
};

export function mapCommunityPartnerImportRow(raw: Record<string, unknown>): {
  record: CommunityPartnerImportPayload | null;
  error: string | null;
} {
  const row = normalizeCommunityPartnerImportRow(raw);
  const name = row.name?.trim();

  if (!name) {
    return { record: null, error: "Organization name is required" };
  }

  const contact =
    row.contact_name || row.contact_email || row.contact_phone || row.contact_title
      ? {
          name: row.contact_name ?? null,
          title: row.contact_title ?? null,
          email: row.contact_email ?? null,
          phone: row.contact_phone ?? null,
          notes: row.contact_notes ?? null,
          is_primary: parseBoolean(row.is_primary_contact, true),
        }
      : null;

  return {
    record: {
      partner: {
        name,
        organization_type: parseOrganizationType(row.organization_type),
        partnership_status: parsePartnershipStatus(row.partnership_status),
        website: row.website ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        state: row.state ?? null,
        zip: row.zip ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        notes: row.notes ?? null,
        is_active: parseBoolean(row.is_active),
      },
      contact,
    },
    error: null,
  };
}

export function buildCommunityPartnerImportTemplateCsv(): string {
  return `${COMMUNITY_PARTNER_IMPORT_HEADERS.join(",")}\n`;
}
