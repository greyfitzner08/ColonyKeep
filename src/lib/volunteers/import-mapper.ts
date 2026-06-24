import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { VolunteerApplicationStatus, VolunteerRole } from "@/lib/types";

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
  "Policy Signed",
  "TNVR Certificate Uploaded",
  "Application Status",
  "Admin Notes",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  full_name: "full_name",
  name: "full_name",
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  email_address: "email",
  phone: "phone",
  phone_number: "phone",
  birthday: "birthday",
  date_of_birth: "birthday",
  dob: "birthday",
  roles_requested: "roles_requested",
  roles: "roles_requested",
  volunteer_roles: "roles_requested",
  why_volunteer: "why_volunteer",
  prior_experience: "prior_experience",
  experience: "prior_experience",
  how_heard: "how_heard",
  liability_waiver_signed: "liability_waiver_signed",
  policy_signed: "policy_signed",
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

export function normalizeVolunteerImportRow(
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

function parseRoles(value: string | undefined): VolunteerRole[] {
  if (!value) return [];
  const tokens = value.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  const roles: VolunteerRole[] = [];

  for (const token of tokens) {
    const byValue = VOLUNTEER_ROLES.find(
      (role) => role.value === token || role.value === token.toLowerCase().replace(/\s+/g, "_")
    );
    if (byValue) {
      roles.push(byValue.value);
      continue;
    }
    const byLabel = VOLUNTEER_ROLES.find(
      (role) => role.label.toLowerCase() === token.toLowerCase()
    );
    if (byLabel) {
      roles.push(byLabel.value);
    }
  }

  return Array.from(new Set(roles));
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

export function mapVolunteerImportRow(raw: Record<string, unknown>): {
  error?: string;
  record?: Record<string, unknown>;
} {
  const row = normalizeVolunteerImportRow(raw);
  const email = row.email?.toLowerCase();
  const fullName = row.full_name?.trim();
  const phone = row.phone?.trim();
  const birthday = row.birthday?.trim();
  const roles = parseRoles(row.roles_requested);

  if (!email) {
    return { error: "Email is required." };
  }
  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (!phone) {
    return { error: "Phone is required." };
  }
  if (!birthday) {
    return { error: "Birthday is required (YYYY-MM-DD)." };
  }
  if (roles.length === 0) {
    return { error: "At least one recognized role is required in Roles Requested." };
  }

  const whyVolunteer =
    row.why_volunteer?.trim() || row.prior_experience?.trim() || "Imported volunteer application";

  return {
    record: {
      status: parseStatus(row.application_status),
      full_name: fullName,
      email,
      phone,
      birthday,
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

export function buildVolunteerImportTemplateCsv() {
  return `${VOLUNTEER_IMPORT_HEADERS.join(",")}\n`;
}
