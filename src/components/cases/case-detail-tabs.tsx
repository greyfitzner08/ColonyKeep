"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest, Cat, Appointment, FollowUpEntry, UserRole } from "@/lib/types";
import { CaseColonyInfoSection } from "@/components/cases/case-colony-info-section";
import { CaseIntakeSection } from "@/components/cases/case-intake-section";
import { DetailField } from "@/components/cases/case-detail-fields";
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

const EMPTY_CAT = {
  name: "",
  gender: "",
  colors: "",
  microchip_id: "",
  clinic_id: "",
  clinic_name: "",
  medical_notes: "",
};

export function CaseDetailTabs({
  helpRequest: initial,
  cats: initialCats,
  appointments,
  teams,
  clinics,
  userRole,
  canReviewMedical,
}: CaseDetailTabsProps) {
  const router = useRouter();
  const [hr, setHr] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [saving, setSaving] = useState(false);
  const [routing, setRouting] = useState(false);
  const [newCat, setNewCat] = useState(EMPTY_CAT);
  const [followUpNote, setFollowUpNote] = useState("");

  const canRouteToTrap = userRole === "admin" || userRole === "inquiry_team";

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

  async function routeToTrap() {
    setRouting(true);
    const response = await fetch("/api/help-requests/route-to-trap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: hr.id }),
    });
    const result = await response.json().catch(() => null);
    setRouting(false);

    if (!response.ok) {
      alert(result?.error ?? "Could not route case to trap team");
      return;
    }

    setHr({
      ...hr,
      status: "routed_to_trap_team",
      assigned_team_id: result.assignedTeamId ?? hr.assigned_team_id,
      assigned_team_name: result.assignedTeamName ?? hr.assigned_team_name,
    });
    router.refresh();
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
      .insert({
        help_request_id: hr.id,
        name: newCat.name || null,
        gender: newCat.gender || null,
        colors: newCat.colors || null,
        microchip_id: newCat.microchip_id || null,
        clinic_id: newCat.clinic_id || null,
        clinic_name: newCat.clinic_name || null,
        medical_notes: newCat.medical_notes || null,
      })
      .select()
      .single();
    if (data) {
      setCats([...cats, data as Cat]);
      setNewCat(EMPTY_CAT);
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
      <TabsList className="flex-wrap h-auto text-base">
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
          canRouteToTrap={canRouteToTrap}
          saving={saving}
          routing={routing}
          followUpNote={followUpNote}
          onFollowUpNoteChange={setFollowUpNote}
          onAddFollowUp={addFollowUp}
          onChange={setHr}
          onSave={saveIntake}
          onRouteToTrap={routeToTrap}
          onCloseCase={closeCase}
        />
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colony Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              {hr.cats_over_8_weeks} adults (8+ weeks)
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {hr.kittens_under_8_weeks} kittens (&lt;8 weeks)
            </Badge>
            {hr.pregnant_count > 0 && (
              <Badge variant="secondary" className="text-sm">
                {hr.pregnant_count} suspected pregnant
              </Badge>
            )}
          </CardContent>
        </Card>

        {cats.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="pt-6">
              <p className="text-lg font-semibold">{cat.name || "Unnamed cat"}</p>
              <p className="text-base text-muted-foreground mt-1">
                {[cat.colors, cat.gender].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <DetailField alwaysShow label="Microchip ID" value={cat.microchip_id} />
                <DetailField alwaysShow label="Clinic" value={cat.clinic_name} />
                {cat.medical_notes && (
                  <div className="sm:col-span-2">
                    <DetailField alwaysShow label="Medical Notes" value={cat.medical_notes} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
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
            <CardTitle className="text-lg">Add Tracked Cat</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label className="text-sm font-medium">Clinic</Label>
              <Select
                value={newCat.clinic_id || "none"}
                onValueChange={(v) => {
                  const clinic = clinics.find((c) => c.id === v);
                  setNewCat({
                    ...newCat,
                    clinic_id: v === "none" ? "" : v,
                    clinic_name: clinic?.name ?? "",
                  });
                }}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not yet assigned</SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appointments" className="space-y-4 mt-4">
        {appointments.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No appointments linked to this case. Reserve slots from the{" "}
            <a href="/appointments" className="text-primary underline">
              Appointments calendar
            </a>
            .
          </p>
        ) : (
          appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="pt-6 flex justify-between items-start">
                <div>
                  <p className="text-lg font-semibold">{appt.clinic_name}</p>
                  <p className="text-base text-muted-foreground mt-1">
                    {appt.date} · {appt.cat_name ?? "No cat assigned"}
                  </p>
                </div>
                <Badge className="text-sm">{appt.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="history" className="space-y-3 mt-4">
        {(hr.history_log ?? []).length === 0 ? (
          <p className="text-base text-muted-foreground">No history entries yet.</p>
        ) : (
          (hr.history_log ?? []).slice().reverse().map((entry, i) => (
            <div key={i} className="text-base border-b pb-3">
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
