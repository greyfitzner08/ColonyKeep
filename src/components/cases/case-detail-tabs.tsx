"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { findTrapTeamForZip } from "@/lib/cases/assign-team-by-zip";
import { releaseIntakeAssignmentFields } from "@/lib/cases/case-assignment";
import { detectMedicalKeywords, mergeMedicalFlags } from "@/lib/medical-flags";
import { canCloseCase } from "@/lib/cases/case-permissions";
import { normalizeHistoryLog, staffNotesText } from "@/lib/cases/history-log";
import { feederPayload, geocodeFeederIfNeeded } from "@/lib/cases/feeder-fields";
import type {
  HelpRequest,
  Cat,
  Appointment,
  ClinicFix,
  UserRole,
  HistoryNoteColor,
  HistoryEntry,
} from "@/lib/types";
import { CaseReporterSection } from "@/components/cases/case-colony-info-section";
import { CaseColonyTab } from "@/components/cases/case-colony-tab";
import { CaseIntakeSection } from "@/components/cases/case-intake-section";
import { CaseHistorySection } from "@/components/cases/case-history-section";
import { CaseAppointmentsSection } from "@/components/appointments/case-appointments-section";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type SaveState = "idle" | "saving" | "saved" | "error";

interface CaseDetailTabsProps {
  helpRequest: HelpRequest;
  cats: Cat[];
  appointments: Appointment[];
  availableAppointments: Appointment[];
  clinicFixes: ClinicFix[];
  teams: { id: string; name: string; zip_codes: string[] }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
  canAddHistoryNote: boolean;
  canLogClinicFix: boolean;
  userName: string;
  userEmail: string;
  /** When true, intake must claim before editing — show read-only details. */
  readOnly?: boolean;
}

