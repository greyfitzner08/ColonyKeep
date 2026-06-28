"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/lib/types";
import { ClinicFixSummary } from "@/components/cases/clinic-fix-summary";
import { CaseReporterSection } from "@/components/cases/case-colony-info-section";
import { CaseColonyTab } from "@/components/cases/case-colony-tab";
import { CaseIntakeSection } from "@/components/cases/case-intake-section";
import { CaseHistorySection } from "@/components/cases/case-history-section";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseAppointmentsSection } from "@/components/appointments/case-appointments-section";
import { TrackedCatCard } from "@/components/cases/tracked-cat-card";
import { ColonyCatSummaryEditor } from "@/components/cases/colony-cat-summary-editor";
import { ClinicFixFosterFields } from "@/components/cases/clinic-fix-foster-fields";
import { hasFosterFormAnswer, validateTrackedCatFosterForm } from "@/lib/cases/tracked-cat-foster";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { Plus } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

interface CaseDetailTabsProps {
  helpRequest: HelpRequest;
  cats: Cat[];
  appointments: Appointment[];
  availableAppointments: Appointment[];
  clinicFixes: ClinicFix[];
  teams: { id: string; name: string; zip_codes: string[] }[];
  clinics: { id: string; name: string }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
  canAddHistoryNote: boolean;
  canLogClinicFix: boolean;
  userName: string;
  userEmail: string;
}

const EMPTY_CAT = {
  name: "",
  gender: "",
  colors: "",
  microchip_id: "",
  medical_notes: "",
};

