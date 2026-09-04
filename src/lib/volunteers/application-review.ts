import type { Profile, RoleDescription, VolunteerApplication, VolunteerRole, VolunteerRoleRequest } from "@/lib/types";
import { parsePrimaryEmail } from "@/lib/email-utils";
import { pendingNewRoles, requirementSourceForRoleRequest, rolesPendingApproval } from "@/lib/volunteers/role-expansion";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import {
  missingAdminVerifiableRequirementsForRole,
  missingRequirementsForApplicationApproval,
  requirementLabel,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";

export type ApplicationStatusFilter =
  | "needs_attention"
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "needs_followup"
  | "inactive";

export type ApplicationViewMode = "cards" | "table";

const REVIEWABLE_STATUSES = new Set([
  "pending",
  "needs_followup",
  "inactive",
  "rejected",
]);

export function canApproveImportedVolunteerWithPendingTraining(
  application: VolunteerApplication,
  rolesToReview: VolunteerRole[]
): boolean {
  return (
    Boolean(application.imported_via_csv) &&
    REVIEWABLE_STATUSES.has(application.status) &&
    rolesToReview.length > 0
  );
}

function missingRequirementsForReview(
  application: VolunteerApplication,
  linkedProfile: Profile | undefined,
  role: VolunteerRole,
  pendingRoleRequests: VolunteerRoleRequest[],
  roleCatalog: RoleDescription[],
  isRoleExpansion: boolean
): RequirementField[] {
  const source = requirementSourceForRole(
    application,
    linkedProfile,
    role,
    pendingRoleRequests
  );
  return isRoleExpansion
    ? missingAdminVerifiableRequirementsForRole(role, source, roleCatalog)
    : missingRequirementsForApplicationApproval(role, source, roleCatalog);
}

export interface ApplicationReviewContext {
  linkedProfile: Profile | undefined;
  approvedRoles: VolunteerRole[];
  newRoles: VolunteerRole[];
  isRoleExpansion: boolean;
  rolesToReview: VolunteerRole[];
  pendingRoleRequests: VolunteerRoleRequest[];
  missingByRole: Partial<Record<VolunteerRole, RequirementField[]>>;
  allMissingRequirements: RequirementField[];
  allRequirementsMet: boolean;
  canApproveWithPendingTraining: boolean;
  hasPendingTraining: boolean;
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

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findLinkedProfile(
  application: VolunteerApplication,
  profilesByEmail: Record<string, Profile>,
  profiles: Profile[] = []
): Profile | undefined {
  const primaryEmail = parsePrimaryEmail(application.email);
  if (primaryEmail) {
    const byPrimaryEmail = profilesByEmail[primaryEmail];
    if (byPrimaryEmail) return byPrimaryEmail;
  }

  const byRawEmail = profilesByEmail[application.email.toLowerCase()];
  if (byRawEmail) return byRawEmail;

  const normalizedName = normalizePersonName(application.full_name);
  if (!normalizedName || profiles.length === 0) return undefined;

  const matches = profiles.filter(
    (profile) => normalizePersonName(profile.full_name ?? "") === normalizedName
  );

  if (matches.length === 1) return matches[0];

  if (matches.length > 1 && primaryEmail) {
    const emailLocal = primaryEmail.split("@")[0];
    const byEmailHint = matches.find((profile) => {
      const profileEmail = parsePrimaryEmail(profile.email);
      return (
        profileEmail === primaryEmail ||
        profile.email.toLowerCase().startsWith(`${emailLocal}@`) ||
        profile.email.toLowerCase().includes(emailLocal)
      );
    });
    if (byEmailHint) return byEmailHint;
  }

  if (matches.length > 1 && application.phone?.trim()) {
    const normalizedPhone = application.phone.replace(/\D/g, "");
    const byPhone = matches.find(
      (profile) => profile.phone?.replace(/\D/g, "") === normalizedPhone
    );
    if (byPhone) return byPhone;
  }

  return undefined;
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
  roleCatalog: RoleDescription[] = [],
  profiles: Profile[] = []
): ApplicationReviewContext {
  const linkedProfile = findLinkedProfile(application, profilesByEmail, profiles);
  const approvedRoles = (linkedProfile?.volunteer_roles ?? []) as VolunteerRole[];
  const pendingRoleRequests = getPendingRoleAddRequests(application.email, roleRequests);
  const newRoles = rolesPendingApproval(application, approvedRoles, pendingRoleRequests);
  const isRoleExpansion =
    pendingRoleRequests.length > 0 || (approvedRoles.length > 0 && newRoles.length > 0);
  const rolesToReview = isRoleExpansion
    ? newRoles
    : (application.status === "approved" || application.status === "inactive") &&
        approvedRoles.length > 0
      ? approvedRoles
      : (application.roles_requested ?? []);

  const missingByRole: Partial<Record<VolunteerRole, RequirementField[]>> = {};
  const allMissingSet = new Set<RequirementField>();

  for (const role of rolesToReview) {
    const missingForDisplay = missingRequirementsForReview(
      application,
      linkedProfile,
      role,
      pendingRoleRequests,
      roleCatalog,
      isRoleExpansion
    );

    if (missingForDisplay.length > 0) {
      missingByRole[role] = missingForDisplay;
      for (const field of missingForDisplay) {
        allMissingSet.add(field);
      }
    }
  }

  const allRequirementsMet =
    rolesToReview.length > 0 &&
    rolesToReview.every((role) => (missingByRole[role] ?? []).length === 0);
  const canApproveWithPendingTraining = canApproveImportedVolunteerWithPendingTraining(
    application,
    rolesToReview
  );
  const rolesReady = allRequirementsMet || canApproveWithPendingTraining;
  const hasPendingTraining =
    application.status === "approved" && !allRequirementsMet && rolesToReview.length > 0;
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
    } else {
      attentionLabel = "Role expansion";
    }
  } else if (application.status === "pending") {
    needsAttention = true;
    if (canApproveWithPendingTraining && !allRequirementsMet) {
      attentionLabel = "Imported — ready to approve";
      attentionDetail = `Training still pending: ${Array.from(allMissingSet)
        .map(requirementLabel)
        .join(", ")}. You can approve now and verify training afterward.`;
    } else {
      attentionLabel = rolesReady ? "Ready to approve" : "Requirements pending";
      attentionDetail = rolesReady
        ? null
        : `Still need: ${Array.from(allMissingSet).map(requirementLabel).join(", ")}`;
    }
  } else if (application.status === "needs_followup") {
    needsAttention = true;
    attentionLabel = rolesReady ? "Follow-up — ready" : "Follow-up required";
    attentionDetail = application.admin_notes?.trim() || null;
  } else if (application.status === "rejected") {
    needsAttention = true;
    attentionLabel = "Rejected — can reopen";
    attentionDetail =
      application.admin_notes?.trim() ||
      "Change status or approve again when ready to reconsider.";
  } else if (hasPendingTraining) {
    needsAttention = true;
    attentionLabel = "Training pending";
    attentionDetail = `Approved volunteer still needs: ${Array.from(allMissingSet)
      .map(requirementLabel)
      .join(", ")}`;
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
    allRequirementsMet,
    canApproveWithPendingTraining,
    hasPendingTraining,
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
  if (context.hasPendingTraining) return 2;
  if (application.status === "needs_followup" && !context.rolesReady) return 3;
  if (context.isRoleExpansion && context.rolesReady) return 4;
  if (application.status === "needs_followup") return 5;
  if (application.status === "pending") return 6;
  if (application.status === "rejected") return 7;
  return 8;
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