export function CaseDetailTabs({
  helpRequest: initial,
  cats: initialCats,
  appointments,
  availableAppointments,
  clinicFixes,
  teams,
  userRole,
  canReviewMedical,
  canAddHistoryNote,
  canLogClinicFix,
  userName,
  userEmail,
  readOnly = false,
}: CaseDetailTabsProps) {
  const router = useRouter();
  const [hr, setHr] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [intakeSaveState, setIntakeSaveState] = useState<SaveState>("idle");
  const [savingFeeder, setSavingFeeder] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [resolvingFollowUp, setResolvingFollowUp] = useState(false);
  const skipIntakeAutosaveRef = useRef(true);
  const savedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showCloseCase = canCloseCase(userRole);

  useEffect(() => {
    skipIntakeAutosaveRef.current = true;
    setHr({
      ...initial,
      history_log: normalizeHistoryLog(initial.history_log),
    });
    const timer = setTimeout(() => {
      skipIntakeAutosaveRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [initial]);

  useEffect(() => {
    setCats(initialCats);
  }, [initialCats]);

  useEffect(
    () => () => {
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    },
    []
  );

  function markIntakeSaved() {
    setIntakeSaveState("saved");
    if (savedIndicatorTimeoutRef.current) {
      clearTimeout(savedIndicatorTimeoutRef.current);
    }
    savedIndicatorTimeoutRef.current = setTimeout(() => setIntakeSaveState("idle"), 2000);
  }

  function withTeamAssignment(next: HelpRequest): HelpRequest {
    const match = findTrapTeamForZip(next.colony_zip, teams);
    if (!match) return next;
    return {
      ...next,
      assigned_team_id: match.id,
      assigned_team_name: match.name,
    };
  }

  async function persistCase(
    next: HelpRequest,
    medicalFlags = next.medical_flags ?? [],
    options?: { includeStatus?: boolean }
  ) {
    if (readOnly) {
      setSaveError("Claim this case before making changes.");
      return false;
    }

    const supabase = createClient();
    const payload = withTeamAssignment({ ...next, medical_flags: medicalFlags });
    const includeStatus = options?.includeStatus ?? userRole !== "inquiry_team";
    const routedToTrap = includeStatus && payload.status === "routed_to_trap_team";
    const persistedPayload = routedToTrap ? releaseIntakeAssignmentFields(payload) : payload;

    const update: Record<string, unknown> = {
      follow_up_due_date: persistedPayload.follow_up_due_date,
      assigned_team_id: persistedPayload.assigned_team_id,
      assigned_team_name: persistedPayload.assigned_team_name,
      assigned_team: persistedPayload.assigned_team_name,
      closure_notes: persistedPayload.closure_notes,
      outcome: persistedPayload.outcome,
      resolution: persistedPayload.resolution,
      medical_flags: persistedPayload.medical_flags,
    };

    if (includeStatus) {
      update.status = persistedPayload.status;
    }

    if (routedToTrap) {
      update.claimed_by_email = null;
      update.claimed_by_name = null;
      update.assigned_to = null;
    }

    const { error } = await supabase.from("help_requests").update(update).eq("id", hr.id);

    if (error) {
      setSaveError(error.message);
      return false;
    }

    setHr(persistedPayload);
    setSaveError(null);
    router.refresh();
    return true;
  }

  async function saveFeederInfo(next: HelpRequest) {
    if (readOnly) {
      setSaveError("Claim this case before making changes.");
      return;
    }

    setSavingFeeder(true);
    setSaveError(null);
    const supabase = createClient();
    const payload = await geocodeFeederIfNeeded(next);

    const { error } = await supabase
      .from("help_requests")
      .update(feederPayload(payload))
      .eq("id", hr.id);

    setSavingFeeder(false);

    if (error) {
      setSaveError(
        error.message.includes("feeder_")
          ? "Could not save feeder info. Ask an admin to run database migration 028_feeder_fields_map_layers.sql."
          : error.message
      );
      return;
    }

    setHr(payload);
    router.refresh();
  }

  const debouncedSaveFeeder = useDebouncedCallback((next: HelpRequest) => {
    void saveFeederInfo(next);
  }, 800);

  const debouncedSaveIntake = useDebouncedCallback(async (next: HelpRequest) => {
    setIntakeSaveState("saving");
    setSaveError(null);
    const medicalFlags = mergeMedicalFlags(
      next.medical_flags ?? [],
      detectMedicalKeywords(`${next.intake_notes ?? ""}\n${staffNotesText(next.history_log)}`)
    );
    const ok = await persistCase(next, medicalFlags);
    setIntakeSaveState(ok ? "saved" : "error");
    if (ok) markIntakeSaved();
  }, 800);

  const handleIntakeChange = useCallback(
    (next: HelpRequest) => {
      if (readOnly) return;
      setHr(next);
      if (skipIntakeAutosaveRef.current) return;
      debouncedSaveIntake(next);
    },
    [debouncedSaveIntake, readOnly]
  );

  const handleFeederChange = useCallback(
    (next: HelpRequest) => {
      if (readOnly) return;
      setHr(next);
      debouncedSaveFeeder(next);
    },
    [debouncedSaveFeeder, readOnly]
  );

  function addCat(cat: Cat) {
    setCats((current) => [...current, cat]);
  }

  function removeCat(catId: string) {
    setCats((current) => current.filter((cat) => cat.id !== catId));
  }

  function updateCat(updated: Cat) {
    setCats((current) => current.map((cat) => (cat.id === updated.id ? updated : cat)));
    router.refresh();
  }

  async function addHistoryNote(note: {
    text: string;
    highlighted: boolean;
    follow_up: boolean;
    text_color: HistoryNoteColor;
  }): Promise<boolean> {
    setSavingHistory(true);
    setSaveError(null);

    const response = await fetch("/api/help-requests/history-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        help_request_id: hr.id,
        text: note.text,
        highlighted: note.highlighted,
        follow_up: note.follow_up,
        text_color: note.text_color,
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingHistory(false);

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to save history note");
      return false;
    }

    const history_log = normalizeHistoryLog(result.history_log);
    setHr({ ...hr, history_log });
    router.refresh();
    return true;
  }

  async function resolveFollowUp(options?: {
    entry?: HistoryEntry;
    resolveAll?: boolean;
  }): Promise<boolean> {
    setResolvingFollowUp(true);
    setSaveError(null);

    const response = await fetch("/api/help-requests/resolve-follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        help_request_id: hr.id,
        resolve_all: options?.resolveAll ?? false,
        entry_id: options?.entry?.id,
        entry_timestamp: options?.entry?.timestamp,
      }),
    });
    const result = await response.json().catch(() => null);
    setResolvingFollowUp(false);

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to complete follow-up");
      return false;
    }

    setHr({
      ...hr,
      history_log: normalizeHistoryLog(result.history_log),
      follow_up_due_date: result.follow_up_due_date ?? null,
    });
    router.refresh();
    return true;
  }

  async function closeCase() {
    if (!showCloseCase || readOnly) return;
    if (userRole === "inquiry_team") {
      setSaveError("Intake does not close cases. Route the case to a trap team instead.");
      return;
    }

    setIntakeSaveState("saving");
    setSaveError(null);

    const response = await fetch("/api/help-requests/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId: hr.id,
        outcome: hr.outcome,
        closure_notes: hr.closure_notes,
      }),
    });
    const result = await response.json().catch(() => null);
    setIntakeSaveState("idle");

    if (!response.ok) {
      setSaveError(result?.error ?? "Unable to close case");
      return;
    }

    setHr({
      ...hr,
      status: "closed",
      closed_at: result?.closed_at ?? new Date().toISOString(),
    });
    markIntakeSaved();
    router.refresh();
  }

  return (
    <Tabs defaultValue="reporter">
      {saveError && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </p>
      )}
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="reporter">Reporter</TabsTrigger>
        <TabsTrigger value="colony">Colony</TabsTrigger>
        <TabsTrigger value="intake">Inquiry Team</TabsTrigger>
        <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="reporter" className="mt-4">
        <CaseReporterSection helpRequest={hr} />
      </TabsContent>

      <TabsContent value="colony" className="mt-4">
        <CaseColonyTab
          helpRequest={hr}
          clinicFixes={clinicFixes}
          cats={cats}
          savingFeeder={savingFeeder}
          canLogClinicFix={canLogClinicFix && !readOnly}
          readOnly={readOnly}
          onFeederChange={handleFeederChange}
          onCatUpdated={updateCat}
          onCatAdded={addCat}
          onCatRemoved={removeCat}
        />
      </TabsContent>

      <TabsContent value="intake" className="mt-4">
        <CaseIntakeSection
          helpRequest={hr}
          teams={teams}
          userRole={userRole}
          canReviewMedical={canReviewMedical}
          canAddNote={canAddHistoryNote}
          noteAuthorName={userName}
          noteAuthorEmail={userEmail}
          savingNote={savingHistory}
          noteSaveError={saveError}
          saveState={intakeSaveState}
          resolvingFollowUp={resolvingFollowUp}
          canResolveFollowUp={canAddHistoryNote}
          onAddNote={addHistoryNote}
          onResolveFollowUp={(entry) => resolveFollowUp({ entry })}
          onResolveAllFollowUps={() => resolveFollowUp({ resolveAll: true })}
          onChange={handleIntakeChange}
          onCloseCase={closeCase}
          canCloseCase={showCloseCase}
          readOnly={readOnly}
        />
      </TabsContent>

      <TabsContent value="appointments" className="mt-4">
        <CaseAppointmentsSection
          helpRequest={{
            id: hr.id,
            case_number: hr.case_number,
            contact_name: hr.contact_name,
          }}
          appointments={appointments}
          availableAppointments={availableAppointments}
          cats={cats}
          clinicFixes={clinicFixes}
          userEmail={userEmail}
          isAdmin={userRole === "admin"}
        />
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <CaseHistorySection
          entries={hr.history_log ?? []}
          canAddNote={canAddHistoryNote && !readOnly}
          canResolveFollowUp={canAddHistoryNote && !readOnly}
          authorName={userName}
          authorEmail={userEmail}
          saving={savingHistory}
          resolvingFollowUp={resolvingFollowUp}
          saveError={saveError}
          onAddNote={addHistoryNote}
          onResolveFollowUp={(entry) => resolveFollowUp({ entry })}
        />
      </TabsContent>
    </Tabs>
  );
}
