"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import { formatDate } from "@/lib/utils";
import type { VolunteerApplication, TrapTeam, UserRole, VolunteerRole } from "@/lib/types";
import { ChevronDown, ChevronUp, Check, X, MessageCircle, Trash2, AlertTriangle } from "lucide-react";

interface VolunteersManagerProps {
  applications: VolunteerApplication[];
  teams: TrapTeam[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  needs_followup: "bg-orange-100 text-orange-800",
};

const ADMIN_CHECKBOX_FIELDS = [
  { key: "liability_waiver_signed", label: "Liability Waiver" },
  { key: "policy_signed", label: "Policy Signed" },
  { key: "shadow_completed", label: "Shadow Completed" },
  { key: "intake_training", label: "Intake Training" },
  { key: "tnvr_certificate_uploaded", label: "TNVR Certificate" },
  { key: "event_crash_course", label: "Event Crash Course" },
] as const;

const REVIEWABLE_STATUSES = new Set(["pending", "needs_followup"]);

function roleLabel(role: VolunteerRole) {
  return VOLUNTEER_ROLES.find((entry) => entry.value === role)?.label ?? role;
}

export function VolunteersManager({ applications, teams }: VolunteersManagerProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [approveRole, setApproveRole] = useState<UserRole>("volunteer");
  const [approveTeam, setApproveTeam] = useState<string>("none");
  const [actionError, setActionError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("volunteerActionError");
  });
  const [actingId, setActingId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [emailEdits, setEmailEdits] = useState<Record<string, string>>({});
  const [savingEmailId, setSavingEmailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = filter === "all"
      ? applications
      : applications.filter((application) => application.status === filter);

    if (interestFilter !== "all") {
      results = results.filter((application) =>
        (application.roles_requested ?? []).includes(interestFilter as VolunteerRole)
      );
    }

    return [...results].sort((a, b) => {
      const aRoles = (a.roles_requested ?? []).map(roleLabel).join(", ");
      const bRoles = (b.roles_requested ?? []).map(roleLabel).join(", ");
      if (aRoles !== bRoles) return aRoles.localeCompare(bRoles);
      return a.full_name.localeCompare(b.full_name);
    });
  }, [applications, filter, interestFilter]);

  function notesForApp(app: VolunteerApplication) {
    return actionNotes[app.id] ?? app.admin_notes ?? "";
  }

  function emailForApp(app: VolunteerApplication) {
    return emailEdits[app.id] ?? app.email;
  }

  function showActionError(message: string) {
    setActionError(message);
    sessionStorage.setItem("volunteerActionError", message);
  }

  function clearActionError() {
    setActionError(null);
    sessionStorage.removeItem("volunteerActionError");
  }

  async function handleAction(
    id: string,
    action: "approve" | "reject" | "followup",
    adminNotes?: string,
    email?: string
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
          role: approveRole,
          teamId: approveTeam === "none" ? null : approveTeam,
          email: emailToUse,
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

  async function saveEmail(applicationId: string, email: string) {
    setActionError(null);
    sessionStorage.removeItem("volunteerActionError");
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
    setActionError(null);
    sessionStorage.removeItem("volunteerActionError");
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
    value: boolean
  ) {
    setActionError(null);
    setUpdatingField(`${applicationId}:${field}`);
    const response = await fetch("/api/volunteers/update-application", {
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
    if (expanded === id) setExpanded(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            actionError.startsWith("Volunteer approved")
              ? "border-orange-200 bg-orange-50 text-orange-900"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role="alert"
        >
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
          </SelectContent>
        </Select>

        <Select value={interestFilter} onValueChange={setInterestFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Volunteer interest" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interests</SelectItem>
            {VOLUNTEER_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No applications match your filters.</p>
      )}

      {filtered.map((app) => {
        const emailValue = emailForApp(app);
        const emailInvalid = Boolean(getEmailValidationError(emailValue));
        const suggestedEmail = parsePrimaryEmail(emailValue);
        const canReview = REVIEWABLE_STATUSES.has(app.status);

        return (
          <Card key={app.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpanded(expanded === app.id ? null : app.id)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div>
                    <CardTitle className="text-base">{app.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {app.email} · Applied {formatDate(app.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(app.roles_requested ?? []).map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {roleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={STATUS_COLORS[app.status]}>{app.status.replace(/_/g, " ")}</Badge>
                  {expanded === app.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
            {expanded === app.id && (
              <CardContent className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Phone:</strong> {app.phone}</p>
                    <p><strong>Birthday:</strong> {app.birthday ? formatDate(app.birthday) : "—"}</p>
                    <p><strong>Roles:</strong> {(app.roles_requested ?? []).map(roleLabel).join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p><strong>Experience:</strong> {app.prior_experience ?? "—"}</p>
                    <p><strong>How heard:</strong> {app.how_heard ?? "—"}</p>
                  </div>
                </div>

                {canReview && (
                  <div className="space-y-2 rounded-md border p-3">
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
                          {suggestedEmail &&
                            emailValue.trim().toLowerCase() !== suggestedEmail && (
                              <> Suggested: {suggestedEmail}</>
                            )}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {app.admin_notes && !canReview && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Follow-up notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{app.admin_notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Training & Requirements</Label>
                  <div className="flex flex-wrap gap-4">
                    {ADMIN_CHECKBOX_FIELDS.map(({ key, label }) => {
                      const fieldKey = `${app.id}:${key}`;
                      const checked = Boolean(app[key as keyof VolunteerApplication]);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={fieldKey}
                            checked={checked}
                            disabled={updatingField === fieldKey}
                            onCheckedChange={(value) =>
                              updateApplicationField(app.id, key, value === true)
                            }
                          />
                          <Label htmlFor={fieldKey} className="text-sm font-normal">
                            {label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {canReview && (
                  <div className="space-y-3 border-t pt-4">
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

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Role on Approval</Label>
                        <Select value={approveRole} onValueChange={(v) => setApproveRole(v as UserRole)}>
                          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                            <SelectItem value="trap_team_lead">Trap Team Lead</SelectItem>
                            <SelectItem value="inquiry_team">Inquiry Team</SelectItem>
                            <SelectItem value="clinic_coordination">Clinic Coordination</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Team</Label>
                        <Select value={approveTeam} onValueChange={setApproveTeam}>
                          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Optional" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        disabled={actingId === app.id || emailInvalid}
                        onClick={() => handleAction(app.id, "approve", undefined, emailValue)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {actingId === app.id ? "Working..." : "Approve"}
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
                        onClick={() => handleAction(app.id, "reject", notesForApp(app))}
                        disabled={actingId === app.id}
                      >
                        <X className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                    {actionError && expanded === app.id && (
                      <p
                        className={`text-sm ${
                          actionError.startsWith("Volunteer approved")
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
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
