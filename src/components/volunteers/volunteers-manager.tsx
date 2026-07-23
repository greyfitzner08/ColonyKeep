"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api/errors";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import {
  requirementsForRole,
  requirementLabel,
  missingRequirementsForRole,
  missingRequirementsForApplicationApproval,
  missingAdminVerifiableRequirementsForRole,
  rolesNeedingTnvrCert,
  TEAM_ASSIGNMENT_REQUIREMENT_FIELDS,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";
import {
  filterSignupRoleDescriptions,
  signupVolunteerRoleOptions,
  volunteerRoleLabel,
} from "@/lib/volunteers/role-catalog";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import { canAssignVolunteerToTeam, getTeamEligibleVolunteers, hasTrapTeamMemberRoles } from "@/lib/volunteers/eligibility";
import {
  applicationMatchesFilter,
  attentionPriority,
  countApplicationsNeedingAttention,
  getApplicationReviewContext,
  canApproveImportedVolunteerWithPendingTraining,
  requirementSourceForApplication,
  type ApplicationReviewContext,
  type ApplicationStatusFilter,
  type ApplicationViewMode,
} from "@/lib/volunteers/application-review";
import { cn, formatDate } from "@/lib/utils";
import { ROLE_PERMISSIONS, isKnownUserRole } from "@/lib/constants";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  VolunteerApplication,
  TrapTeam,
  VolunteerRole,
  VolunteerRoleRequest,
  Profile,
  RoleDescription,
  UserRole,
} from "@/lib/types";
import { ApplicationCertificatePanel } from "@/components/volunteers/application-certificate-panel";
import { VolunteerAddDialog } from "@/components/volunteers/volunteer-add-dialog";
import { VolunteerContactFieldsForm,
  type VolunteerContactFormValues,
} from "@/components/volunteers/volunteer-contact-fields-form";
import { VolunteerRoleCheckboxList } from "@/components/volunteers/volunteer-role-checkbox-list";
import { volunteerContactFromApplication } from "@/lib/volunteers/contact-fields";
import {
  Check,
  X,
  MessageCircle,
  Trash2,
  AlertTriangle,
  KeyRound,
  LayoutGrid,
  Table2,
  Search,
} from "lucide-react";

