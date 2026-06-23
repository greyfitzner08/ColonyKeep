"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailField, DetailSection } from "@/components/cases/case-detail-fields";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { getStatusOptionsForRole } from "@/lib/cases/statuses";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest, HelpRequestStatus, UserRole, FollowUpEntry } from "@/lib/types";
import { Trash2 } from "lucide-react";

interface CaseIntakeSectionProps {
  helpRequest: HelpRequest;
  teams: { id: string; name: string; zip_codes: string[] }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
  saving: boolean;
  followUpNote: string;
  onFollowUpNoteChange: (value: string) => void;
  onAddFollowUp: () => void;
  onChange: (next: HelpRequest) => void;
  onSave: () => void;
  onCloseCase: () => void;
}

export function CaseIntakeSection({
  helpRequest: hr,
  teams,
  userRole,
  canReviewMedical,
  saving,
  followUpNote,
  onFollowUpNoteChange,
  onAddFollowUp,
  onChange,
  onSave,
  onCloseCase,
}: CaseIntakeSectionProps) {
  const statusOptions = getStatusOptionsForRole(userRole);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Intake Team — Case Management</CardTitle>
          <CardDescription>
            Status, assignments, follow-ups, and notes managed by the intake team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {canReviewMedical && <MedicalReviewActions helpRequest={hr} />}

          <DetailSection title="Workflow">
            <div className="space-y-2">
              <Label>Case Status</Label>
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
              <Label>Priority</Label>
              <Select
                value={hr.priority ?? "normal"}
                onValueChange={(v) => onChange({ ...hr, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned Trap Team</Label>
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
              <p className="text-xs text-muted-foreground">
                Auto-assigned from colony ZIP {hr.colony_zip || "—"} when saved.
              </p>
            </div>

            <DetailField alwaysShow label="Assigned To (legacy CSV)" value={hr.assigned_to} />
            <DetailField alwaysShow label="Claimed By" value={hr.claimed_by_name ?? hr.claimed_by_email} />
            <DetailField alwaysShow label="Trapper / Trap Loaner" value={hr.trapper_trap_loaner} />
            <DetailField alwaysShow label="Case Number" value={hr.case_number} />
            <DetailField alwaysShow label="Date Opened" value={formatDateTime(hr.created_at)} />
            <DetailField alwaysShow label="Date Closed" value={hr.closed_at ? formatDateTime(hr.closed_at) : null} />
          </DetailSection>

          <DetailSection title="Follow-up">
            <div className="space-y-2">
              <Label>Follow-up Due Date</Label>
              <Input
                type="date"
                value={hr.follow_up_due_date ?? ""}
                onChange={(e) => onChange({ ...hr, follow_up_due_date: e.target.value || null })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 space-y-3">
              <Label>Log Follow-up</Label>
              <Textarea
                value={followUpNote}
                onChange={(e) => onFollowUpNoteChange(e.target.value)}
                rows={3}
                placeholder="Log a follow-up call attempt, voicemail, or conversation..."
              />
              <Button type="button" variant="outline" size="sm" onClick={onAddFollowUp}>
                Add Follow-up Entry
              </Button>
              {(hr.follow_up_log ?? []).length > 0 && (
                <div className="space-y-2 pt-2">
                  {(hr.follow_up_log ?? []).slice().reverse().map((entry: FollowUpEntry) => (
                    <div key={entry.id} className="rounded-md border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)} — {entry.author_name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{entry.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Intake Notes">
            <div className="sm:col-span-2 lg:col-span-3 space-y-2">
              <Label>Additional Notes (from CSV / intake team)</Label>
              <Textarea
                value={hr.additional_notes ?? ""}
                onChange={(e) => onChange({ ...hr, additional_notes: e.target.value })}
                rows={4}
                placeholder="Notes taken by intake staff..."
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 space-y-2">
              <Label>Closure Notes</Label>
              <Textarea
                value={hr.closure_notes ?? ""}
                onChange={(e) => onChange({ ...hr, closure_notes: e.target.value })}
                rows={3}
                placeholder="Notes recorded when closing the case..."
              />
            </div>
          </DetailSection>

          <DetailSection title="Outcomes">
            <DetailField alwaysShow label="Outcome" value={hr.outcome} />
            <DetailField alwaysShow label="Resolution" value={hr.resolution} />
            <DetailField alwaysShow label="Number of Cats TNVR'd" value={hr.outcome_tnvr_count} />
            <DetailField alwaysShow label="Number Taken to ACC" value={hr.outcome_acc_count} />
            <DetailField alwaysShow label="Number Taken into Foster" value={hr.outcome_foster_count} />
            <DetailField alwaysShow label="Number Other Outcome" value={hr.outcome_other_count} />
            <DetailField alwaysShow label="# of Cats/Kittens Remaining" value={hr.cats_remaining} />

            <div className="space-y-2">
              <Label>Close Case — Outcome</Label>
              <Select
                value={hr.outcome ?? ""}
                onValueChange={(v) => onChange({ ...hr, outcome: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tnvr_complete">TNVR Complete</SelectItem>
                  <SelectItem value="partial_tnvr">Partial TNVR</SelectItem>
                  <SelectItem value="referred_elsewhere">Referred Elsewhere</SelectItem>
                  <SelectItem value="colony_relocated">Colony Relocated</SelectItem>
                  <SelectItem value="unable_to_assist">Unable to Assist</SelectItem>
                  <SelectItem value="duplicate">Duplicate Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DetailSection>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Intake Changes"}
            </Button>
            <Button onClick={onCloseCase} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Close Case
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
