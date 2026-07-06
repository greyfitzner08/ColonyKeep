import type { VolunteerApplicationStatus, VolunteerRole } from "@/lib/types";
import {
  createVolunteerImportRoleMatcher,
  parseVolunteerImportRoles,
  volunteerImportRoleError,
  type VolunteerImportRoleMatcher,
  type VolunteerImportRoleResolution,
} from "@/lib/volunteers/import-role-matcher";

export const VOLUNTEER_IMPORT_HEADERS = [
  "Full Name",
  "Email",
  "Phone",
  "Birthday",
  "Roles Requested",
  "Why Volunteer",
  "Prior Experience",
  "How Heard",
  "Liability Waiver Signed",
  "Policy Acknowledgement",
  "TNVR Certificate Uploaded",
  "Application Status",
  "Admin Notes",
] as const;

export type VolunteerImportFieldKey =
  | "full_name"
  | "email"
  | "phone"
  | "birthday"
  | "roles_requested"
  | "why_volunteer"
  | "prior_experience"
  | "how_heard"
  | "liability_waiver_signed"
  | "policy_signed"
  | "tnvr_certificate_uploaded"
  | "application_status"
  | "admin_notes";

export type VolunteerImportColumnResolution =
  | { action: "map"; field: VolunteerImportFieldKey }
  | { action: "append_admin_notes" }
  | { action: "ignore" };

export const IMPORT_FIELD_OPTIONS: Array<{ key: VolunteerImportFieldKey; label: string }> = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "birthday", label: "Birthday" },
  { key: "roles_requested", label: "Roles Requested" },
  { key: "why_volunteer", label: "Why Volunteer" },
  { key: "prior_experience", label: "Prior Experience" },
  { key: "how_heard", label: "How Heard" },
  { key: "liability_waiver_signed", label: "Liability Waiver Signed" },
  { key: "policy_signed", label: "Policy Acknowledgement" },
  { key: "tnvr_certificate_uploaded", label: "TNVR Certificate Uploaded" },
  { key: "application_status", label: "Application Status" },
  { key: "admin_notes", label: "Admin Notes" },
];

const HEADER_ALIASES: Record<string, string> = {
  name: "full_name",
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  email_address: "email",
  phone: "phone",
  phone_number: "phone",
  mobile: "phone",
  mobile_phone: "phone",
  cell: "phone",
  cell_phone: "phone",
  telephone: "phone",
  contact_phone: "phone",
  birthday: "birthday",
  date_of_birth: "birthday",
  dob: "birthday",
  roles_requested: "roles_requested",
  roles: "roles_requested",
  role: "roles_requested",
  volunteer_roles: "roles_requested",
  volunteer_role: "roles_requested",
  volunteer_interest: "roles_requested",
  volunteer_interests: "roles_requested",
  interests: "roles_requested",
  interest: "roles_requested",
  why_volunteer: "why_volunteer",
  prior_experience: "prior_experience",
  experience: "prior_experience",
  how_heard: "how_heard",
  liability_waiver_signed: "liability_waiver_signed",
  policy_signed: "policy_signed",
  policy_acknowledgement: "policy_signed",
  tnvr_certificate_uploaded: "tnvr_certificate_uploaded",
  application_status: "application_status",
  status: "application_status",
  admin_notes: "admin_notes",
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const IMPORT_FIELD_KEYS = new Set<VolunteerImportFieldKey>(
  IMPORT_FIELD_OPTIONS.map((option) => option.key)
);

function resolveImportFieldKey(header: string): VolunteerImportFieldKey | undefined {
  const normalizedHeader = normalizeHeader(header);
  const alias = HEADER_ALIASES[normalizedHeader];
  if (alias && IMPORT_FIELD_KEYS.has(alias as VolunteerImportFieldKey)) {
    return alias as VolunteerImportFieldKey;
  }
  if (IMPORT_FIELD_KEYS.has(normalizedHeader as VolunteerImportFieldKey)) {
    return normalizedHeader as VolunteerImportFieldKey;
  }
  return undefined;
}

export function normalizeVolunteerImportRow(
  raw: Record<string, unknown>,
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {}
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [header, value] of Object.entries(raw)) {
    const text = String(value ?? "").trim();
    if (!text) continue;

    const resolution = columnResolutions[header];
    if (resolution) {
      if (resolution.action === "ignore") continue;
      if (resolution.action === "append_admin_notes") {
        const note = `${header}: ${text}`;
        normalized.admin_notes = normalized.admin_notes
          ? `${normalized.admin_notes}\n${note}`
          : note;
        continue;
      }
      if (resolution.action === "map") {
        const field = resolution.field;
        normalized[field] = normalized[field] ? `${normalized[field]}\n${text}` : text;
        continue;
      }
    }

    const key = resolveImportFieldKey(header);
    if (!key) continue;
    normalized[key] = normalized[key] ? `${normalized[key]}\n${text}` : text;
  }

  if (!normalized.full_name && (normalized.first_name || normalized.last_name)) {
    normalized.full_name = [normalized.first_name, normalized.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return normalized;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(normalized)) return true;
  if (["no", "n", "false", "0"].includes(normalized)) return false;
  return fallback;
}

function parseStatus(value: string | undefined): VolunteerApplicationStatus {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "needs_followup" || normalized === "needs follow-up") {
    return "needs_followup";
  }
  if (normalized === "rejected") return "rejected";
  if (normalized === "approved") return "approved";
  return "pending";
}

export function mapVolunteerImportRow(
  raw: Record<string, unknown>,
  roleMatcher: VolunteerImportRoleMatcher = createVolunteerImportRoleMatcher([]),
  roleResolutions: Record<string, VolunteerImportRoleResolution> = {},
  columnResolutions: Record<string, VolunteerImportColumnResolution> = {}
): {
  error?: string;
  record?: Record<string, unknown>;
} {
  const row = normalizeVolunteerImportRow(raw, columnResolutions);
  const email = row.email?.toLowerCase();
  const fullName = row.full_name?.trim();
  const phone = row.phone?.trim();
  const birthday = row.birthday?.trim();
  const { roles, unrecognized } = parseVolunteerImportRoles(
    row.roles_requested,
    roleMatcher,
    roleResolutions
  );

  if (!email) {
    return { error: "Email is required." };
  }
  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (roles.length === 0) {
    return {
      error: volunteerImportRoleError(row.roles_requested, roleMatcher, unrecognized),
    };
  }

  const whyVolunteer =
    row.why_volunteer?.trim() || row.prior_experience?.trim() || "Imported volunteer application";

  return {
    record: {
      status: parseStatus(row.application_status),
      full_name: fullName,
      email,
      phone: phone || "",
      birthday: birthday || null,
      roles_requested: roles,
      why_volunteer: whyVolunteer,
      prior_experience: row.prior_experience ?? null,
      how_heard: row.how_heard ?? null,
      liability_waiver_signed: parseBoolean(row.liability_waiver_signed),
      policy_signed: parseBoolean(row.policy_signed),
      tnvr_certificate_uploaded: parseBoolean(row.tnvr_certificate_uploaded),
      admin_notes: row.admin_notes ?? null,
    },
  };
}

export { createVolunteerImportRoleMatcher } from "@/lib/volunteers/import-role-matcher";

export function buildVolunteerImportTemplateCsv() {
  return `${VOLUNTEER_IMPORT_HEADERS.join(",")}\n`;
}