interface VolunteersManagerProps {
  applications: VolunteerApplication[];
  teams: TrapTeam[];
  profilesByEmail: Record<string, Profile>;
  roleRequests?: VolunteerRoleRequest[];
  roleDescriptions?: RoleDescription[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  needs_followup: "bg-orange-100 text-orange-800",
};

const ADMIN_CHECKBOX_FIELDS = [
  { key: "shadow_completed", label: "Shadow Completed" },
  { key: "intake_training", label: "Intake Training" },
  { key: "tnvr_certificate_uploaded", label: "TNVR Certificate" },
  { key: "event_crash_course", label: "Event Crash Course" },
] as const;

function requirementFieldsForRoles(
  roles: VolunteerRole[],
  catalog: RoleDescription[]
): RequirementField[] {
  const fields = new Set<RequirementField>();
  for (const role of roles) {
    for (const field of requirementsForRole(role, catalog)) {
      fields.add(field);
    }
  }
  return Array.from(fields);
}

function requirementFieldsForReview(
  roles: VolunteerRole[],
  catalog: RoleDescription[],
  options: { assigningTrapTeam: boolean }
): RequirementField[] {
  const fields = new Set(requirementFieldsForRoles(roles, catalog));
  if (options.assigningTrapTeam || rolesNeedingTnvrCert(roles)) {
    for (const field of TEAM_ASSIGNMENT_REQUIREMENT_FIELDS) {
      fields.add(field);
    }
  }
  return Array.from(fields);
}

export function VolunteersManager({
  applications,
  teams,
  profilesByEmail,
  roleRequests = [],
  roleDescriptions = [],
}: VolunteersManagerProps) {
  const router = useRouter();
  const [reviewingApplicationId, setReviewingApplicationId] = useState<string | null>(null);
  const [applicationPatches, setApplicationPatches] = useState<
    Record<string, Partial<VolunteerApplication>>
  >({});
  const [roleRequestPatches, setRoleRequestPatches] = useState<
    Record<string, Partial<VolunteerRoleRequest>>
  >({});
  const [filter, setFilter] = useState<ApplicationStatusFilter>("needs_attention");
  const [viewMode, setViewMode] = useState<ApplicationViewMode>("cards");
  const [interestFilter, setInterestFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalRoleEdits, setApprovalRoleEdits] = useState<Record<string, VolunteerRole[]>>({});
  const [additionalRoleEdits, setAdditionalRoleEdits] = useState<Record<string, VolunteerRole[]>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [emailEdits, setEmailEdits] = useState<Record<string, string>>({});
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [contactEdits, setContactEdits] = useState<Record<string, VolunteerContactFormValues>>({});
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [reviewPlatformRole, setReviewPlatformRole] = useState<UserRole | "none">("none");
  const [reviewTeamId, setReviewTeamId] = useState("none");

  const roleCatalog = useMemo(() => roleDescriptions, [roleDescriptions]);

  const mergedApplications = useMemo(
    () =>
      applications.map((application) => ({
        ...application,
        ...applicationPatches[application.id],
      })),
    [applications, applicationPatches]
  );

  const mergedRoleRequests = useMemo(
    () =>
      roleRequests.map((request) => ({
        ...request,
        ...roleRequestPatches[request.id],
      })),
    [roleRequests, roleRequestPatches]
  );

  const reviewingApplication = useMemo(
    () => mergedApplications.find((application) => application.id === reviewingApplicationId) ?? null,
    [mergedApplications, reviewingApplicationId]
  );

  const profilesList = useMemo(() => Object.values(profilesByEmail), [profilesByEmail]);

  const teamEligibleProfiles = useMemo(
    () => getTeamEligibleVolunteers(mergedApplications, profilesList),
    [mergedApplications, profilesList]
  );

  const applicationRoleOptions = useMemo(
    () => signupVolunteerRoleOptions(roleCatalog),
    [roleCatalog]
  );

  function roleLabel(role: VolunteerRole) {
    return volunteerRoleLabel(role, roleCatalog);
  }

  function getReviewContext(application: VolunteerApplication) {
    return getApplicationReviewContext(
      application,
      profilesByEmail,
      mergedRoleRequests,
      roleCatalog,
      profilesList
    );
  }

  function contactForApp(
    app: VolunteerApplication,
    linkedProfile?: Profile
  ): VolunteerContactFormValues {
    if (contactEdits[app.id]) return contactEdits[app.id];

    const fromApp = volunteerContactFromApplication(app);
    return {
      full_name: fromApp.full_name ?? "",
      email: fromApp.email ?? "",
      phone: fromApp.phone ?? linkedProfile?.phone ?? "",
      birthday: fromApp.birthday ?? linkedProfile?.birthday ?? "",
      home_street: fromApp.home_street ?? linkedProfile?.home_street ?? "",
      home_city: fromApp.home_city ?? linkedProfile?.home_city ?? "",
      home_state: fromApp.home_state ?? linkedProfile?.home_state ?? "",
      home_zip: fromApp.home_zip ?? linkedProfile?.home_zip ?? "",
      home_county: fromApp.home_county ?? linkedProfile?.home_county ?? "",
    };
  }

  function approvalRolesForApp(app: VolunteerApplication): VolunteerRole[] {
    return approvalRoleEdits[app.id] ?? app.roles_requested ?? [];
  }

  function toggleApprovalRole(appId: string, role: VolunteerRole) {
    setApprovalRoleEdits((current) => {
      const existing = current[appId];
      const base = existing ?? mergedApplications.find((entry) => entry.id === appId)?.roles_requested ?? [];
      const next = base.includes(role)
        ? base.filter((entry) => entry !== role)
        : [...base, role];
      return { ...current, [appId]: next };
    });
  }

  function additionalRolesForApp(appId: string): VolunteerRole[] {
    return additionalRoleEdits[appId] ?? [];
  }

  function toggleAdditionalRole(appId: string, role: VolunteerRole) {
    setAdditionalRoleEdits((current) => {
      const base = current[appId] ?? [];
      const next = base.includes(role)
        ? base.filter((entry) => entry !== role)
        : [...base, role];
      return { ...current, [appId]: next };
    });
  }

  function additionalRolesReady(
    app: VolunteerApplication,
    context: ApplicationReviewContext,
    roles: VolunteerRole[]
  ): boolean {
    if (roles.length === 0) return false;
    const source = requirementSourceForApplication(app, context);
    return roles.every(
      (role) => missingAdminVerifiableRequirementsForRole(role, source, roleCatalog).length === 0
    );
  }

  function approvalRolesReady(
    app: VolunteerApplication,
    context: ApplicationReviewContext,
    roles: VolunteerRole[]
  ): boolean {
    if (roles.length === 0) return false;
    if (canApproveImportedVolunteerWithPendingTraining(app, roles)) return true;
    return context.allRequirementsMet;
  }

  const reviewingContext = useMemo(
    () => (reviewingApplication ? getReviewContext(reviewingApplication) : null),
    [reviewingApplication, profilesByEmail, mergedRoleRequests, roleCatalog, profilesList]
  );

  useEffect(() => {
    if (!pendingReviewId) return;
    const app = mergedApplications.find((entry) => entry.id === pendingReviewId);
    if (app) {
      setReviewingApplicationId(app.id);
      setPendingReviewId(null);
    }
  }, [mergedApplications, pendingReviewId]);

  useEffect(() => {
    const profile = reviewingContext?.linkedProfile;
    if (!profile) {
      setReviewPlatformRole("volunteer");
      setReviewTeamId("none");
      return;
    }
    setReviewPlatformRole(isKnownUserRole(profile.role) ? profile.role : "volunteer");
    setReviewTeamId(profile.team_id ?? "none");
  }, [reviewingContext?.linkedProfile, reviewingApplication?.id]);

  const attentionCount = useMemo(
    () =>
      countApplicationsNeedingAttention(
        mergedApplications,
        profilesByEmail,
        mergedRoleRequests,
        roleCatalog
      ),
    [mergedApplications, profilesByEmail, mergedRoleRequests, roleCatalog]
  );

  const filtered = useMemo(() => {
    let results = mergedApplications.filter((application) =>
      applicationMatchesFilter(application, filter, profilesByEmail, mergedRoleRequests, roleCatalog)
    );

    if (interestFilter !== "all") {
      results = results.filter((application) => {
        const context = getReviewContext(application);
        return context.rolesToReview.includes(interestFilter as VolunteerRole);
      });
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      results = results.filter((application) =>
        [
          application.full_name,
          application.email,
          application.phone,
          application.status,
          ...(application.roles_requested ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    return [...results].sort((a, b) => {
      const priorityDiff =
        attentionPriority(a, profilesByEmail, mergedRoleRequests, roleCatalog) -
        attentionPriority(b, profilesByEmail, mergedRoleRequests, roleCatalog);
      if (priorityDiff !== 0) return priorityDiff;
      return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
    });
  }, [
    mergedApplications,
    filter,
    interestFilter,
    searchQuery,
    profilesByEmail,
    mergedRoleRequests,
    roleCatalog,
  ]);

  function notesForApp(app: VolunteerApplication) {
    return actionNotes[app.id] ?? app.admin_notes ?? "";
  }

  function emailForApp(app: VolunteerApplication, linkedProfile?: Profile) {
    return contactForApp(app, linkedProfile).email;
  }

  function nameForApp(app: VolunteerApplication) {
    return nameEdits[app.id] ?? app.full_name;
  }

  function showActionError(message: string) {
    setActionError(message);
  }

  function clearActionError() {
    setActionError(null);
  }

  async function provisionLoginAccount(
    app: VolunteerApplication,
    linkedProfile?: Profile
  ): Promise<boolean> {
    clearActionError();
    setActingId(app.id);
    const contact = contactForApp(app, linkedProfile);
    const response = await fetch("/api/volunteers/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: app.id,
        teamId: reviewTeamId === "none" ? null : reviewTeamId,
        email: contact.email,
        volunteer_roles: approvalRolesForApp(app),
        platformRole: reviewPlatformRole !== "none" ? reviewPlatformRole : "volunteer",
      }),
    });
    const result = await response.json().catch(() => null);
    setActingId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to create volunteer login account"));
      return false;
    }
    if (result?.warning) {
      showActionError(result.warning);
    } else {
      clearActionError();
    }
    router.refresh();
    return true;
  }

  async function saveVolunteerChanges(
    app: VolunteerApplication,
    context: ApplicationReviewContext
  ) {
    const linkedProfile = context.linkedProfile;
    const contact = contactForApp(app, linkedProfile);
    const emailError = getEmailValidationError(contact.email);
    if (emailError) {
      showActionError(emailError);
      return;
    }

    clearActionError();
    setSavingEmailId(app.id);

    const payload: Record<string, unknown> = {
      applicationId: app.id,
      fullName: contact.full_name.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim() || null,
      homeStreet: contact.home_street.trim() || null,
      homeCity: contact.home_city.trim() || null,
      homeState: contact.home_state.trim() || null,
      homeZip: contact.home_zip.trim() || null,
      homeCounty: contact.home_county.trim() || null,
    };

    const notes = notesForApp(app);
    if (notes !== (app.admin_notes ?? "")) {
      payload.adminNotes = notes;
    }

    const isApprovedWithProfile = app.status === "approved" && Boolean(linkedProfile);
    if (!isApprovedWithProfile) {
      payload.roles = approvalRolesForApp(app);
    }

    const response = await fetch("/api/volunteers/update-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setSavingEmailId(null);
      showActionError(getApiErrorMessage(result, "Unable to save volunteer details"));
      return;
    }

    if (linkedProfile) {
      const profilePayload: Record<string, unknown> = { userId: linkedProfile.id };
      const nextPlatformRole = reviewPlatformRole === "none" ? null : reviewPlatformRole;
      const nextTeamId = reviewTeamId === "none" ? null : reviewTeamId;

      if (nextPlatformRole && nextPlatformRole !== linkedProfile.role) {
        profilePayload.role = nextPlatformRole;
      }
      if (nextTeamId !== linkedProfile.team_id) {
        profilePayload.teamId = nextTeamId;
      }

      if (Object.keys(profilePayload).length > 1) {
        const profileResponse = await fetch("/api/admin/profiles/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        });
        const profileResult = await profileResponse.json().catch(() => null);
        if (!profileResponse.ok) {
          setSavingEmailId(null);
          showActionError(getApiErrorMessage(profileResult, "Unable to save profile settings"));
          return;
        }
      }
    }

    setContactEdits((current) => {
      const next = { ...current };
      delete next[app.id];
      return next;
    });
    setSavingEmailId(null);
    router.refresh();

    if (app.status === "approved" && !linkedProfile) {
      await provisionLoginAccount(app);
      return;
    }

    clearActionError();
  }

  async function handleAction(
    id: string,
    action: "approve" | "reject" | "followup",
    adminNotes?: string,
    email?: string,
    volunteerRoles?: VolunteerRole[]
  ) {
    clearActionError();
    setActingId(id);
    if (action === "approve") {
      const emailToUse = email ?? emailEdits[id];
      const validationError = emailToUse ? getEmailValidationError(emailToUse) : null;
      if (validationError) {
        setActingId(null);
        showActionError(validationError);
        return;
      }

      const response = await fetch("/api/volunteers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: id,
          teamId: reviewTeamId === "none" ? null : reviewTeamId,
          email: emailToUse,
          volunteer_roles: volunteerRoles,
          platformRole: reviewPlatformRole !== "none" ? reviewPlatformRole : "volunteer",
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to approve volunteer"));
        return;
      }
      if (result?.warning) {
        showActionError(result.warning);
        router.refresh();
        return;
      }
      clearActionError();
    } else {
      const response = await fetch("/api/volunteers/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: id,
          status: action === "reject" ? "rejected" : "needs_followup",
          adminNotes,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to update application"));
        return;
      }
    }
    clearActionError();
    router.refresh();
  }

  async function handleApproveApplication(
    app: VolunteerApplication,
    context: ApplicationReviewContext,
    email?: string
  ) {
    const roleRequest = context.pendingRoleRequests[0];
    if (roleRequest) {
      clearActionError();
      setActingId(app.id);
      const response = await fetch("/api/volunteers/role-requests/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: roleRequest.id,
          action: "approve",
          admin_notes: notesForApp(app) || null,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to approve role expansion"));
        return;
      }
      if (result?.warning) {
        showActionError(result.warning);
      } else {
        clearActionError();
      }
      setReviewingApplicationId(null);
      router.refresh();
      return;
    }

    if (context.isRoleExpansion && context.newRoles.length > 0) {
      clearActionError();
      setActingId(app.id);
      const response = await fetch("/api/volunteers/grant-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          volunteer_roles: context.newRoles,
          admin_notes: notesForApp(app) || null,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to approve role expansion"));
        return;
      }
      clearActionError();
      setReviewingApplicationId(null);
      router.refresh();
      return;
    }

    await handleAction(app.id, "approve", undefined, email, approvalRolesForApp(app));
    setReviewingApplicationId(null);
  }

  async function handleRejectApplication(
    app: VolunteerApplication,
    context: ApplicationReviewContext
  ) {
    const roleRequest = context.pendingRoleRequests[0];
    if (roleRequest) {
      clearActionError();
      setActingId(app.id);
      const response = await fetch("/api/volunteers/role-requests/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: roleRequest.id,
          action: "reject",
          admin_notes: notesForApp(app) || null,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to reject role expansion"));
        return;
      }
      clearActionError();
      setReviewingApplicationId(null);
      router.refresh();
      return;
    }

    if (context.isRoleExpansion && context.newRoles.length > 0) {
      clearActionError();
      setActingId(app.id);
      const response = await fetch("/api/volunteers/grant-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          action: "reject",
          admin_notes: notesForApp(app) || null,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        showActionError(getApiErrorMessage(result, "Unable to reject role expansion"));
        return;
      }
      clearActionError();
      setReviewingApplicationId(null);
      router.refresh();
      return;
    }

    await handleAction(app.id, "reject", notesForApp(app));
    setReviewingApplicationId(null);
  }

  async function handleGrantAdditionalRoles(
    app: VolunteerApplication,
    context: ApplicationReviewContext
  ) {
    const rolesToGrant = additionalRolesForApp(app.id);
    if (rolesToGrant.length === 0) {
      showActionError("Select at least one new role to grant.");
      return;
    }

    if (!additionalRolesReady(app, context, rolesToGrant)) {
      showActionError("Complete training requirements before granting new roles.");
      return;
    }

    clearActionError();
    setActingId(app.id);
    const response = await fetch("/api/volunteers/grant-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: app.id,
        volunteer_roles: rolesToGrant,
        admin_notes: notesForApp(app) || null,
      }),
    });
    const result = await response.json().catch(() => null);
    setActingId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to grant volunteer roles"));
      return;
    }

    setAdditionalRoleEdits((current) => {
      const next = { ...current };
      delete next[app.id];
      return next;
    });
    clearActionError();
    router.refresh();
  }


  async function saveName(applicationId: string, fullName: string) {
    clearActionError();
    setSavingEmailId(applicationId);
    const response = await fetch("/api/volunteers/update-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, fullName }),
    });
    const result = await response.json().catch(() => null);
    setSavingEmailId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to update name"));
      return;
    }
    router.refresh();
  }

  async function saveEmail(applicationId: string, email: string) {
    clearActionError();
    setSavingEmailId(applicationId);
    const response = await fetch("/api/volunteers/update-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, email }),
    });
    const result = await response.json().catch(() => null);
    setSavingEmailId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to update email"));
      return;
    }
    router.refresh();
  }

  async function saveFollowUpNotes(applicationId: string, adminNotes: string) {
    clearActionError();
    setSavingEmailId(applicationId);
    const response = await fetch("/api/volunteers/update-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, adminNotes }),
    });
    const result = await response.json().catch(() => null);
    setSavingEmailId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to save follow-up notes"));
      return;
    }
    router.refresh();
  }

  async function updateApplicationField(
    applicationId: string,
    field: (typeof ADMIN_CHECKBOX_FIELDS)[number]["key"],
    value: boolean,
    context?: ApplicationReviewContext
  ) {
    setActionError(null);
    setUpdatingField(`${applicationId}:${field}`);

    const primaryRoleRequest = context?.pendingRoleRequests[0];
    const response = primaryRoleRequest
      ? await fetch("/api/volunteers/role-requests/update-requirements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: primaryRoleRequest.id, field, value }),
        })
      : await fetch("/api/volunteers/update-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, field, value }),
        });

    const result = await response.json().catch(() => null);
    setUpdatingField(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to update application"));
      return;
    }

    if (primaryRoleRequest) {
      setRoleRequestPatches((current) => ({
        ...current,
        [primaryRoleRequest.id]: {
          ...current[primaryRoleRequest.id],
          [field]: value,
        },
      }));
    } else {
      setApplicationPatches((current) => ({
        ...current,
        [applicationId]: {
          ...current[applicationId],
          [field]: value,
        },
      }));
    }
  }

  async function resetTemporaryPassword(applicationId: string, name: string) {
    if (
      !window.confirm(
        `Reset the login password for ${name} to the temporary default?\n\nThey will sign in with FeralFelines123! and be prompted to choose a new password.`
      )
    ) {
      return;
    }

    clearActionError();
    setResettingPasswordId(applicationId);
    const response = await fetch("/api/volunteers/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId }),
    });
    const result = await response.json().catch(() => null);
    setResettingPasswordId(null);

    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to reset password"));
      return;
    }

    const message = result?.email_warning
      ? `${result.message} ${result.email_warning}`
      : (result?.message ?? "Temporary password set. The volunteer must sign in and choose a new password.");
    showActionError(message);
    router.refresh();
  }

  async function deleteApplication(id: string, name: string) {
    if (!window.confirm(`Delete the application for ${name}? This cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setActingId(id);
    const response = await fetch("/api/volunteers/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id }),
    });
    const result = await response.json().catch(() => null);
    setActingId(null);
    if (!response.ok) {
      showActionError(getApiErrorMessage(result, "Unable to delete application"));
      return;
    }
    if (reviewingApplicationId === id) setReviewingApplicationId(null);
    router.refresh();
  }

  function renderApplicationDetails(app: VolunteerApplication, context: ApplicationReviewContext) {
    const { linkedProfile, canReview, isRoleExpansion, approvedRoles } = context;
    const selectedApprovalRoles = isRoleExpansion ? context.rolesToReview : approvalRolesForApp(app);
    const rolesReady = isRoleExpansion
      ? context.rolesReady
      : approvalRolesReady(app, context, selectedApprovalRoles);
    const requirementSource = requirementSourceForApplication(app, context);
    const assigningTrapTeam = !isRoleExpansion && reviewTeamId !== "none";
    const relevantRequirementFields = requirementFieldsForReview(selectedApprovalRoles, roleCatalog, {
      assigningTrapTeam,
    });
    const selectableApprovalRoles = filterSignupRoleDescriptions(applicationRoleOptions, app.birthday);
    const teamAssignReady = isRoleExpansion
      ? true
      : reviewTeamId === "none" || canAssignVolunteerToTeam(app, linkedProfile);
    const trapTeamRolesSelected = hasTrapTeamMemberRoles(linkedProfile, {
      roles_requested: selectedApprovalRoles,
    });
    const trapTeamEligible = linkedProfile
      ? teamEligibleProfiles.some((entry) => entry.profile.id === linkedProfile.id)
      : trapTeamRolesSelected;
    const certificateUrl =
      context.pendingRoleRequests[0]?.tnvr_certificate_url ??
      app.tnvr_certificate_url ??
      linkedProfile?.tnvr_certificate_url ??
      null;
    const certificateUploaded = Boolean(requirementSource.tnvr_certificate_uploaded);
    const showReviewActions =
      canReview || (isRoleExpansion && context.newRoles.length > 0);
    const showApprovedVolunteerManagement =
      app.status === "approved" && Boolean(linkedProfile);
    const showApplicationRoleEditor = !showApprovedVolunteerManagement;
    const additionalRoles = additionalRolesForApp(app.id);
    const availableAdditionalRoles = filterSignupRoleDescriptions(
      applicationRoleOptions,
      app.birthday
    ).filter(
      (entry) =>
        !approvedRoles.includes(entry.role_id) && !context.newRoles.includes(entry.role_id)
    );
    const expansionRequirementFields = isRoleExpansion
      ? requirementFieldsForRoles(selectedApprovalRoles, roleCatalog)
      : relevantRequirementFields;
    const trainingManagementRoles = Array.from(
      new Set([
        ...selectedApprovalRoles,
        ...additionalRoles,
        ...approvedRoles,
      ])
    ) as VolunteerRole[];
    const trainingRequirementFields = requirementFieldsForRoles(
      trainingManagementRoles,
      roleCatalog
    );
    const showTrainingManagement = true;
    const showCertificatePanel =
      rolesNeedingTnvrCert(trainingManagementRoles) ||
      Boolean(certificateUrl) ||
      trainingRequirementFields.includes("tnvr_certificate_uploaded");
    const contactValues = contactForApp(app, linkedProfile);
    const emailValue = contactValues.email;
    const emailInvalid = Boolean(getEmailValidationError(emailValue));
    const suggestedEmail = parsePrimaryEmail(emailValue);

    const reviewActions = showReviewActions ? (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={actingId === app.id || emailInvalid || !rolesReady || !teamAssignReady}
          onClick={() => handleApproveApplication(app, context, emailValue)}
        >
          <Check className="h-4 w-4 mr-1" />
          {actingId === app.id
            ? "Working..."
            : rolesReady
              ? context.canApproveWithPendingTraining && !context.allRequirementsMet
                ? isRoleExpansion
                  ? "Approve role expansion"
                  : "Approve with pending training"
                : isRoleExpansion
                  ? "Approve role expansion"
                  : "Approve"
              : selectedApprovalRoles.length === 0
                ? "Select at least one role"
                : "Complete requirements first"}
        </Button>
        {!isRoleExpansion && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(app.id, "followup", notesForApp(app))}
            disabled={actingId === app.id}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {app.status === "needs_followup" ? "Update Follow-up" : "Follow-up"}
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleRejectApplication(app, context)}
          disabled={actingId === app.id}
        >
          <X className="h-4 w-4 mr-1" />
          {isRoleExpansion ? "Reject expansion" : "Reject"}
        </Button>
      </div>
    ) : null;

    return (
      <div className="space-y-4">
        {app.imported_via_csv && canReview && !context.allRequirementsMet && (
          <div className="rounded-md border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <p className="font-medium">CSV import</p>
            <p className="mt-1">
              This volunteer was imported rather than signing up online. You can approve them now
              with their selected roles and verify training afterward. They will still need to
              accept the liability waiver and policy on first login.
            </p>
            {context.allMissingRequirements.length > 0 && (
              <p className="mt-2 text-sky-900">
                Training still pending:{" "}
                {context.allMissingRequirements.map(requirementLabel).join(", ")}
              </p>
            )}
          </div>
        )}

        {app.status === "approved" && context.hasPendingTraining && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Training still pending</p>
            <p className="mt-1">
              This volunteer is approved and in the system. Check off training items below as you
              verify them so they stay visible until complete.
            </p>
          </div>
        )}

        {isRoleExpansion && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-amber-950">Additional volunteer roles requested</p>
                <p className="text-amber-900">
                  {app.full_name} already has access as:{" "}
                  <span className="font-medium">{approvedRoles.map(roleLabel).join(", ")}</span>.
                  They are requesting new roles that require separate training verification.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {context.rolesToReview.map((role) => {
                    const missing = context.missingByRole[role] ?? [];
                    return (
                      <div
                        key={role}
                        className={cn(
                          "rounded-md border px-3 py-2",
                          missing.length === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-white"
                        )}
                      >
                        <p className="font-medium text-foreground">{roleLabel(role)}</p>
                        {missing.length === 0 ? (
                          <p className="text-muted-foreground">Requirements complete</p>
                        ) : (
                          <p className="text-amber-900">
                            Still need: {missing.map(requirementLabel).join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {context.pendingRoleRequests.length > 0 ? (
                  <p className="text-xs text-amber-800">
                    Trap-specific requirements (shadow, TNVR certificate) are tracked per role
                    request — check them off below after verification.
                  </p>
                ) : (
                  <p className="text-xs text-amber-800">
                    No open role request record was found. You can still approve the pending roles
                    listed above once requirements are verified.
                  </p>
                )}
                {reviewActions && (
                  <div className="border-t border-amber-200 pt-3">{reviewActions}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Experience:</strong> {app.prior_experience ?? "—"}</p>
            <p><strong>How heard:</strong> {app.how_heard ?? "—"}</p>
          </div>
          {linkedProfile && linkedProfile.email.toLowerCase() !== app.email.toLowerCase() && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
              <p className="text-xs">
                Linked login profile uses <strong>{linkedProfile.email}</strong>. Saving contact
                details below updates both records when possible.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Contact & address</p>
            <p className="text-xs text-muted-foreground">
              Update contact info and address here. Birthday is collected when the volunteer logs in.
              Save changes when done.
            </p>
          </div>
          <VolunteerContactFieldsForm
            values={contactValues}
            onChange={(values) =>
              setContactEdits((current) => ({ ...current, [app.id]: values }))
            }
            idPrefix={`review-contact-${app.id}`}
          />
          {emailInvalid && (
            <p className="flex flex-wrap items-center gap-1 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Enter a valid email address before approving.
                {suggestedEmail && emailValue.trim().toLowerCase() !== suggestedEmail && (
                  <> Suggested: {suggestedEmail}</>
                )}
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 rounded-md border p-3">
          <div className="space-y-2">
            <Label>Platform role</Label>
            <Select
              value={reviewPlatformRole}
              onValueChange={(value) => setReviewPlatformRole(value as UserRole | "none")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Platform role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_PERMISSIONS).map(([role, { label }]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {linkedProfile
                ? "Saved with Save changes below."
                : "Applied when you approve or create their login account."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Trap team</Label>
            <Select
              value={reviewTeamId}
              onValueChange={setReviewTeamId}
              disabled={
                reviewPlatformRole === "none" ||
                !trapTeamRolesSelected ||
                (linkedProfile ? !trapTeamEligible : false)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Trap team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {sortTrapTeams(teams).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!linkedProfile && (
              <p className="text-xs text-muted-foreground">
                Optional on approve — applied when their login account is created.
              </p>
            )}
            {linkedProfile && !trapTeamEligible && trapTeamRolesSelected && (
              <p className="text-xs text-muted-foreground">
                Team assignment unlocks after application approval and required training.
              </p>
            )}
            {!trapTeamRolesSelected && (
              <p className="text-xs text-muted-foreground">
                Select a trap-team role to enable team assignment.
              </p>
            )}
          </div>
        </div>

        {app.admin_notes && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Follow-up notes</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{app.admin_notes}</p>
          </div>
        )}

        {showApprovedVolunteerManagement && (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Volunteer interests</p>
              <p className="text-xs text-muted-foreground">
                Grant additional roles after verifying training requirements below.
              </p>
            </div>

            {approvedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {approvedRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {roleLabel(role)}
                  </Badge>
                ))}
              </div>
            )}

            {availableAdditionalRoles.length > 0 ? (
              <VolunteerRoleCheckboxList
                entries={availableAdditionalRoles}
                selectedRoles={additionalRoles}
                onToggle={(roleId) => toggleAdditionalRole(app.id, roleId)}
                idPrefix={`add-role-${app.id}`}
                roleCatalog={roleCatalog}
                renderMeta={(entry, selected) => {
                  if (!selected) return null;
                  const missing = missingAdminVerifiableRequirementsForRole(
                    entry.role_id,
                    requirementSource,
                    roleCatalog
                  );
                  if (missing.length === 0) return null;
                  return (
                    <p className="text-xs text-amber-900">
                      Needs: {missing.map(requirementLabel).join(", ")}
                    </p>
                  );
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                This volunteer already has every available role for their age group.
              </p>
            )}

            {additionalRoles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <Button
                  size="sm"
                  disabled={
                    actingId === app.id ||
                    !additionalRolesReady(app, context, additionalRoles)
                  }
                  onClick={() => handleGrantAdditionalRoles(app, context)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {actingId === app.id
                    ? "Working..."
                    : `Grant ${additionalRoles.length} role${additionalRoles.length === 1 ? "" : "s"}`}
                </Button>
                {!additionalRolesReady(app, context, additionalRoles) && (
                  <p className="text-xs text-amber-800">
                    Check off required training above before granting new roles.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Training & Requirements</Label>
          <p className="text-xs text-muted-foreground">
            Liability waiver and policy are completed by the volunteer at sign-in. Check off
            training items here after verification.
          </p>
          <div className="flex flex-wrap gap-4">
            {ADMIN_CHECKBOX_FIELDS.filter(({ key }) => trainingRequirementFields.includes(key)).map(
              ({ key, label }) => {
                const fieldKey = `${app.id}:${key}`;
                const checked = Boolean(requirementSource[key]);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={fieldKey}
                      checked={checked}
                      disabled={updatingField === fieldKey}
                      onCheckedChange={(value) =>
                        updateApplicationField(app.id, key, value === true, context)
                      }
                    />
                    <Label htmlFor={fieldKey} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                );
              }
            )}
          </div>
          {expansionRequirementFields.length === 0 && isRoleExpansion && context.rolesReady && (
            <p className="text-xs text-green-700">
              No additional training requirements for the requested roles — ready to approve.
            </p>
          )}
          {relevantRequirementFields.length === 0 && !isRoleExpansion && (
            <p className="text-xs text-muted-foreground">
              Select volunteer roles above to see which training requirements apply.
            </p>
          )}
          {isRoleExpansion && context.pendingRoleRequests.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Check off any requirements below, then approve the role expansion above or here.
            </p>
          )}
          {showCertificatePanel && (
            <ApplicationCertificatePanel
              applicationId={app.id}
              certificateUrl={certificateUrl}
              certificateUploaded={certificateUploaded}
              onUpdated={() => {
                setApplicationPatches((current) => ({
                  ...current,
                  [app.id]: {
                    ...current[app.id],
                    tnvr_certificate_uploaded: true,
                  },
                }));
              }}
            />
          )}
        </div>

        {showApplicationRoleEditor && !isRoleExpansion && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Volunteer roles</p>
              <p className="text-xs text-muted-foreground">
                Select or adjust volunteer interests for this application
                {app.birthday ? " (filtered by age)" : ""}.
              </p>
            </div>

            <VolunteerRoleCheckboxList
              entries={selectableApprovalRoles}
              selectedRoles={selectedApprovalRoles}
              onToggle={(roleId) => toggleApprovalRole(app.id, roleId)}
              idPrefix={`approve-role-${app.id}`}
              roleCatalog={roleCatalog}
              renderMeta={(entry, selected) => {
                if (!selected) return null;

                const approvalMissing = missingRequirementsForApplicationApproval(
                  entry.role_id,
                  requirementSource,
                  roleCatalog
                );
                const teamMissing = missingRequirementsForRole(
                  entry.role_id,
                  requirementSource,
                  roleCatalog
                ).filter((field) => TEAM_ASSIGNMENT_REQUIREMENT_FIELDS.includes(field));

                return (
                  <>
                    {approvalMissing.length > 0 && app.imported_via_csv && canReview && (
                      <p className="text-xs text-sky-800">
                        Training pending — can approve now:{" "}
                        {approvalMissing.map(requirementLabel).join(", ")}
                      </p>
                    )}
                    {approvalMissing.length > 0 && !(app.imported_via_csv && canReview) && (
                      <p className="text-xs text-amber-800">
                        Needs before approval: {approvalMissing.map(requirementLabel).join(", ")}
                      </p>
                    )}
                    {approvalMissing.length === 0 && (
                      <p className="text-xs text-green-700">Requirements complete</p>
                    )}
                    {teamMissing.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Before trap team assignment: {teamMissing.map(requirementLabel).join(", ")}
                      </p>
                    )}
                  </>
                );
              }}
            />

            {canReview && rolesNeedingTnvrCert(selectedApprovalRoles) && (
              <p className="text-xs text-muted-foreground border-t pt-4">
                TNVR field roles require certificate and shadow training before trap team
                assignment.
              </p>
            )}

            {!canReview && (
              <p className="text-xs text-muted-foreground">
                Role changes are saved with Save changes at the bottom.
              </p>
            )}
          </div>
        )}

        {showReviewActions && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor={`notes-${app.id}`}>
                {app.status === "needs_followup" ? "Follow-up notes" : "Follow-up notes (optional)"}
              </Label>
              <Textarea
                id={`notes-${app.id}`}
                placeholder="Why does this volunteer need follow-up?"
                value={notesForApp(app)}
                onChange={(event) =>
                  setActionNotes((prev) => ({ ...prev, [app.id]: event.target.value }))
                }
                rows={3}
              />
              {app.status === "needs_followup" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingEmailId === app.id || notesForApp(app) === (app.admin_notes ?? "")}
                  onClick={() => saveFollowUpNotes(app.id, notesForApp(app))}
                >
                  {savingEmailId === app.id ? "Saving..." : "Save Notes"}
                </Button>
              )}
            </div>

            {!isRoleExpansion && reviewActions && (
              <div>{reviewActions}</div>
            )}
            {actionError && reviewingApplication?.id === app.id && (
              <p
                className={`text-sm ${
                  actionError.startsWith("Volunteer approved") ||
                  actionError.includes("Temporary password") ||
                  actionError.includes("Password reset")
                    ? "text-orange-700"
                    : "text-destructive"
                }`}
                role="alert"
              >
                {actionError}
              </p>
            )}
          </div>
        )}

        {app.status === "approved" && !linkedProfile && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">Login account not set up yet</p>
            <p className="mt-1">
              Save changes below to create their platform login automatically.
            </p>
          </div>
        )}

        {app.status === "approved" && linkedProfile && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium">Volunteer login</p>
            <p className="text-sm text-muted-foreground">
              Reset to the temporary password if they cannot sign in or never set one up.
              {linkedProfile?.must_change_password && (
                <> This volunteer is already flagged to change their password on next sign-in.</>
              )}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={resettingPasswordId === app.id || actingId === app.id}
              onClick={() => resetTemporaryPassword(app.id, app.full_name)}
            >
              <KeyRound className="h-4 w-4 mr-1" />
              {resettingPasswordId === app.id ? "Resetting…" : "Reset to temporary password"}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteApplication(app.id, app.full_name)}
            disabled={actingId === app.id}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {actingId === app.id ? "Deleting..." : "Delete Application"}
          </Button>
        </div>
      </div>
    );
  }

  function renderApplicationSummary(app: VolunteerApplication, context: ApplicationReviewContext) {
    const { linkedProfile, rolesToReview, isRoleExpansion, approvedRoles } = context;
    return (
      <>
        <div>
          <p className="font-medium">{app.full_name}</p>
          <p className="text-sm text-muted-foreground">
            {app.email} · Applied {formatDate(app.created_at)}
            {app.imported_via_csv && <> · CSV import</>}
            {linkedProfile?.role && (
              <> · Platform role: {linkedProfile.role.replace(/_/g, " ")}</>
            )}
          </p>
        </div>
        {isRoleExpansion && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              New roles requested — training required before approval
            </p>
            <p className="mt-1 text-amber-900">
              Current roles: {approvedRoles.map(roleLabel).join(", ")}. New:{" "}
              {rolesToReview.map(roleLabel).join(", ")}.
              {!context.rolesReady && (
                <> Missing: {context.allMissingRequirements.map(requirementLabel).join(", ")}.</>
              )}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {rolesToReview.map((role) => {
            const missing = context.missingByRole[role] ?? [];
            return (
              <Badge
                key={role}
                variant={missing.length === 0 ? "secondary" : "outline"}
                className={cn("text-xs", missing.length > 0 && "border-amber-400 text-amber-900 bg-amber-50")}
              >
                {roleLabel(role)}
                {missing.length > 0 && ` · needs ${missing.map(requirementLabel).join(", ")}`}
              </Badge>
            );
          })}
        </div>
        {isRoleExpansion && approvedRoles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Existing access unchanged: {approvedRoles.map(roleLabel).join(", ")}
          </p>
        )}
      </>
    );
  }

  const applicationTableColumns = useMemo((): DataTableColumn<VolunteerApplication>[] => {
    return [
      {
        id: "applicant",
        label: "Applicant",
        defaultWidth: 220,
        sortValue: (app) => app.full_name,
        render: (app) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{app.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">{app.email}</p>
            <p className="text-xs text-muted-foreground">Applied {formatDate(app.created_at)}</p>
          </div>
        ),
      },
      {
        id: "status",
        label: "Status",
        defaultWidth: 130,
        sortValue: (app) => app.status,
        render: (app) => (
          <Badge className={STATUS_COLORS[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
        ),
      },
      {
        id: "attention",
        label: "Attention",
        defaultWidth: 180,
        sortValue: (app) => {
          const context = getReviewContext(app);
          return context.attentionLabel ?? "";
        },
        render: (app) => {
          const context = getReviewContext(app);
          return (
            <div className="space-y-1">
              {context.attentionLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    context.isRoleExpansion && !context.rolesReady
                      ? "border-amber-400 bg-amber-50 text-amber-900"
                      : "border-primary/30 text-primary"
                  )}
                >
                  {context.attentionLabel}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
              {context.attentionDetail && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{context.attentionDetail}</p>
              )}
            </div>
          );
        },
      },
      {
        id: "roles",
        label: "Roles / requirements",
        defaultWidth: 260,
        render: (app) => {
          const context = getReviewContext(app);
          return (
            <div className="flex flex-wrap gap-1">
              {context.rolesToReview.map((role) => {
                const missing = context.missingByRole[role] ?? [];
                return (
                  <Badge
                    key={role}
                    variant={missing.length === 0 ? "secondary" : "outline"}
                    className={cn(
                      "text-[11px]",
                      missing.length > 0 && "border-amber-400 bg-amber-50 text-amber-900"
                    )}
                  >
                    {roleLabel(role)}
                  </Badge>
                );
              })}
              {!context.rolesReady && context.allMissingRequirements.length > 0 && (
                <span className="w-full text-xs text-amber-900">
                  Needs: {context.allMissingRequirements.map(requirementLabel).join(", ")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        label: "Actions",
        defaultWidth: 110,
        minWidth: 96,
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (app) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReviewingApplicationId(app.id)}
            >
              Review
            </Button>
          </div>
        ),
      },
    ];
  }, [profilesByEmail, roleCatalog, roleRequests]);

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            actionError.startsWith("Volunteer approved") ||
            actionError.includes("Temporary password") ||
            actionError.includes("Password reset")
              ? "border-orange-200 bg-orange-50 text-orange-900"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="alert"
        >
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search applicants…"
              className="pl-9"
              aria-label="Search applicants"
            />
          </div>

          <Select value={filter} onValueChange={(value) => setFilter(value as ApplicationStatusFilter)}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_attention">
                Needs attention{attentionCount > 0 ? ` (${attentionCount})` : ""}
              </SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="needs_followup">Needs follow-up</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={interestFilter} onValueChange={setInterestFilter}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Volunteer interest" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All interests</SelectItem>
              {applicationRoleOptions.map((entry) => (
                <SelectItem key={entry.role_id} value={entry.role_id}>{entry.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-sm text-muted-foreground self-center">
            {filtered.length} shown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <VolunteerAddDialog
            roleDescriptions={roleCatalog}
            triggerVariant="icon"
            onCreated={(applicationId) => setPendingReviewId(applicationId)}
          />
          <div className="flex items-center gap-1 w-fit rounded-lg border bg-background p-1">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            className={cn("gap-2", viewMode === "cards" && "shadow-none")}
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            className={cn("gap-2", viewMode === "table" && "shadow-none")}
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "No applications match your search."
            : filter === "needs_attention"
              ? "No applications need attention right now."
              : "No applications match your filters."}
        </p>
      )}

      {viewMode === "cards" && filtered.map((app) => {
        const context = getReviewContext(app);

        return (
          <Card
            key={app.id}
            className={cn(
              context.isRoleExpansion && !context.rolesReady && "border-amber-300 shadow-sm",
              context.needsAttention && !context.isRoleExpansion && "border-primary/20"
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  {renderApplicationSummary(app, context)}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {context.attentionLabel && (
                    <Badge
                      variant="outline"
                      className={cn(
                        context.isRoleExpansion && !context.rolesReady
                          ? "border-amber-400 bg-amber-50 text-amber-900"
                          : "border-primary/30 text-primary"
                      )}
                    >
                      {context.attentionLabel}
                    </Badge>
                  )}
                  <Badge className={STATUS_COLORS[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                  {context.isRoleExpansion && context.newRoles.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={actingId === app.id || !context.rolesReady}
                        onClick={() => handleApproveApplication(app, context, emailForApp(app))}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {actingId === app.id
                          ? "Working..."
                          : context.rolesReady
                            ? "Approve roles"
                            : "Complete requirements"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewingApplicationId(app.id)}
                      >
                        Review
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingApplicationId(app.id)}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}

      {viewMode === "table" && filtered.length > 0 && (
        <DataTable
          tableId="volunteer-applications"
          columns={applicationTableColumns}
          rows={filtered}
          getRowKey={(app) => app.id}
          enableSearch={false}
          getRowClassName={(app) => {
            const context = getReviewContext(app);
            return context.isRoleExpansion && !context.rolesReady ? "bg-amber-50/60" : undefined;
          }}
          emptyMessage="No applications match your filters."
        />
      )}

      <Dialog
        open={reviewingApplicationId != null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingApplicationId(null);
            setReviewTeamId("none");
            setAdditionalRoleEdits({});
            setContactEdits({});
            setApplicationPatches({});
            setRoleRequestPatches({});
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {reviewingApplication && reviewingContext && (
            <>
              <DialogHeader>
                <DialogTitle>{reviewingApplication.full_name}</DialogTitle>
                <DialogDescription>
                  {reviewingApplication.email} · Applied {formatDate(reviewingApplication.created_at)}
                  {reviewingContext.linkedProfile?.role && (
                    <> · Platform role: {reviewingContext.linkedProfile.role.replace(/_/g, " ")}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              {renderApplicationDetails(reviewingApplication, reviewingContext)}
              <DialogFooter className="gap-2 border-t pt-4 sm:justify-between">
                <p className="text-xs text-muted-foreground text-left mr-auto">
                  {reviewingApplication.status === "approved" && !reviewingContext.linkedProfile
                    ? "Save will also create their login account."
                    : "Training checkboxes save immediately when toggled."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReviewingApplicationId(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    disabled={savingEmailId === reviewingApplication.id}
                    onClick={() => saveVolunteerChanges(reviewingApplication, reviewingContext)}
                  >
                    {savingEmailId === reviewingApplication.id ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
