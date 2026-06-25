"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
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
    <div className="space-y-4 sm:space-y-6">
      {canReviewMedical && (
        <CaseCollapsibleSection title="Medical review">
          <MedicalReviewActions helpRequest={hr} />
        </CaseCollapsibleSection>
      )}

      {showRouteButton && (
        <CaseCollapsibleSection title="Route to trap team" defaultOpen>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Sends this case to the trap queue and assigns a team from colony ZIP{" "}
              {hr.colony_zip || "—"}.
            </p>
            <Button onClick={onRouteToTrap} disabled={routing || saving} className="shrink-0">
              <ArrowRight className="h-4 w-4 mr-2" />
              {routing ? "Routing…" : "Route to Trap Team"}
            </Button>
          </div>
        </CaseCollapsibleSection>
      )}

      {hr.status === "routed_to_trap_team" && (
        <CaseCollapsibleSection title="Trap queue status" defaultOpen={false}>
          <p className="text-base">
            In trap queue{hr.assigned_team_name ? ` · ${hr.assigned_team_name}` : ""}
          </p>
        </CaseCollapsibleSection>
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

      <CaseCollapsibleSection title="Colony feeder">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Contact details for the person feeding the colony when they are not the reporter.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="feeder-name">Name</Label>
              <Input
                id="feeder-name"
                value={hr.feeder_name ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_name: e.target.value || null })}
                placeholder="Feeder full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-phone">Phone</Label>
              <Input
                id="feeder-phone"
                type="tel"
                value={hr.feeder_phone ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_phone: e.target.value || null })}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-email">Email</Label>
              <Input
                id="feeder-email"
                type="email"
                value={hr.feeder_email ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_email: e.target.value || null })}
                placeholder="feeder@example.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="feeder-street">Street address</Label>
              <Input
                id="feeder-street"
                value={hr.feeder_street ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_street: e.target.value || null })}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-city">City</Label>
              <Input
                id="feeder-city"
                value={hr.feeder_city ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_city: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-state">State</Label>
              <Input
                id="feeder-state"
                value={hr.feeder_state ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_state: e.target.value || null })}
                placeholder="NC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-zip">ZIP</Label>
              <Input
                id="feeder-zip"
                value={hr.feeder_zip ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_zip: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeder-county">County</Label>
              <Input
                id="feeder-county"
                value={hr.feeder_county ?? ""}
                onChange={(e) => onChange({ ...hr, feeder_county: e.target.value || null })}
              />
            </div>
          </div>
          {hr.feeder_if_not && !hr.feeder_name && (
            <div className="space-y-2">
              <Label>Legacy feeder note</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hr.feeder_if_not}</p>
            </div>
          )}
        </div>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Follow-up">
        <div className="space-y-4">
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
        </div>
      </CaseCollapsibleSection>

      <CaseCollapsibleSection title="Intake notes">
        <div className="space-y-4">
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
        </div>
      </CaseCollapsibleSection>

      {hasOutcomes && (
        <InfoCard title="Outcomes" defaultOpen={false}>
          <InfoRow label="Outcome" value={hr.outcome} />
          <InfoRow label="Resolution" value={hr.resolution} />
          <InfoRow label="TNVR'd" value={hr.outcome_tnvr_count} />
          <InfoRow label="To ACC" value={hr.outcome_acc_count} />
          <InfoRow label="To foster" value={hr.outcome_foster_count} />
          <InfoRow label="Other" value={hr.outcome_other_count} />
          <InfoRow label="Remaining" value={hr.cats_remaining} />
        </InfoCard>
      )}

      <CaseCollapsibleSection title="Close case">
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
          <div className="flex flex-wrap gap-3">
            <Button onClick={onSave} disabled={saving || routing}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button onClick={onCloseCase} variant="destructive" disabled={routing}>
              <Trash2 className="h-4 w-4 mr-2" />
              Close case
            </Button>
          </div>
        </div>
      </CaseCollapsibleSection>
    </div>
  );
}
