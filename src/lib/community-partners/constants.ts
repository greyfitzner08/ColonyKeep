import type {
  CommunityPartnerOrganizationType,
  CommunityPartnerStatus,
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
  return ORGANIZATION_TYPE_BY_LABEL.get(normalized) ?? "other";
}

export function parsePartnershipStatus(raw: string | undefined): CommunityPartnerStatus {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (!normalized) return "active";
  return STATUS_BY_LABEL.get(normalized) ?? "active";
}