export function CaseDetailTabs({
  helpRequest: initial,
  cats: initialCats,
  appointments,
  availableAppointments,
  clinicFixes,
  teams,
  clinics,
  userRole,
  canReviewMedical,
  canAddHistoryNote,
  canLogClinicFix,
  userName,
  userEmail,
}: CaseDetailTabsProps) {
  const router = useRouter();
  const [hr, setHr] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [intakeSaveState, setIntakeSaveState] = useState<SaveState>("idle");
  const [newCat, setNewCat] = useState(EMPTY_CAT);
  const [newCatFixedAtClinic, setNewCatFixedAtClinic] = useState(false);
  const [newCatAgeCategory, setNewCatAgeCategory] = useState<"" | "adult" | "kitten">("");
  const [newCatWentToFoster, setNewCatWentToFoster] = useState<"" | "yes" | "no">("");
  const [newCatFosterFacility, setNewCatFosterFacility] = useState<FosterFacility | "">("");
  const [newCatFosterFacilityOther, setNewCatFosterFacilityOther] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addCatError, setAddCatError] = useState<string | null>(null);
  const [savingFeeder, setSavingFeeder] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const skipIntakeAutosaveRef = useRef(true);
  const savedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showCloseCase = canCloseCase(userRole);

  const clinicFixByCatId = new Map(
    clinicFixes.flatMap((fix) => (fix.cat_id ? [[fix.cat_id, fix] as const] : []))
  );
  const orphanClinicFixes = clinicFixes.filter((fix) => !fix.cat_id);

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
      setHr(next);
      if (skipIntakeAutosaveRef.current) return;
      debouncedSaveIntake(next);
    },
    [debouncedSaveIntake]
  );

  const handleFeederChange = useCallback(
    (next: HelpRequest) => {
      setHr(next);
      debouncedSaveFeeder(next);
    },
    [debouncedSaveFeeder]
  );

  function resetNewCatForm() {
    setNewCat(EMPTY_CAT);
    setNewCatFixedAtClinic(false);
    setNewCatAgeCategory("");
    setNewCatWentToFoster("");
    setNewCatFosterFacility("");
    setNewCatFosterFacilityOther("");
    setAddCatError(null);
  }

  async function addCat() {
    if (newCatFixedAtClinic && !newCatAgeCategory) {
      setAddCatError("Select adult or kitten.");
      return;
    }

    const fosterError = validateTrackedCatFosterForm(
      {
        wentToFoster: newCatWentToFoster,
        fosterFacility: newCatFosterFacility,
        fosterFacilityOther: newCatFosterFacilityOther,
      },
      { required: newCatFixedAtClinic }
    );
    if (fosterError) {
      setAddCatError(fosterError);
      return;
    }

    setAddingCat(true);
    setAddCatError(null);

    const response = await fetch("/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId: hr.id,
        name: newCat.name,
        gender: newCat.gender,
        colors: newCat.colors,
        microchip_id: newCat.microchip_id,
        medical_notes: newCat.medical_notes,
        fixedAtClinic: newCatFixedAtClinic,
        ageCategory: newCatFixedAtClinic ? newCatAgeCategory : undefined,
        ...(hasFosterFormAnswer(newCatWentToFoster)
          ? {
              wentToFoster: newCatWentToFoster,
              fosterFacility: newCatFosterFacility,
              fosterFacilityOther: newCatFosterFacilityOther,
            }
          : {}),
      }),
    });

    const result = await response.json().catch(() => null);
    setAddingCat(false);

    if (!response.ok) {
      setAddCatError(result?.error ?? "Unable to add tracked cat");
      return;
    }

    if (result?.cat) {
      const wasFixedAtClinic = newCatFixedAtClinic;
      const hadFosterSelection = hasFosterFormAnswer(newCatWentToFoster);
      setCats([...cats, result.cat as Cat]);
      resetNewCatForm();
      if (wasFixedAtClinic || hadFosterSelection) {
        router.refresh();
      }
    }
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

  async function closeCase() {
    if (!showCloseCase) return;
    setIntakeSaveState("saving");
    const medicalFlags = mergeMedicalFlags(
      hr.medical_flags ?? [],
      detectMedicalKeywords(`${hr.intake_notes ?? ""}\n${staffNotesText(hr.history_log)}`)
    );
    await persistCase(hr, medicalFlags, { includeStatus: userRole !== "inquiry_team" });

    const supabase = createClient();
    await supabase
      .from("help_requests")
      .update({
        status: "closed",
        outcome: hr.outcome,
        closure_notes: hr.closure_notes,
        closed_at: new Date().toISOString(),
      })
      .eq("id", hr.id);
    setHr({ ...hr, status: "closed", closed_at: new Date().toISOString() });
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
        <TabsTrigger value="cats">Tracked Cats ({cats.length})</TabsTrigger>
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
          onChange={handleFeederChange}
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
          onAddNote={addHistoryNote}
          onChange={handleIntakeChange}
          onCloseCase={closeCase}
          canCloseCase={showCloseCase}
        />
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        <ColonyCatSummaryEditor
          helpRequest={hr}
          clinicFixes={clinicFixes}
          cats={cats}
        />

        {cats.map((cat) => (
          <TrackedCatCard
            key={cat.id}
            cat={cat}
            clinics={clinics}
            helpRequestId={hr.id}
            caseNumber={hr.case_number}
            clinicFix={clinicFixByCatId.get(cat.id) ?? null}
            canLogClinicFix={canLogClinicFix}
            onUpdated={updateCat}
          />
        ))}

        {orphanClinicFixes.length > 0 && (
          <CaseCollapsibleSection title="Other clinic fixes" defaultOpen>
            <p className="mb-3 text-sm text-muted-foreground">
              Walk-in fixes logged before these cats were tracked individually.
            </p>
            <div className="space-y-2">
              {orphanClinicFixes.map((fix) => (
                <ClinicFixSummary key={fix.id} fix={fix} />
              ))}
            </div>
          </CaseCollapsibleSection>
        )}

        <CaseCollapsibleSection title="Add tracked cat" defaultOpen={cats.length === 0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input
                className="text-base"
                placeholder="e.g. Marmalade"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Gender</Label>
              <Select
                value={newCat.gender || undefined}
                onValueChange={(value) =>
                  setNewCat({ ...newCat, gender: value as "male" | "female" })
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Colors / Markings</Label>
              <Input
                className="text-base"
                placeholder="Colors"
                value={newCat.colors}
                onChange={(e) => setNewCat({ ...newCat, colors: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Microchip ID #</Label>
              <Input
                className="text-base"
                placeholder="Microchip number"
                value={newCat.microchip_id}
                onChange={(e) => setNewCat({ ...newCat, microchip_id: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Medical Notes</Label>
              <Textarea
                className="text-base"
                placeholder="Injuries, illness, special handling..."
                value={newCat.medical_notes}
                onChange={(e) => setNewCat({ ...newCat, medical_notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Fixed at clinic?</Label>
              <Select
                value={newCatFixedAtClinic ? "yes" : "no"}
                onValueChange={(value) => {
                  setNewCatFixedAtClinic(value === "yes");
                  if (value !== "yes") {
                    setNewCatAgeCategory("");
                  }
                  setAddCatError(null);
                }}
              >
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Not yet — still at colony or in progress</SelectItem>
                  <SelectItem value="yes">Yes — already fixed at clinic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCatFixedAtClinic && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Age at clinic</Label>
                <Select
                  value={newCatAgeCategory || "unset"}
                  onValueChange={(value) =>
                    setNewCatAgeCategory(value === "unset" ? "" : (value as "adult" | "kitten"))
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Select age</SelectItem>
                    <SelectItem value="adult">Adult (8+ weeks)</SelectItem>
                    <SelectItem value="kitten">Kitten (&lt;8 weeks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="sm:col-span-2">
              <ClinicFixFosterFields
                variant="tracked-cat"
                value={{
                  wentToFoster: newCatWentToFoster,
                  fosterFacility: newCatFosterFacility,
                  fosterFacilityOther: newCatFosterFacilityOther,
                }}
                onChange={(foster) => {
                  setNewCatWentToFoster(foster.wentToFoster);
                  setNewCatFosterFacility(foster.fosterFacility);
                  setNewCatFosterFacilityOther(foster.fosterFacilityOther);
                }}
              />
            </div>

            {addCatError && (
              <p className="text-sm text-destructive sm:col-span-2">{addCatError}</p>
            )}
            <Button onClick={addCat} className="sm:col-span-2" disabled={addingCat}>
              <Plus className="h-4 w-4 mr-2" />
              {addingCat ? "Adding…" : "Add Cat"}
            </Button>
          </div>
        </CaseCollapsibleSection>
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
          userEmail={userEmail}
          isAdmin={userRole === "admin"}
        />
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <CaseHistorySection
          entries={hr.history_log ?? []}
          canAddNote={canAddHistoryNote}
          authorName={userName}
          authorEmail={userEmail}
          saving={savingHistory}
          saveError={saveError}
          onAddNote={addHistoryNote}
        />
      </TabsContent>
    </Tabs>
  );
}
