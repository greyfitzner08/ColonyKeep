"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseHistorySection } from "@/components/cases/case-history-section";
import { InfoRow } from "@/components/cases/case-detail-fields";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { displayColonyNotes } from "@/lib/cases/colony-notes";
import { getInquiryTeamStatusLabel, getStatusOptionsForRole } from "@/lib/cases/statuses";
import { STATUS_COLORS } from "@/lib/constants";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { formatDateTime, cn } from "@/lib/utils";
import type { HelpRequest, HelpRequestStatus, HistoryNoteColor, UserRole } from "@/lib/types";
import { Trash2 } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

interface CaseIntakeSectionProps {
  helpRequest: HelpRequest;
  teams: { id: string; name: string; zip_codes: string[] }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
  canAddNote: boolean;
  noteAuthorName: string;
  noteAuthorEmail: string;
  savingNote?: boolean;
  noteSaveError?: string | null;
  saveState?: SaveState;
  onAddNote: (note: {
    text: string;
    highlighted: boolean;
    follow_up: boolean;
    text_color: HistoryNoteColor;
  }) => Promise<boolean>;
  onChange: (next: HelpRequest) => void;
  onCloseCase: () => void;
  canCloseCase: boolean;
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") {
    return <p className="text-xs text-muted-foreground">Changes save automatically</p>;
  }
  if (state === "saving") {
    return <p className="text-xs text-muted-foreground">Saving…</p>;
  }
  if (state === "saved") {
    return <p className="text-xs text-muted-foreground">Saved</p>;
  }
  return <p className="text-xs text-destructive">Save failed — try editing again</p>;
}

export function CaseIntakeSection({
  helpRequest: hr,
  teams,
  userRole,
  canReviewMedical,
  canAddNote,
  noteAuthorName,
  noteAuthorEmail,
  savingNote = false,
  noteSaveError = null,
  saveState = "idle",
  onAddNote,
  onChange,
  onCloseCase,
  canCloseCase,
}: CaseIntakeSectionProps) {
  const isInquiryTeam = userRole === "inquiry_team";
  const statusOptions = getStatusOptionsForRole(userRole);
  const reporterNotes = displayColonyNotes(hr.intake_notes, hr);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border bg-muted/30 px-4 py-2">
        <SaveIndicator state={saveState} />
      </div>

      {canReviewMedical && (
        <CaseCollapsibleSection title="Medical review" defaultOpen={false}>
          <MedicalReviewActions helpRequest={hr} />
        </CaseCollapsibleSection>
      )}

      <CaseCollapsibleSection title="Case management" defaultOpen>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isInquiryTeam ? (
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex h-10 items-center">
                  <Badge className={cn("text-sm", STATUS_COLORS[hr.status])}>
                    {getInquiryTeamStatusLabel(hr)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated when you claim, mark needs more info, or route to trap team.
                </p>
              </div>
            ) : (
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
            )}
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
                  {sortTrapTeams(teams).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Follow-up due</Label>
              <Input
                type="date"
                value={hr.follow_up_due_date ?? ""}
                onChange={(e) => onChange({ ...hr, follow_up_due_date: e.target.value || null })}
              />
            </div>
          </div>
          <dl>
            <InfoRow label="Case #" value={hr.case_number} alwaysShow />
            <InfoRow label="Claimed by" value={hr.claimed_by_name ?? hr.claimed_by_email} />
            <InfoRow label="Opened" value={formatDateTime(hr.created_at)} alwaysShow />
            <InfoRow label="Closed" value={hr.closed_at ? formatDateTime(hr.closed_at) : null} />
            <InfoRow label="Assigned to (legacy)" value={hr.assigned_to} />
            <InfoRow label="Trapper / trap loaner" value={hr.trapper_trap_loaner} />
          </dl>
        </div>
      </CaseCollapsibleSection>

      {reporterNotes && (
        <CaseCollapsibleSection title="Reporter notes at intake" defaultOpen={false}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{reporterNotes}</p>
        </CaseCollapsibleSection>
      )}

      <CaseHistorySection
        entries={hr.history_log ?? []}
        canAddNote={canAddNote}
        authorName={noteAuthorName}
        authorEmail={noteAuthorEmail}
        saving={savingNote}
        saveError={noteSaveError}
        mode="notes"
        onAddNote={onAddNote}
      />

      {canCloseCase && (
        <CaseCollapsibleSection title="Close case" defaultOpen={false}>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label>Closure notes</Label>
              <Textarea
                value={hr.closure_notes ?? ""}
                onChange={(e) => onChange({ ...hr, closure_notes: e.target.value })}
                rows={3}
                placeholder="Recorded when closing the case…"
              />
            </div>
            <Button onClick={onCloseCase} variant="destructive" disabled={saveState === "saving"}>
              <Trash2 className="h-4 w-4 mr-2" />
              Close case
            </Button>
          </div>
        </CaseCollapsibleSection>
      )}
    </div>
  );
}
