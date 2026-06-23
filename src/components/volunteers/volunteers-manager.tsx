"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { VolunteerApplication, TrapTeam, UserRole, VolunteerRole } from "@/lib/types";
import { ChevronDown, ChevronUp, Check, X, MessageCircle, Trash2 } from "lucide-react";

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [updatingField, setUpdatingField] = useState<string | null>(null);

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

  async function handleAction(id: string, action: "approve" | "reject" | "followup") {
    setActionError(null);
    setActingId(id);
    if (action === "approve") {
      const response = await fetch("/api/volunteers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: id,
          role: approveRole,
          teamId: approveTeam === "none" ? null : approveTeam,
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        setActionError(result?.error ?? "Unable to approve volunteer");
        return;
      }
    } else {
      const response = await fetch("/api/volunteers/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: id,
          status: action === "reject" ? "rejected" : "needs_followup",
        }),
      });
      const result = await response.json().catch(() => null);
      setActingId(null);
      if (!response.ok) {
        setActionError(result?.error ?? "Unable to update application");
        return;
      }
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
      setActionError(result?.error ?? "Unable to update application");
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
      setActionError(result?.error ?? "Unable to delete application");
      return;
    }
    if (expanded === id) setExpanded(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
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

      {filtered.map((app) => (
        <Card key={app.id}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpanded(expanded === app.id ? null : app.id)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <CardTitle className="text-base">{app.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{app.email} · Applied {formatDate(app.created_at)}</p>
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

              {app.status === "pending" && (
                <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
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
                  <Button size="sm" onClick={() => handleAction(app.id, "approve")}>
                    <Check className="h-4 w-4 mr-1" />{actingId === app.id ? "Working..." : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(app.id, "followup")} disabled={actingId === app.id}>
                    <MessageCircle className="h-4 w-4 mr-1" />Follow-up
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAction(app.id, "reject")} disabled={actingId === app.id}>
                    <X className="h-4 w-4 mr-1" />Reject
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
                {actionError && <p className="text-sm text-destructive">{actionError}</p>}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
