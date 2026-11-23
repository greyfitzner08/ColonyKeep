"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseFollowUpAlert } from "@/components/cases/case-follow-up-alert";
import { CaseHistorySection } from "@/components/cases/case-history-section";
import { InfoRow } from "@/components/cases/case-detail-fields";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { NeedsClinicDateActions } from "@/components/cases/needs-clinic-date-actions";
import {
  applyCaseLifecycleStatus,
  CASE_LIFECYCLE_STATUSES,
  getCaseLifecycleLabel,
  LIFECYCLE_STATUS_COLORS,
  toCaseLifecycleStatus,
  type CaseLifecycleStatus,
} from "@/lib/cases/statuses";
import { CASE_CLOSE_OUTCOMES } from "@/lib/cases/case-closure";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { formatDateTime, cn } from "@/lib/utils";
import type { HelpRequest, HistoryNoteColor, HistoryEntry, UserRole } from "@/lib/types";
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
  resolvingFollowUp?: boolean;
  canResolveFollowUp?: boolean;
  onAddNote: (note: {
    text: string;
    highlighted: boolean;
    follow_up: boolean;
    text_color: HistoryNoteColor;
  }) => Promise<boolean>;
  onResolveFollowUp?: (entry: HistoryEntry) => Promise<boolean>;
  onResolveAllFollowUps?: () => Promise<boolean>;
  onChange: (next: HelpRequest) => void;
  onUpdateClosure?: (next: {
    outcome?: string | null;
    closure_notes?: string | null;
  }) => Promise<boolean> | boolean | void;
  onCloseCase: () => void;
  canCloseCase: boolean;
  readOnly?: boolean;
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
  resolvingFollowUp = false,
  canResolveFollowUp = false,
  onAddNote,
  onResolveFollowUp,
  onResolveAllFollowUps,
  onChange,
  onUpdateClosure,
  onCloseCase,
  canCloseCase,
  readOnly = false,
}: CaseIntakeSectionProps) {
  const lifecycle = toCaseLifecycleStatus(hr);
  const caseAlreadyClosed = Boolean(hr.closed_at);
  const [draftOutcome, setDraftOutcome] = useState(hr.outcome ?? "");
  const [draftClosureNotes, setDraftClosureNotes] = useState(hr.closure_notes ?? "");
  const [updatingClosure, setUpdatingClosure] = useState(false);

  useEffect(() => {
    setDraftOutcome(hr.outcome ?? "");
    setDraftClosureNotes(hr.closure_notes ?? "");
  }, [hr.id, hr.outcome, hr.closure_notes, hr.closed_at]);

  const closureDraftDirty =
    caseAlreadyClosed &&
    ((draftOutcome || null) !== (hr.outcome ?? null) ||
      (draftClosureNotes || null) !== (hr.closure_notes ?? null));

  async function handleUpdateClosure() {
    if (!onUpdateClosure || !caseAlreadyClosed || updatingClosure) return;
    setUpdatingClosure(true);
    try {
      await onUpdateClosure({
        outcome: draftOutcome || null,
        closure_notes: draftClosureNotes || null,
      });
    } finally {
      setUpdatingClosure(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-lg border bg-muted/30 px-4 py-2">
        {readOnly ? (
          <p className="text-xs text-muted-foreground">Claim this case to edit intake fields.</p>
        ) : (
          <SaveIndicator state={saveState} />
        )}
      </div>

      {canReviewMedical && !readOnly && (
        <CaseCollapsibleSection title="Medical review" defaultOpen={false}>
          <MedicalReviewActions helpRequest={hr} />
        </CaseCollapsibleSection>
      )}

      {!readOnly ? (
        <CaseCollapsibleSection
          title="Clinic date"
          defaultOpen={Boolean(hr.needs_clinic_date)}
        >
          <NeedsClinicDateActions helpRequest={hr} />
        </CaseCollapsibleSection>
      ) : null}

      <CaseCollapsibleSection title="Case management" defaultOpen>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={lifecycle}
                onValueChange={(v) => {
                  if (v === "closed") return;
                  onChange({
                    ...hr,
                    status: applyCaseLifecycleStatus(hr.status, v as CaseLifecycleStatus),
                  });
                }}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_LIFECYCLE_STATUSES.filter((status) => status.value !== "closed").map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                  {lifecycle === "closed" ? (
                    <SelectItem value="closed" disabled>
                      Closed
                    </SelectItem>
                  ) : null}
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
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {sortTrapTeams(teams)
                    .filter((t) => t.name.trim().toLowerCase() !== "trap school")
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <dl>
            <InfoRow label="Case #" value={hr.case_number} alwaysShow />
            <InfoRow
              label="Claimed by"
              value={hr.claimed_by_name ?? hr.claimed_by_email}
            />
            <InfoRow label="Opened" value={formatDateTime(hr.created_at)} alwaysShow />
            <InfoRow label="Closed" value={hr.closed_at ? formatDateTime(hr.closed_at) : null} />
          </dl>
        </div>
      </CaseCollapsibleSection>

      {onResolveAllFollowUps && (
        <CaseFollowUpAlert
          helpRequest={hr}
          resolving={resolvingFollowUp}
          onResolveAll={() => void onResolveAllFollowUps()}
        />
      )}

      <CaseHistorySection
        entries={hr.history_log ?? []}
        canAddNote={canAddNote && !readOnly}
        canResolveFollowUp={canResolveFollowUp && !readOnly}
        authorName={noteAuthorName}
        authorEmail={noteAuthorEmail}
        saving={savingNote}
        resolvingFollowUp={resolvingFollowUp}
        saveError={noteSaveError}
        mode="notes"
        onAddNote={onAddNote}
        onResolveFollowUp={onResolveFollowUp}
      />

      {canCloseCase && !readOnly && (
        <CaseCollapsibleSection title="Close case" defaultOpen={false}>
          <div className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label>Close case — outcome</Label>
              <Select
                value={caseAlreadyClosed ? draftOutcome : (hr.outcome ?? "")}
                onValueChange={(value) => {
                  if (caseAlreadyClosed) {
                    setDraftOutcome(value);
                    return;
                  }
                  onChange({ ...hr, outcome: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_CLOSE_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Closure notes</Label>
              <Textarea
                value={caseAlreadyClosed ? draftClosureNotes : (hr.closure_notes ?? "")}
                onChange={(event) => {
                  const closure_notes = event.target.value;
                  if (caseAlreadyClosed) {
                    setDraftClosureNotes(closure_notes);
                    return;
                  }
                  onChange({ ...hr, closure_notes });
                }}
                rows={3}
                placeholder="Recorded when closing the case…"
              />
            </div>
            {hr.closed_at ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Closed {formatDateTime(hr.closed_at)}.
                </p>
                <Button
                  type="button"
                  onClick={() => void handleUpdateClosure()}
                  disabled={!closureDraftDirty || updatingClosure || saveState === "saving"}
                >
                  {updatingClosure || saveState === "saving" ? "Updating…" : "Update"}
                </Button>
              </div>
            ) : (
              <Button onClick={onCloseCase} variant="destructive" disabled={saveState === "saving"}>
                <Trash2 className="h-4 w-4 mr-2" />
                Close case
              </Button>
            )}
          </div>
        </CaseCollapsibleSection>
      )}
    </div>
  );
}
