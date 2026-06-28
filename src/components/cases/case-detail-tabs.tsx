"use client";

import { useState, useEffect } from "react";
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
import { detectMedicalKeywords, mergeMedicalFlags } from "@/lib/medical-flags";
import { canCloseCase } from "@/lib/cases/case-permissions";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { feederPayload, geocodeFeederIfNeeded } from "@/lib/cases/feeder-fields";
import type {
  HelpRequest,
  Cat,
  Appointment,
  ClinicFix,
  FollowUpEntry,
  UserRole,
  HistoryNoteColor,
} from "@/lib/types";
import { CaseClinicFixesSection } from "@/components/cases/case-clinic-fixes-section";
import { CaseReporterSection } from "@/components/cases/case-colony-info-section";
import { CaseColonyTab } from "@/components/cases/case-colony-tab";
import { CaseIntakeSection } from "@/components/cases/case-intake-section";
import { CaseHistorySection } from "@/components/cases/case-history-section";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { CaseAppointmentsSection } from "@/components/appointments/case-appointments-section";
import { TrackedCatCard } from "@/components/cases/tracked-cat-card";
import { ColonyCatSummaryEditor } from "@/components/cases/colony-cat-summary-editor";
import { Plus } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState(EMPTY_CAT);
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFeeder, setSavingFeeder] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);

  const showCloseCase = canCloseCase(userRole);

  useEffect(() => {
    setHr({
      ...initial,
      history_log: normalizeHistoryLog(initial.history_log),
    });
  }, [initial]);

  function withTeamAssignment(next: HelpRequest): HelpRequest {
    const match = findTrapTeamForZip(next.colony_zip, teams);
    if (!match) return next;
    return {
      ...next,
      assigned_team_id: match.id,
      assigned_team_name: match.name,
    };
  }

  async function persistCase(next: HelpRequest, medicalFlags = next.medical_flags ?? []) {
    const supabase = createClient();
    const payload = withTeamAssignment({ ...next, medical_flags: medicalFlags });

    const { error } = await supabase
      .from("help_requests")
      .update({
        status: payload.status,
        follow_up_due_date: payload.follow_up_due_date,
        assigned_team_id: payload.assigned_team_id,
        assigned_team_name: payload.assigned_team_name,
        assigned_team: payload.assigned_team_name,
        additional_notes: payload.additional_notes,
        closure_notes: payload.closure_notes,
        outcome: payload.outcome,
        resolution: payload.resolution,
        medical_flags: payload.medical_flags,
      })
      .eq("id", hr.id);

    if (error) {
      setSaveError(error.message);
      return false;
    }

    setHr(payload);
    setSaveError(null);
    router.refresh();
    return true;
  }

  async function saveFeederInfo() {
    setSavingFeeder(true);
    setSaveError(null);
    const supabase = createClient();
    let payload = await geocodeFeederIfNeeded(hr);

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

  async function saveIntake() {
    setSaving(true);
    setSaveError(null);
    const medicalFlags = mergeMedicalFlags(
      hr.medical_flags ?? [],
      detectMedicalKeywords(`${hr.intake_notes ?? ""}\n${hr.additional_notes ?? ""}`)
    );
    const ok = await persistCase(hr, medicalFlags);
    setSaving(false);
    if (!ok) return;
  }

  async function addFollowUp() {
    if (!followUpNote.trim()) return;
    const supabase = createClient();
    const entry: FollowUpEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      author_email: "",
      author_name: "Current User",
      notes: followUpNote,
      outcome: null,
    };
    const log = [...(hr.follow_up_log ?? []), entry];
    await supabase.from("help_requests").update({ follow_up_log: log }).eq("id", hr.id);
    setHr({ ...hr, follow_up_log: log });
    setFollowUpNote("");
  }

  async function addCat() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cats")
      .insert({
        help_request_id: hr.id,
        name: newCat.name || null,
        gender: newCat.gender || null,
        colors: newCat.colors || null,
        microchip_id: newCat.microchip_id || null,
        medical_notes: newCat.medical_notes || null,
      })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    if (data) {
      setCats([...cats, data as Cat]);
      setNewCat(EMPTY_CAT);
      router.refresh();
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
          savingFeeder={savingFeeder}
          onChange={setHr}
          onSaveFeeder={saveFeederInfo}
        />
      </TabsContent>

      <TabsContent value="intake" className="mt-4">
        <CaseIntakeSection
          helpRequest={hr}
          teams={teams}
          userRole={userRole}
          canReviewMedical={canReviewMedical}
          saving={saving}
          followUpNote={followUpNote}
          onFollowUpNoteChange={setFollowUpNote}
          onAddFollowUp={addFollowUp}
          onChange={setHr}
          onSave={saveIntake}
          onCloseCase={closeCase}
          canCloseCase={showCloseCase}
        />
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        <ColonyCatSummaryEditor
          helpRequest={hr}
          clinicFixes={clinicFixes}
          onUpdated={(next) => {
            setHr(next);
            router.refresh();
          }}
        />

        <CaseClinicFixesSection
          helpRequest={hr}
          clinicFixes={clinicFixes}
          canLog={canLogClinicFix}
        />

        {cats.map((cat) => (
          <TrackedCatCard
            key={cat.id}
            cat={cat}
            clinics={clinics}
            onUpdated={updateCat}
          />
        ))}

        <CaseCollapsibleSection title="Add tracked cat" defaultOpen={cats.length === 0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name / Description</Label>
              <Input
                className="text-base"
                placeholder="e.g. Orange tabby male"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Gender</Label>
              <Input
                className="text-base"
                placeholder="Male / Female"
                value={newCat.gender}
                onChange={(e) => setNewCat({ ...newCat, gender: e.target.value })}
              />
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
            <Button onClick={addCat} className="sm:col-span-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Cat
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
