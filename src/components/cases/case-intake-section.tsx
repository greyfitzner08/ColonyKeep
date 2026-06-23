"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoCard, InfoRow } from "@/components/cases/case-detail-fields";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { getStatusOptionsForRole, isIntakeQueueStatus } from "@/lib/cases/statuses";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest, HelpRequestStatus, UserRole, FollowUpEntry } from "@/lib/types";
import { ArrowRight, Trash2 } from "lucide-react";

interface CaseIntakeSectionProps {
  helpRequest: HelpRequest;
  teams: { id: string; name: string; zip_codes: string[] }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
  canRouteToTrap: boolean;
  saving: boolean;
  routing: boolean;
  followUpNote: string;
  onFollowUpNoteChange: (value: string) => void;
  onAddFollowUp: () => void;
  onChange: (next: HelpRequest) => void;
  onSave: () => void;
  onRouteToTrap: () => void;
  onCloseCase: () => void;
}

export function CaseIntakeSection({
  helpRequest: hr,
  teams,
  userRole,
  canReviewMedical,
  canRouteToTrap,
  saving,
  routing,
  followUpNote,
  onFollowUpNoteChange,
  onAddFollowUp,
  onChange,
  onSave,
  onRouteToTrap,
  onCloseCase,
}: CaseIntakeSectionProps) {
  const statusOptions = getStatusOptionsForRole(userRole);
  const showRouteButton = canRouteToTrap && isIntakeQueueStatus(hr.status);
  const hasOutcomes =
    hr.outcome ||
    hr.resolution ||
    hr.outcome_tnvr_count > 0 ||
    hr.outcome_acc_count > 0 ||
    hr.outcome_foster_count > 0 ||
    hr.outcome_other_count > 0 ||
    hr.cats_remaining > 0;

  return (
    <div className="space-y-6">
      {canReviewMedical && (
        <Card>
          <CardContent className="pt-6">
            <MedicalReviewActions helpRequest={hr} />
          </CardContent>
        </Card>
      )}

      {showRouteButton && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold">Ready for trapping?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sends this case to the trap queue and assigns a team from colony ZIP{" "}
                {hr.colony_zip || "—"}.
              </p>
            </div>
            <Button onClick={onRouteToTrap} disabled={routing || saving}>
              <ArrowRight className="h-4 w-4 mr-2" />
              {routing ? "Routing…" : "Route to Trap Team"}
            </Button>
          </CardContent>
        </Card>
      )}

      {hr.status === "routed_to_trap_team" && (
        <Card className="bg-muted/40">
          <CardContent className="pt-6 text-base">
            In trap queue{hr.assigned_team_name ? ` · ${hr.assigned_team_name}` : ""}
          </CardContent>
        </Card>
      )}

      <InfoCard title="Case management">
        <div className="grid gap-4 sm:grid-cols-2 pb-4 border-b border-border/50">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={hr.status}
              onValueChange={(v) => onChange({ ...hr, status: v as HelpRequestStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trap team</Label>
            <Select
              value={hr.assigned_team_id ?? "none"}
              onValueChange={(v) => {
                const team = teams.find((t) => t.id === v);
                onChange({
                  ...hr,
                  assigned_team_id: v === "none" ? null : v,
                  assigned_team_name: team?.name ?? null,
                });
              }}
              disabled={userRole === "inquiry_team"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <InfoRow label="Case #" value={hr.case_number} alwaysShow />
        <InfoRow label="Claimed by" value={hr.claimed_by_name ?? hr.claimed_by_email} />
        <InfoRow label="Opened" value={formatDateTime(hr.created_at)} alwaysShow />
        <InfoRow label="Closed" value={hr.closed_at ? formatDateTime(hr.closed_at) : null} />
        <InfoRow label="Assigned to (legacy)" value={hr.assigned_to} />
        <InfoRow label="Trapper / trap loaner" value={hr.trapper_trap_loaner} />
      </InfoCard>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Due date</Label>
            <Input
              type="date"
              value={hr.follow_up_due_date ?? ""}
              onChange={(e) => onChange({ ...hr, follow_up_due_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label>Log a call or contact</Label>
            <Textarea
              value={followUpNote}
              onChange={(e) => onFollowUpNoteChange(e.target.value)}
              rows={3}
              placeholder="What happened on this follow-up?"
            />
            <Button type="button" variant="outline" size="sm" onClick={onAddFollowUp}>
              Add entry
            </Button>
          </div>
          {(hr.follow_up_log ?? []).length > 0 && (
            <div className="space-y-2 pt-2">
              {(hr.follow_up_log ?? []).slice().reverse().map((entry: FollowUpEntry) => (
                <div key={entry.id} className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(entry.timestamp)} · {entry.author_name}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{entry.notes}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Intake notes</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label>Staff notes</Label>
            <Textarea
              value={hr.additional_notes ?? ""}
              onChange={(e) => onChange({ ...hr, additional_notes: e.target.value })}
              rows={4}
              placeholder="Notes from intake calls and review…"
            />
          </div>
          <div className="space-y-2">
            <Label>Closure notes</Label>
            <Textarea
              value={hr.closure_notes ?? ""}
              onChange={(e) => onChange({ ...hr, closure_notes: e.target.value })}
              rows={3}
              placeholder="Recorded when closing the case…"
            />
          </div>
        </CardContent>
      </Card>

      {hasOutcomes && (
        <InfoCard title="Outcomes">
          <InfoRow label="Outcome" value={hr.outcome} />
          <InfoRow label="Resolution" value={hr.resolution} />
          <InfoRow label="TNVR'd" value={hr.outcome_tnvr_count} />
          <InfoRow label="To ACC" value={hr.outcome_acc_count} />
          <InfoRow label="To foster" value={hr.outcome_foster_count} />
          <InfoRow label="Other" value={hr.outcome_other_count} />
          <InfoRow label="Remaining" value={hr.cats_remaining} />
        </InfoCard>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Close case — outcome</Label>
            <Select value={hr.outcome ?? ""} onValueChange={(v) => onChange({ ...hr, outcome: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tnvr_complete">TNVR Complete</SelectItem>
                <SelectItem value="partial_tnvr">Partial TNVR</SelectItem>
                <SelectItem value="referred_elsewhere">Referred Elsewhere</SelectItem>
                <SelectItem value="colony_relocated">Colony Relocated</SelectItem>
                <SelectItem value="unable_to_assist">Unable to Assist</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSave} disabled={saving || routing}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button onClick={onCloseCase} variant="destructive" disabled={routing}>
              <Trash2 className="h-4 w-4 mr-2" />
              Close case
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
