import type {
  CommunityPartner,
  CommunityPartnerOrganizationType,
  CommunityPartnerStatus,
  GcaaMemberStatus,
} from "@/lib/types";

export const COMMUNITY_PARTNER_ORGANIZATION_TYPES: {
  value: CommunityPartnerOrganizationType;
  label: string;
}[] = [
  { value: "local_business", label: "Local Business" },
  { value: "rescue", label: "Rescue / Sanctuary" },
  { value: "grantor", label: "Grantor / Funder" },
  { value: "sponsor", label: "Sponsor" },
  { value: "municipal", label: "Municipal / Government" },
  { value: "media", label: "Media" },
  { value: "gcaa", label: "GCAA" },
  { value: "other", label: "Other" },
];

export const COMMUNITY_PARTNER_STATUSES: {
  value: CommunityPartnerStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "prospect", label: "Prospect" },
  { value: "past", label: "Past" },
  { value: "do_not_contact", label: "Do not contact" },
];

export const GCAA_MEMBER_STATUSES: {
  value: GcaaMemberStatus;
  label: string;
}[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "no", label: "No" },
];

const ORGANIZATION_TYPE_BY_LABEL = new Map(
  COMMUNITY_PARTNER_ORGANIZATION_TYPES.flatMap((entry) => [
    [entry.label.toLowerCase(), entry.value],
    [entry.value, entry.value],
    [entry.value.replace(/_/g, " "), entry.value],
  ])
);

const STATUS_BY_LABEL = new Map(
  COMMUNITY_PARTNER_STATUSES.flatMap((entry) => [
    [entry.label.toLowerCase(), entry.value],
    [entry.value, entry.value],
    [entry.value.replace(/_/g, " "), entry.value],
  ])
);

const GCAA_MEMBER_STATUS_BY_LABEL = new Map(
  GCAA_MEMBER_STATUSES.flatMap((entry) => [
    [entry.label.toLowerCase(), entry.value],
    [entry.value, entry.value],
  ])
);

export function organizationTypeLabel(type: CommunityPartnerOrganizationType): string {
  return (
    COMMUNITY_PARTNER_ORGANIZATION_TYPES.find((entry) => entry.value === type)?.label ?? type
  );
}

export function partnershipStatusLabel(status: CommunityPartnerStatus): string {
  return COMMUNITY_PARTNER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function parseOrganizationType(raw: string | undefined): CommunityPartnerOrganizationType {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (!normalized) return "other";
  if (
    normalized === "gcaa" ||
    normalized.includes("greater charlotte apartment") ||
    normalized === "apartment community" ||
    normalized === "apartment communities"
  ) {
    return "gcaa";
  }
  return ORGANIZATION_TYPE_BY_LABEL.get(normalized) ?? "other";
}

export function isGcaaPartner(type: CommunityPartnerOrganizationType): boolean {
  return type === "gcaa";
}

export function partnerWebsiteHref(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parsePartnershipStatus(raw: string | undefined): CommunityPartnerStatus {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (!normalized) return "active";
  return STATUS_BY_LABEL.get(normalized) ?? "active";
}

export function gcaaMemberStatusLabel(status: GcaaMemberStatus): string {
  return GCAA_MEMBER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function parseGcaaMemberStatus(
  raw: string | undefined,
  fallback: GcaaMemberStatus = "active"
): GcaaMemberStatus {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (!normalized) return fallback;
  if (["yes", "y", "true", "1"].includes(normalized)) return "active";
  if (["n", "false", "0", "inactive"].includes(normalized)) return "no";
  return GCAA_MEMBER_STATUS_BY_LABEL.get(normalized) ?? fallback;
}

export function gcaaMemberIsActive(status: GcaaMemberStatus): boolean {
  return status === "active" || status === "pending";
}

export function resolvedGcaaMemberStatus(
  partner: Pick<CommunityPartner, "gcaa_member_status" | "is_active">
): GcaaMemberStatus {
  if (partner.gcaa_member_status) return partner.gcaa_member_status;
  return partner.is_active ? "active" : "no";
}

export function gcaaMemberBadgeVariant(
  status: GcaaMemberStatus
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "pending") return "outline";
  return "secondary";
}

export function gcaaPartnershipStatus(status: GcaaMemberStatus): CommunityPartnerStatus {
  if (status === "active") return "active";
  if (status === "pending") return "prospect";
  return "past";
}
