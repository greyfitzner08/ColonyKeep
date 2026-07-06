import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { RoleDescription, VolunteerRole } from "@/lib/types";

const LEGACY_ROLE_ALIASES: Record<string, VolunteerRole> = {
  clinic_coordination: "colony_support",
  clinic_coord: "colony_support",
  clinic_coordinator: "colony_support",
  colony_support_volunteer: "colony_support",
  intake_rep: "intake_representative",
  intake: "intake_representative",
  trap_loan: "trap_loaner",
  transport: "transporter",
  recovery_space: "recovery",
  recovery_space_provider: "recovery",
  event: "event_volunteer",
  grants: "grant_writing",
  grant_writer: "grant_writing",
  social: "social_media",
  snacks: "snack_patrol",
  stories: "story_writer",
  photo: "photographer",
  video: "videographer",
  outreach: "community_outreach",
};

export function normalizeVolunteerImportRoleToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type VolunteerImportRoleMatcher = {
  resolve: (token: string) => VolunteerRole | null;
  knownLabels: string[];
};

export function createVolunteerImportRoleMatcher(
  catalog: RoleDescription[]
): VolunteerImportRoleMatcher {
  const lookup = new Map<string, VolunteerRole>();

  function register(key: string, roleId: VolunteerRole) {
    const normalized = normalizeVolunteerImportRoleToken(key);
    if (!normalized) return;
    lookup.set(normalized, roleId);
  }

  for (const entry of catalog) {
    register(entry.role_id, entry.role_id);
    register(entry.label, entry.role_id);
  }

  for (const role of VOLUNTEER_ROLES) {
    register(role.value, role.value);
    register(role.label, role.value);
  }

  for (const [alias, roleId] of Object.entries(LEGACY_ROLE_ALIASES)) {
    register(alias, roleId);
  }

  return {
    resolve(token: string) {
      return lookup.get(normalizeVolunteerImportRoleToken(token)) ?? null;
    },
    knownLabels: catalog.map((entry) => entry.label),
  };
}

export function tokenizeVolunteerImportRoles(value: string): string[] {
  return value
    .split(/[,;|\n/\t&]+|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseVolunteerImportRoles(
  value: string | undefined,
  matcher: VolunteerImportRoleMatcher
): { roles: VolunteerRole[]; unrecognized: string[] } {
  if (!value?.trim()) {
    return { roles: [], unrecognized: [] };
  }

  const roles: VolunteerRole[] = [];
  const unrecognized: string[] = [];

  for (const token of tokenizeVolunteerImportRoles(value)) {
    const role = matcher.resolve(token);
    if (role) {
      roles.push(role);
      continue;
    }
    unrecognized.push(token);
  }

  return {
    roles: Array.from(new Set(roles)),
    unrecognized,
  };
}

export function volunteerImportRoleError(
  rawRoles: string | undefined,
  matcher: VolunteerImportRoleMatcher,
  unrecognized: string[]
): string {
  if (!rawRoles?.trim()) {
    return 'Roles Requested is required. Use role labels from Admin → Volunteer Roles, separated by commas.';
  }

  if (unrecognized.length > 0) {
    const examples = matcher.knownLabels.slice(0, 6).join(", ");
    return `Unrecognized role(s): ${unrecognized.join(", ")}. Use labels like ${examples}.`;
  }

  return "At least one recognized role is required in Roles Requested.";
}
