"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { findTrapTeamForZip } from "@/lib/cases/assign-team-by-zip";
import { detectMedicalKeywords, mergeMedicalFlags } from "@/lib/medical-flags";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest, Cat, Appointment, FollowUpEntry, UserRole } from "@/lib/types";
import { CaseColonyInfoSection } from "@/components/cases/case-colony-info-section";
import { CaseIntakeSection } from "@/components/cases/case-intake-section";
import { Plus } from "lucide-react";

interface CaseDetailTabsProps {
  helpRequest: HelpRequest;
  cats: Cat[];
  appointments: Appointment[];
  teams: { id: string; name: string; zip_codes: string[] }[];
  clinics: { id: string; name: string }[];
  userRole: UserRole | null;
  canReviewMedical: boolean;
}

export function CaseDetailTabs({
  helpRequest: initial,
  cats: initialCats,
  appointments,
  teams,
  userRole,
  canReviewMedical,
}: CaseDetailTabsProps) {
  const router = useRouter();
  const [hr, setHr] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", gender: "", colors: "", breed: "" });
  const [followUpNote, setFollowUpNote] = useState("");

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
    await supabase
      .from("help_requests")
      .update({
        status: payload.status,
        priority: payload.priority,
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
    setHr(payload);
    router.refresh();
  }

  async function saveIntake() {
    setSaving(true);
    const medicalFlags = mergeMedicalFlags(
      hr.medical_flags ?? [],
      detectMedicalKeywords(`${hr.intake_notes ?? ""}\n${hr.additional_notes ?? ""}`)
    );
    await persistCase(hr, medicalFlags);
    setSaving(false);
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
    const { data } = await supabase
      .from("cats")
      .insert({ help_request_id: hr.id, ...newCat })
      .select()
      .single();
    if (data) {
      setCats([...cats, data as Cat]);
      setNewCat({ name: "", gender: "", colors: "", breed: "" });
    }
  }

  async function closeCase() {
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
    <Tabs defaultValue="colony">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="colony">Colony & Reporter</TabsTrigger>
        <TabsTrigger value="intake">Intake Team</TabsTrigger>
        <TabsTrigger value="cats">Tracked Cats ({cats.length})</TabsTrigger>
        <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="colony" className="mt-4">
        <CaseColonyInfoSection helpRequest={hr} />
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
        />
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colony Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{hr.cats_over_8_weeks} adults (8+ weeks)</Badge>
            <Badge variant="secondary">{hr.kittens_under_8_weeks} kittens (&lt;8 weeks)</Badge>
            {hr.pregnant_count > 0 && (
              <Badge variant="secondary">{hr.pregnant_count} suspected pregnant</Badge>
            )}
          </CardContent>
        </Card>
        {cats.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="pt-4">
              <p className="font-medium">{cat.name || "Unnamed cat"}</p>
              <p className="text-sm text-muted-foreground">
                {cat.colors} · {cat.gender} · {cat.breed}
              </p>
              <div className="flex gap-2 mt-2">
                {cat.trapped_status && (
                  <Badge variant="secondary">Trapped: {cat.trapped_status}</Badge>
                )}
                {cat.appointment_status && (
                  <Badge variant="secondary">Appt: {cat.appointment_status}</Badge>
                )}
                {cat.return_status && (
                  <Badge variant="secondary">Return: {cat.return_status}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Tracked Cat</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Name"
              value={newCat.name}
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            />
            <Input
              placeholder="Gender"
              value={newCat.gender}
              onChange={(e) => setNewCat({ ...newCat, gender: e.target.value })}
            />
            <Input
              placeholder="Colors"
              value={newCat.colors}
              onChange={(e) => setNewCat({ ...newCat, colors: e.target.value })}
            />
            <Input
              placeholder="Breed"
              value={newCat.breed}
              onChange={(e) => setNewCat({ ...newCat, breed: e.target.value })}
            />
            <Button onClick={addCat} className="col-span-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Cat
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appointments" className="space-y-4 mt-4">
        {appointments.length === 0 ? (
          <p className="text-muted-foreground">
            No appointments linked to this case. Reserve slots from the{" "}
            <a href="/appointments" className="text-primary underline">
              Appointments calendar
            </a>
            .
          </p>
        ) : (
          appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="pt-4 flex justify-between">
                <div>
                  <p className="font-medium">{appt.clinic_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {appt.date} · {appt.cat_name ?? "No cat assigned"}
                  </p>
                </div>
                <Badge>{appt.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="history" className="space-y-2 mt-4">
        {(hr.history_log ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No history entries yet.</p>
        ) : (
          (hr.history_log ?? []).slice().reverse().map((entry, i) => (
            <div key={i} className="text-sm border-b pb-2">
              <span className="text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
              <span className="mx-2">·</span>
              <span>{entry.details ?? entry.action}</span>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
