import type { VolunteerApplication, VolunteerRole } from "@/lib/types";
import { TNVR_ROLES } from "@/lib/constants";

export type RequirementField =
  | "tnvr_certificate_uploaded"
  | "intake_training"
  | "shadow_completed"
  | "liability_waiver_signed"
  | "policy_signed"
  | "event_crash_course";

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
  { role: "photographer", label: "Photographer", requires: BASE_REQUIREMENTS },
  { role: "videographer", label: "Videographer", requires: BASE_REQUIREMENTS },
  { role: "community_outreach", label: "Community Outreach", requires: BASE_REQUIREMENTS },
  { role: "youth_volunteer", label: "Youth Volunteer", requires: BASE_REQUIREMENTS },
  { role: "other", label: "Other", requires: BASE_REQUIREMENTS },
];

export function getRoleRequirement(role: VolunteerRole): RoleRequirement | undefined {
  return VOLUNTEER_ROLE_REQUIREMENTS.find((entry) => entry.role === role);
}

export function missingRequirementsForRole(
  role: VolunteerRole,
  source: Pick<VolunteerApplication, RequirementField>
): RequirementField[] {
  const requirement = getRoleRequirement(role);
  if (!requirement) return [];
  return requirement.requires.filter((field) => !source[field]);
}

export function rolesNeedingTnvrCert(roles: VolunteerRole[]): boolean {
  return roles.some((role) => TNVR_ROLES.includes(role));
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
