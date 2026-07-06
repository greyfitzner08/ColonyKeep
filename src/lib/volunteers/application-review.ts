import type { Profile, RoleDescription, VolunteerApplication, VolunteerRole, VolunteerRoleRequest } from "@/lib/types";
import { pendingNewRoles, requirementSourceForRoleRequest } from "@/lib/volunteers/role-expansion";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import {
  missingRequirementsForApplicationApproval,
  missingRequirementsForRole,
  requirementLabel,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";

export type ApplicationStatusFilter =
  | "needs_attention"
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "needs_followup";

export type ApplicationViewMode = "cards" | "table";

const REVIEWABLE_STATUSES = new Set(["pending", "needs_followup"]);

export interface ApplicationReviewContext {
  linkedProfile: Profile | undefined;
  approvedRoles: VolunteerRole[];
  newRoles: VolunteerRole[];
  isRoleExpansion: boolean;
  rolesToReview: VolunteerRole[];
  pendingRoleRequests: VolunteerRoleRequest[];
  missingByRole: Partial<Record<VolunteerRole, RequirementField[]>>;
  allMissingRequirements: RequirementField[];
  rolesReady: boolean;
  canReview: boolean;
  needsAttention: boolean;
  attentionLabel: string | null;
  attentionDetail: string | null;
}

export function getPendingRoleAddRequests(
  email: string,
  roleRequests: VolunteerRoleRequest[]
): VolunteerRoleRequest[] {
  return roleRequests.filter(
    (request) =>
      request.email.toLowerCase() === email.toLowerCase() &&
      request.status === "pending" &&
      (request.request_type ?? "add") === "add"
  );
}

function pendingAddRolesFromRequests(
  approvedRoles: VolunteerRole[],
  pendingRoleRequests: VolunteerRoleRequest[]
): VolunteerRole[] {
  return Array.from(
    new Set(pendingRoleRequests.flatMap((request) => request.requested_roles as VolunteerRole[]))
  ).filter((role) => !approvedRoles.includes(role));
}

function requirementSourceForRole(
  application: VolunteerApplication,
  profile: Profile | undefined,
  role: VolunteerRole,
  pendingRoleRequests: VolunteerRoleRequest[]
): Pick<VolunteerApplication, RequirementField> {
  const request = pendingRoleRequests.find((entry) => entry.requested_roles.includes(role));
  if (request && profile) {
    return requirementSourceForRoleRequest(application, profile, request);
  }

  return volunteerRequirementSource(
    application,
    profile ?? { tnvr_certificate_uploaded: false, tnvr_certificate_url: null }
  );
}

export function getApplicationReviewContext(
  application: VolunteerApplication,
  profilesByEmail: Record<string, Profile>,
  roleRequests: VolunteerRoleRequest[] = [],
  roleCatalog: RoleDescription[] = []
): ApplicationReviewContext {
  const linkedProfile = profilesByEmail[application.email.toLowerCase()];
  const approvedRoles = (linkedProfile?.volunteer_roles ?? []) as VolunteerRole[];
  const pendingRoleRequests = getPendingRoleAddRequests(application.email, roleRequests);
  const pendingAddRoles = pendingAddRolesFromRequests(approvedRoles, pendingRoleRequests);
  const newRoles =
    pendingAddRoles.length > 0
      ? pendingAddRoles
      : pendingNewRoles(application, approvedRoles);
  const isRoleExpansion =
    pendingRoleRequests.length > 0 || (approvedRoles.length > 0 && newRoles.length > 0);
  const rolesToReview = isRoleExpansion ? newRoles : (application.roles_requested ?? []);

  const missingByRole: Partial<Record<VolunteerRole, RequirementField[]>> = {};
  const allMissingSet = new Set<RequirementField>();

  for (const role of rolesToReview) {
    const source = requirementSourceForRole(application, linkedProfile, role, pendingRoleRequests);
    const missing = isRoleExpansion
      ? missingRequirementsForRole(role, source, roleCatalog)
      : missingRequirementsForApplicationApproval(role, source, roleCatalog);
    if (missing.length > 0) {
      missingByRole[role] = missing;
      for (const field of missing) {
        allMissingSet.add(field);
      }
    }
  }

  const rolesReady =
    rolesToReview.length > 0 &&
    rolesToReview.every((role) => (missingByRole[role]?.length ?? 0) === 0);
  const canReview =
    REVIEWABLE_STATUSES.has(application.status) ||
    pendingRoleRequests.length > 0 ||
    (isRoleExpansion && newRoles.length > 0);

  let attentionLabel: string | null = null;
  let attentionDetail: string | null = null;
  let needsAttention = false;

  if (isRoleExpansion) {
    needsAttention = true;
    if (!rolesReady) {
      attentionLabel = "New role requirements";
      attentionDetail = `Additional roles need training: ${Array.from(allMissingSet)
        .map(requirementLabel)
        .join(", ")}`;
    } else if (canReview) {
      attentionLabel = "Roles ready to approve";
      attentionDetail = "New volunteer roles have met all training requirements.";
    } else {
      attentionLabel = "Role expansion";
      attentionDetail = "Volunteer requested additional roles.";
    }
  } else if (application.status === "pending") {
    needsAttention = true;
    attentionLabel = rolesReady ? "Ready to approve" : "Requirements pending";
    attentionDetail = rolesReady
      ? "New application is ready for approval."
      : `Still need: ${Array.from(allMissingSet).map(requirementLabel).join(", ")}`;
  } else if (application.status === "needs_followup") {
    needsAttention = true;
    attentionLabel = rolesReady ? "Follow-up — ready" : "Follow-up required";
    attentionDetail = application.admin_notes?.trim() || "Application needs admin follow-up.";
  }

  return {
    linkedProfile,
    approvedRoles,
    newRoles,
    isRoleExpansion,
    rolesToReview,
    pendingRoleRequests,
    missingByRole,
    allMissingRequirements: Array.from(allMissingSet),
    rolesReady,
    canReview,
    needsAttention,
    attentionLabel,
    attentionDetail,
  };
}

export function applicationMatchesFilter(
  application: VolunteerApplication,
  filter: ApplicationStatusFilter,
  profilesByEmail: Record<string, Profile>,
  roleRequests: VolunteerRoleRequest[] = [],
  roleCatalog: RoleDescription[] = []
): boolean {
  if (filter === "all") return true;
  if (filter === "needs_attention") {
    return getApplicationReviewContext(
      application,
      profilesByEmail,
      roleRequests,
      roleCatalog
    ).needsAttention;
  }
  return application.status === filter;
}

export function attentionPriority(
  application: VolunteerApplication,
  profilesByEmail: Record<string, Profile>,
  roleRequests: VolunteerRoleRequest[],
  roleCatalog: RoleDescription[] = []
): number {
  const context = getApplicationReviewContext(
    application,
    profilesByEmail,
    roleRequests,
    roleCatalog
  );

  if (context.isRoleExpansion && !context.rolesReady) return 0;
  if (application.status === "pending" && !context.isRoleExpansion) return 1;
  if (application.status === "needs_followup" && !context.rolesReady) return 2;
  if (context.isRoleExpansion && context.rolesReady) return 3;
  if (application.status === "needs_followup") return 4;
  if (application.status === "pending") return 5;
  return 6;
}

export function countApplicationsNeedingAttention(
  applications: VolunteerApplication[],
  profilesByEmail: Record<string, Profile>,
  roleRequests: VolunteerRoleRequest[] = [],
  roleCatalog: RoleDescription[] = []
): number {
  return applications.filter((application) =>
    applicationMatchesFilter(
      application,
      "needs_attention",
      profilesByEmail,
      roleRequests,
      roleCatalog
    )
  ).length;
}

export function requirementSourceForApplication(
  application: VolunteerApplication,
  context: ApplicationReviewContext
): Pick<VolunteerApplication, RequirementField> {
  const primaryRequest = context.pendingRoleRequests[0];
  if (primaryRequest && context.linkedProfile) {
    return requirementSourceForRoleRequest(application, context.linkedProfile, primaryRequest);
  }

  return volunteerRequirementSource(
    application,
    context.linkedProfile ?? { tnvr_certificate_uploaded: false, tnvr_certificate_url: null }
  );
}
