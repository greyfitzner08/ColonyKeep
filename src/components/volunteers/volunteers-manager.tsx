"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { VolunteerApplication, TrapTeam, UserRole } from "@/lib/types";
import { ChevronDown, ChevronUp, Check, X, MessageCircle } from "lucide-react";

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

export function VolunteersManager({ applications, teams }: VolunteersManagerProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [approveRole, setApproveRole] = useState<UserRole>("volunteer");
  const [approveTeam, setApproveTeam] = useState<string>("");

  const filtered = filter === "all"
    ? applications
    : applications.filter((a) => a.status === filter);

  async function handleAction(id: string, action: "approve" | "reject" | "followup") {
    if (action === "approve") {
      await fetch("/api/volunteers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: id,
          role: approveRole,
          teamId: approveTeam || null,
        }),
      });
    } else {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase
        .from("volunteer_applications")
        .update({
          status: action === "reject" ? "rejected" : "needs_followup",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
        </SelectContent>
      </Select>

      {filtered.map((app) => (
        <Card key={app.id}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpanded(expanded === app.id ? null : app.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{app.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{app.email} · Applied {formatDate(app.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
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
                  <p><strong>Birthday:</strong> {formatDate(app.birthday)}</p>
                  <p><strong>Roles:</strong> {app.roles_requested.map((r) => VOLUNTEER_ROLES.find((vr) => vr.value === r)?.label ?? r).join(", ")}</p>
                  <p><strong>Availability:</strong> {app.availability ?? "—"}</p>
                </div>
                <div>
                  <p><strong>Why volunteer:</strong> {app.why_volunteer}</p>
                  <p><strong>Experience:</strong> {app.prior_experience ?? "—"}</p>
                  <p><strong>How heard:</strong> {app.how_heard ?? "—"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {[
                  { key: "liability_waiver_signed", label: "Liability Waiver" },
                  { key: "policy_signed", label: "Policy Signed" },
                  { key: "shadow_completed", label: "Shadow Completed" },
                  { key: "intake_training", label: "Intake Training" },
                  { key: "tnvr_certificate_uploaded", label: "TNVR Certificate" },
                  { key: "event_crash_course", label: "Event Crash Course" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox checked={app[key as keyof VolunteerApplication] as boolean} disabled />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
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
                        <SelectItem value="">None</SelectItem>
                        {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => handleAction(app.id, "approve")}>
                    <Check className="h-4 w-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(app.id, "followup")}>
                    <MessageCircle className="h-4 w-4 mr-1" />Follow-up
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAction(app.id, "reject")}>
                    <X className="h-4 w-4 mr-1" />Reject
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
