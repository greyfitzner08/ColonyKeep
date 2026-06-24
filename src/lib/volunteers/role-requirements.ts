import type { VolunteerApplication, VolunteerRole, RoleDescription } from "@/lib/types";
import { TNVR_ROLES } from "@/lib/constants";

export type RequirementField =
  | "tnvr_certificate_uploaded"
  | "intake_training"
  | "shadow_completed"
  | "liability_waiver_signed"
  | "policy_signed"
  | "event_crash_course";

export const REQUIREMENT_FIELD_OPTIONS: { key: RequirementField; label: string }[] = [
  { key: "liability_waiver_signed", label: "Liability waiver" },
  { key: "policy_signed", label: "Policy signed" },
  { key: "intake_training", label: "Intake training" },
  { key: "shadow_completed", label: "Shadow completed" },
  { key: "tnvr_certificate_uploaded", label: "TNVR certificate" },
  { key: "event_crash_course", label: "Event crash course" },
];

export interface RoleRequirement {
  role: VolunteerRole;
  label: string;
  requires: RequirementField[];
}

const BASE_REQUIREMENTS: RequirementField[] = ["liability_waiver_signed", "policy_signed"];

export const VOLUNTEER_ROLE_REQUIREMENTS: RoleRequirement[] = [
  { role: "intake_representative", label: "Intake Representative", requires: [...BASE_REQUIREMENTS, "intake_training"] },
  { role: "trapper", label: "Trapper", requires: [...BASE_REQUIREMENTS, "tnvr_certificate_uploaded", "shadow_completed"] },
  { role: "trap_loaner", label: "Trap Loaner", requires: [...BASE_REQUIREMENTS, "tnvr_certificate_uploaded", "shadow_completed"] },
  { role: "transporter", label: "Transporter", requires: [...BASE_REQUIREMENTS, "tnvr_certificate_uploaded", "shadow_completed"] },
  { role: "recovery", label: "Recovery Space Provider", requires: [...BASE_REQUIREMENTS, "tnvr_certificate_uploaded", "shadow_completed"] },
  { role: "event_volunteer", label: "Event Volunteer", requires: [...BASE_REQUIREMENTS, "event_crash_course"] },
  { role: "grant_writing", label: "Grant Writing", requires: BASE_REQUIREMENTS },
  { role: "social_media", label: "Social Media", requires: BASE_REQUIREMENTS },
  { role: "snack_patrol", label: "Snack Patrol", requires: BASE_REQUIREMENTS },
  { role: "crafter", label: "Crafter", requires: BASE_REQUIREMENTS },
  { role: "story_writer", label: "Story Writer", requires: BASE_REQUIREMENTS },
  { role: "photographer", label: "Photographer", requires: [] },
  { role: "videographer", label: "Videographer", requires: [] },
  { role: "community_outreach", label: "Community Outreach", requires: BASE_REQUIREMENTS },
  { role: "youth_volunteer", label: "Youth Volunteer", requires: BASE_REQUIREMENTS },
  { role: "other", label: "Other", requires: BASE_REQUIREMENTS },
];

const REQUIREMENT_FIELD_SET = new Set<string>(REQUIREMENT_FIELD_OPTIONS.map((entry) => entry.key));

function parseRequirementFields(values: string[] | null | undefined): RequirementField[] {
  if (!values) return [];
  return values.filter((value): value is RequirementField => REQUIREMENT_FIELD_SET.has(value));
}

/** Resolve configured requirements for a role, falling back to built-in defaults. */
export function requirementsForRole(
  role: VolunteerRole,
  catalog: RoleDescription[] = []
): RequirementField[] {
  const entry = catalog.find((item) => item.role_id === role);
  if (entry && Array.isArray(entry.requirements)) {
    return parseRequirementFields(entry.requirements);
  }
  return VOLUNTEER_ROLE_REQUIREMENTS.find((item) => item.role === role)?.requires ?? [];
}

export function getRoleRequirement(
  role: VolunteerRole,
  catalog?: RoleDescription[]
): RoleRequirement | undefined {
  const requires = requirementsForRole(role, catalog);
  const fallback = VOLUNTEER_ROLE_REQUIREMENTS.find((entry) => entry.role === role);
  return {
    role,
    label: fallback?.label ?? role.replace(/_/g, " "),
    requires,
  };
}

export function missingRequirementsForRole(
  role: VolunteerRole,
  source: Pick<VolunteerApplication, RequirementField>,
  catalog?: RoleDescription[]
): RequirementField[] {
  return requirementsForRole(role, catalog).filter((field) => !source[field]);
}

export function rolesNeedingTnvrCert(roles: VolunteerRole[]): boolean {
  return roles.some((role) => TNVR_ROLES.includes(role));
}

export function includesTrapVolunteerRole(roles: VolunteerRole[]): boolean {
  return rolesNeedingTnvrCert(roles);
}

export function requirementLabel(field: RequirementField): string {
  const labels: Record<RequirementField, string> = {
    tnvr_certificate_uploaded: "TNVR certificate",
    intake_training: "Intake training",
    shadow_completed: "Shadow completed",
    liability_waiver_signed: "Liability waiver",
    policy_signed: "Policy signed",
    event_crash_course: "Event crash course",
  };
  return labels[field];
}
