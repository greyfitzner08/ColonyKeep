"use client";

import { useMemo, useState } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import {
  requirementsForRole,
  requirementLabel,
  missingRequirementsForRole,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";
import {
  filterSignupRoleDescriptions,
  resolveVolunteerRoleCatalog,
  signupVolunteerRoleOptions,
  volunteerRoleLabel,
} from "@/lib/volunteers/role-catalog";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import {
  applicationMatchesFilter,
  attentionPriority,
  countApplicationsNeedingAttention,
  getApplicationReviewContext,
  requirementSourceForApplication,
  type ApplicationReviewContext,
  type ApplicationStatusFilter,
  type ApplicationViewMode,
} from "@/lib/volunteers/application-review";
import { cn, formatDate } from "@/lib/utils";
import type {
  VolunteerApplication,
  TrapTeam,
  VolunteerRole,
  VolunteerRoleRequest,
  Profile,
  RoleDescription,
} from "@/lib/types";
import {
  Check,
  X,
  MessageCircle,
  Trash2,
  AlertTriangle,
  KeyRound,
  LayoutGrid,
  Table2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

type NameSortDirection = "asc" | "desc";

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
  { key: "liability_waiver_signed", label: "Liability Waiver" },
  { key: "policy_signed", label: "Policy Acknowledgement" },
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

export function VolunteersManager({
  applications,
  teams,
  profilesByEmail,
  roleRequests = [],
  roleDescriptions = [],
}: VolunteersManagerProps) {
  const router = useRouter();
  const [reviewingApplication, setReviewingApplication] = useState<VolunteerApplication | null>(null);
  const [filter, setFilter] = useState<ApplicationStatusFilter>("needs_attention");
  const [viewMode, setViewMode] = useState<ApplicationViewMode>("cards");
  const [nameSort, setNameSort] = useState<NameSortDirection | null>(null);
  const [interestFilter, setInterestFilter] = useState("all");
  const [approvalRoleEdits, setApprovalRoleEdits] = useState<Record<string, VolunteerRole[]>>({});
  const [approveTeam, setApproveTeam] = useState<string>("none");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [emailEdits, setEmailEdits] = useState<Record<string, string>>({});
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);

  const roleCatalog = useMemo(
    () => resolveVolunteerRoleCatalog(roleDescriptions),
    [roleDescriptions]
  );

  const applicationRoleOptions = useMemo(
    () => signupVolunteerRoleOptions(roleCatalog),
    [roleCatalog]
  );

  function roleLabel(role: VolunteerRole) {
    return volunteerRoleLabel(role, roleCatalog);
  }

  function approvalRolesForApp(app: VolunteerApplication): VolunteerRole[] {
    return approvalRoleEdits[app.id] ?? app.roles_requested ?? [];
  }

  function toggleApprovalRole(appId: string, role: VolunteerRole) {
    setApprovalRoleEdits((current) => {
      const existing = current[appId];
      const base = existing ?? applications.find((entry) => entry.id === appId)?.roles_requested ?? [];
      const next = base.includes(role)
        ? base.filter((entry) => entry !== role)
        : [...base, role];
      return { ...current, [appId]: next };
    });
  }

  function approvalRolesReady(
    app: VolunteerApplication,
    context: ApplicationReviewContext,
    roles: VolunteerRole[]
  ): boolean {
    if (roles.length === 0) return false;
    const source = volunteerRequirementSource(
      app,
      context.linkedProfile ?? { tnvr_certificate_uploaded: false, tnvr_certificate_url: null }
    );
    return roles.every((role) => missingRequirementsForRole(role, source, roleCatalog).length === 0);
  }

  const reviewingContext = useMemo(
    () =>
      reviewingApplication
        ? getApplicationReviewContext(
            reviewingApplication,
            profilesByEmail,
            roleRequests,
            roleCatalog
          )
        : null,
    [reviewingApplication, profilesByEmail, roleRequests, roleCatalog]
  );

  const attentionCount = useMemo(
    () =>
      countApplicationsNeedingAttention(applications, profilesByEmail, roleRequests, roleCatalog),
    [applications, profilesByEmail, roleRequests, roleCatalog]
  );

  const filtered = useMemo(() => {
    let results = applications.filter((application) =>
      applicationMatchesFilter(application, filter, profilesByEmail, roleRequests, roleCatalog)
    );

    if (interestFilter !== "all") {
      results = results.filter((application) => {
        const context = getApplicationReviewContext(
          application,
          profilesByEmail,
          roleRequests,
          roleCatalog
        );
        return context.rolesToReview.includes(interestFilter as VolunteerRole);
      });
    }

    if (viewMode === "table" && nameSort) {
      return [...results].sort((a, b) => {
        const cmp = a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
        return nameSort === "asc" ? cmp : -cmp;
      });
    }

    return [...results].sort((a, b) => {
      const priorityDiff =
        attentionPriority(a, profilesByEmail, roleRequests, roleCatalog) -
        attentionPriority(b, profilesByEmail, roleRequests, roleCatalog);
      if (priorityDiff !== 0) return priorityDiff;
      return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
    });
  }, [applications, filter, interestFilter, profilesByEmail, roleRequests, roleCatalog, viewMode, nameSort]);

  function notesForApp(app: VolunteerApplication) {
    return actionNotes[app.id] ?? app.admin_notes ?? "";
  }

  function emailForApp(app: VolunteerApplication) {
    return emailEdits[app.id] ?? app.email;
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
          teamId: approveTeam === "none" ? null : approveTeam,
          email: emailToUse,
          volunteer_roles: volunteerRoles,
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
    if (context.isRoleExpansion && roleRequest) {
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
      setReviewingApplication(null);
      router.refresh();
      return;
    }

    await handleAction(app.id, "approve", undefined, email, approvalRolesForApp(app));
    setReviewingApplication(null);
  }

  async function handleRejectApplication(
    app: VolunteerApplication,
    context: ApplicationReviewContext
  ) {
    const roleRequest = context.pendingRoleRequests[0];
    if (context.isRoleExpansion && roleRequest) {
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
      setReviewingApplication(null);
      router.refresh();
      return;
    }

    await handleAction(app.id, "reject", notesForApp(app));
    setReviewingApplication(null);
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
    router.refresh();
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
    if (reviewingApplication?.id === id) setReviewingApplication(null);
    router.refresh();
  }

  function renderApplicationDetails(app: VolunteerApplication, context: ApplicationReviewContext) {
    const emailValue = emailForApp(app);
    const nameValue = nameForApp(app);
    const emailInvalid = Boolean(getEmailValidationError(emailValue));
    const suggestedEmail = parsePrimaryEmail(emailValue);
    const { linkedProfile, canReview, isRoleExpansion, approvedRoles } = context;
    const selectedApprovalRoles = isRoleExpansion ? context.rolesToReview : approvalRolesForApp(app);
    const rolesReady = isRoleExpansion
      ? context.rolesReady
      : approvalRolesReady(app, context, selectedApprovalRoles);
    const requirementSource = requirementSourceForApplication(app, context);
    const relevantRequirementFields = requirementFieldsForRoles(selectedApprovalRoles, roleCatalog);
    const selectableApprovalRoles = filterSignupRoleDescriptions(applicationRoleOptions, app.birthday);

    return (
      <div className="space-y-4">
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
                {context.pendingRoleRequests.length > 0 && (
                  <p className="text-xs text-amber-800">
                    Trap-specific requirements (shadow, TNVR certificate) are tracked per role
                    request — check them off below after verification.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Phone:</strong> {app.phone}</p>
            <p><strong>Birthday:</strong> {app.birthday ? formatDate(app.birthday) : "—"}</p>
            {isRoleExpansion && (
              <p><strong>Roles:</strong> {selectedApprovalRoles.map(roleLabel).join(", ") || "—"}</p>
            )}
          </div>
          <div>
            <p><strong>Experience:</strong> {app.prior_experience ?? "—"}</p>
            <p><strong>How heard:</strong> {app.how_heard ?? "—"}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-2">
            <Label htmlFor={`name-${app.id}`}>Full name</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id={`name-${app.id}`}
                value={nameValue}
                onChange={(event) =>
                  setNameEdits((prev) => ({ ...prev, [app.id]: event.target.value }))
                }
                className="max-w-md"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={savingEmailId === app.id || nameValue === app.full_name}
                onClick={() => saveName(app.id, nameValue)}
              >
                {savingEmailId === app.id ? "Saving..." : "Save Name"}
              </Button>
            </div>
          </div>

          {canReview && (
            <div className="space-y-2">
              <Label htmlFor={`email-${app.id}`}>Email</Label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id={`email-${app.id}`}
                  type="email"
                  value={emailValue}
                  onChange={(event) =>
                    setEmailEdits((prev) => ({ ...prev, [app.id]: event.target.value }))
                  }
                  className="max-w-md"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingEmailId === app.id || emailValue === app.email}
                  onClick={() => saveEmail(app.id, emailValue)}
                >
                  {savingEmailId === app.id ? "Saving..." : "Save Email"}
                </Button>
              </div>
              {emailInvalid && (
                <p className="flex flex-wrap items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Fix the email address before approving. Use one valid address only.
                    {suggestedEmail && emailValue.trim().toLowerCase() !== suggestedEmail && (
                      <> Suggested: {suggestedEmail}</>
                    )}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {app.admin_notes && !canReview && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Follow-up notes</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{app.admin_notes}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Training & Requirements</Label>
          <div className="flex flex-wrap gap-4">
            {ADMIN_CHECKBOX_FIELDS.filter(({ key }) => relevantRequirementFields.includes(key)).map(
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
        </div>

        {canReview && (
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

            {!isRoleExpansion && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Volunteer roles on approval</p>
                  <p className="text-xs text-muted-foreground">
                    Confirm or adjust the roles this volunteer will receive. Options match the signup
                    form{app.birthday ? " and this applicant's age" : ""}.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {selectableApprovalRoles.map((entry) => {
                    const selected = selectedApprovalRoles.includes(entry.role_id);
                    const missing = missingRequirementsForRole(
                      entry.role_id,
                      requirementSource,
                      roleCatalog
                    );

                    return (
                      <label
                        key={entry.role_id}
                        htmlFor={`approve-role-${app.id}-${entry.role_id}`}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "bg-background hover:bg-muted/40"
                        )}
                      >
                        <Checkbox
                          id={`approve-role-${app.id}-${entry.role_id}`}
                          className="mt-0.5"
                          checked={selected}
                          onCheckedChange={() => toggleApprovalRole(app.id, entry.role_id)}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{entry.label}</p>
                          {entry.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {entry.description}
                            </p>
                          )}
                          {selected && missing.length > 0 && (
                            <p className="text-xs text-amber-800">
                              Needs: {missing.map(requirementLabel).join(", ")}
                            </p>
                          )}
                          {selected && missing.length === 0 && (
                            <p className="text-xs text-green-700">Requirements complete</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5 sm:min-w-[220px]">
                    <Label htmlFor={`approve-team-${app.id}`} className="text-xs">
                      Trap team (optional)
                    </Label>
                    <Select value={approveTeam} onValueChange={setApproveTeam}>
                      <SelectTrigger id={`approve-team-${app.id}`} className="w-full sm:w-[240px]">
                        <SelectValue placeholder="No team assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team assignment</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedApprovalRoles.length === 0
                      ? "Select at least one role to approve."
                      : `${selectedApprovalRoles.length} role${selectedApprovalRoles.length === 1 ? "" : "s"} selected`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                size="sm"
                disabled={actingId === app.id || emailInvalid || !rolesReady}
                onClick={() => handleApproveApplication(app, context, emailValue)}
              >
                <Check className="h-4 w-4 mr-1" />
                {actingId === app.id
                  ? "Working..."
                  : rolesReady
                    ? isRoleExpansion
                      ? "Approve role expansion"
                      : "Approve"
                    : selectedApprovalRoles.length === 0
                      ? "Select at least one role"
                      : "Complete requirements first"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(app.id, "followup", notesForApp(app))}
                disabled={actingId === app.id}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {app.status === "needs_followup" ? "Update Follow-up" : "Follow-up"}
              </Button>
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

        {app.status === "approved" && (
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
    const { linkedProfile, rolesToReview, canReview, isRoleExpansion, approvedRoles } = context;

    return (
      <>
        <div>
          <p className="font-medium">{app.full_name}</p>
          <p className="text-sm text-muted-foreground">
            {app.email} · Applied {formatDate(app.created_at)}
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
        {canReview && (
          <Badge
            variant="outline"
            className={context.rolesReady ? "text-green-700 border-green-300" : "text-amber-800 border-amber-300 bg-amber-50"}
          >
            {context.rolesReady ? "Ready to approve" : "Requirements pending"}
          </Badge>
        )}
      </>
    );
  }

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

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {filter === "needs_attention"
            ? "No applications need attention right now."
            : "No applications match your filters."}
        </p>
      )}

      {viewMode === "cards" && filtered.map((app) => {
        const context = getApplicationReviewContext(
          app,
          profilesByEmail,
          roleRequests,
          roleCatalog
        );

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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewingApplication(app)}
                  >
                    Review
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}

      {viewMode === "table" && filtered.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors"
              onClick={() =>
                setNameSort((current) => (current === "asc" ? "desc" : "asc"))
              }
            >
              Applicant
              {nameSort === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : nameSort === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
            <span>Status</span>
            <span>Attention</span>
            <span>Roles / requirements</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y">
            {filtered.map((app) => {
              const context = getApplicationReviewContext(
                app,
                profilesByEmail,
                roleRequests,
                roleCatalog
              );

              return (
                <div
                  key={app.id}
                  className={cn(
                    "grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center",
                    context.isRoleExpansion && !context.rolesReady && "bg-amber-50/60"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{app.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{app.email}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      Applied {formatDate(app.created_at)}
                    </p>
                  </div>
                  <div>
                    <Badge className={STATUS_COLORS[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                  </div>
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
                      <p className="text-xs text-muted-foreground line-clamp-2">{context.attentionDetail}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {context.rolesToReview.map((role) => {
                      const missing = context.missingByRole[role] ?? [];
                      return (
                        <Badge
                          key={role}
                          variant={missing.length === 0 ? "secondary" : "outline"}
                          className={cn(
                            "text-[11px]",
                            missing.length > 0 && "border-amber-400 text-amber-900 bg-amber-50"
                          )}
                        >
                          {roleLabel(role)}
                        </Badge>
                      );
                    })}
                    {!context.rolesReady && context.allMissingRequirements.length > 0 && (
                      <span className="text-xs text-amber-900 w-full">
                        Needs: {context.allMissingRequirements.map(requirementLabel).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="md:text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewingApplication(app)}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={reviewingApplication != null}
        onOpenChange={(open) => !open && setReviewingApplication(null)}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
