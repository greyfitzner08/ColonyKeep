"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { findTrapTeamForZip } from "@/lib/cases/assign-team-by-zip";
import { getStatusOptionsForRole } from "@/lib/cases/statuses";
import { detectMedicalKeywords, mergeMedicalFlags } from "@/lib/medical-flags";
import { formatDateTime } from "@/lib/utils";
import type { HelpRequest, Cat, Appointment, HelpRequestStatus, FollowUpEntry, UserRole } from "@/lib/types";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { Plus, Trash2 } from "lucide-react";

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
  clinics,
  userRole,
  canReviewMedical,
}: CaseDetailTabsProps) {
  const router = useRouter();
  const [hr, setHr] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", gender: "", colors: "", breed: "" });
  const [followUpNote, setFollowUpNote] = useState("");
  const statusOptions = getStatusOptionsForRole(userRole);

  function withTeamAssignment(next: HelpRequest): HelpRequest {
    if (next.assigned_team_id) return next;
    const match = findTrapTeamForZip(next.colony_zip, teams);
    if (!match) return next;
    return {
      ...next,
      assigned_team_id: match.id,
      assigned_team_name: match.name,
    };
  }

  async function saveOverview() {
    setSaving(true);
    const supabase = createClient();
    const medicalFlags = mergeMedicalFlags(
      hr.medical_flags ?? [],
      detectMedicalKeywords(hr.intake_notes ?? "")
    );
    const payload = withTeamAssignment({ ...hr, medical_flags: medicalFlags });
    await supabase
      .from("help_requests")
      .update({
        ...payload,
        assigned_team: payload.assigned_team_name,
      })
      .eq("id", hr.id);
    setHr(payload);
    setSaving(false);
    router.refresh();
  }

  async function updateStatus(status: HelpRequestStatus) {
    const supabase = createClient();
    const next = withTeamAssignment({ ...hr, status });
    await supabase
      .from("help_requests")
      .update({
        status: next.status,
        assigned_team_id: next.assigned_team_id,
        assigned_team_name: next.assigned_team_name,
        assigned_team: next.assigned_team_name,
      })
      .eq("id", hr.id);
    setHr(next);
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
      .update({ status: "closed", outcome: hr.outcome, closure_notes: hr.closure_notes })
      .eq("id", hr.id);
    setHr({ ...hr, status: "closed" });
    router.refresh();
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="cats">Cats ({cats.length})</TabsTrigger>
        <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        <TabsTrigger value="followup">Follow-up Log</TabsTrigger>
        <TabsTrigger value="closure">Closure</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Case Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {canReviewMedical && <MedicalReviewActions helpRequest={hr} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={hr.status} onValueChange={(v) => updateStatus(v as HelpRequestStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Team</Label>
              <Select
                value={hr.assigned_team_id ?? "none"}
                onValueChange={(v) => {
                  const team = teams.find((t) => t.id === v);
                  setHr({ ...hr, assigned_team_id: v === "none" ? null : v, assigned_team_name: team?.name ?? null });
                }}
                disabled={userRole === "inquiry_team"}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {userRole === "inquiry_team" && (
                <p className="text-xs text-muted-foreground">
                  Trap team is assigned automatically from colony ZIP ({hr.colony_zip || "missing"}).
                </p>
              )}
            </div>
            <div className="space-y-2"><Label>Contact Name</Label><Input value={hr.contact_name} onChange={(e) => setHr({ ...hr, contact_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact Email</Label><Input value={hr.contact_email} onChange={(e) => setHr({ ...hr, contact_email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact Phone</Label><Input value={hr.contact_phone} onChange={(e) => setHr({ ...hr, contact_phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Follow-up Due Date</Label><Input type="date" value={hr.follow_up_due_date ?? ""} onChange={(e) => setHr({ ...hr, follow_up_due_date: e.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Intake Notes</Label><Textarea value={hr.intake_notes ?? ""} onChange={(e) => setHr({ ...hr, intake_notes: e.target.value })} rows={4} /></div>
            <div className="md:col-span-2">
              <Button onClick={saveOverview} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        {cats.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{cat.name || "Unnamed cat"}</p>
                  <p className="text-sm text-muted-foreground">{cat.colors} · {cat.gender} · {cat.breed}</p>
                  <div className="flex gap-2 mt-2">
                    {cat.trapped_status && <Badge variant="secondary">Trapped: {cat.trapped_status}</Badge>}
                    {cat.appointment_status && <Badge variant="secondary">Appt: {cat.appointment_status}</Badge>}
                    {cat.return_status && <Badge variant="secondary">Return: {cat.return_status}</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader><CardTitle className="text-base">Add Cat</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
            <Input placeholder="Gender" value={newCat.gender} onChange={(e) => setNewCat({ ...newCat, gender: e.target.value })} />
            <Input placeholder="Colors" value={newCat.colors} onChange={(e) => setNewCat({ ...newCat, colors: e.target.value })} />
            <Input placeholder="Breed" value={newCat.breed} onChange={(e) => setNewCat({ ...newCat, breed: e.target.value })} />
            <Button onClick={addCat} className="col-span-2"><Plus className="h-4 w-4 mr-2" />Add Cat</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appointments" className="space-y-4 mt-4">
        {appointments.length === 0 ? (
          <p className="text-muted-foreground">No appointments linked to this case. Reserve slots from the <a href="/appointments" className="text-primary underline">Appointments calendar</a>.</p>
        ) : (
          appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="pt-4 flex justify-between">
                <div>
                  <p className="font-medium">{appt.clinic_name}</p>
                  <p className="text-sm text-muted-foreground">{appt.date} · {appt.cat_name ?? "No cat assigned"}</p>
                </div>
                <Badge>{appt.status}</Badge>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="followup" className="space-y-4 mt-4">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="Log a follow-up call attempt..." />
            <Button onClick={addFollowUp}>Log Follow-up</Button>
          </CardContent>
        </Card>
        {(hr.follow_up_log ?? []).slice().reverse().map((entry) => (
          <Card key={entry.id}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)} — {entry.author_name}</p>
              <p className="mt-1">{entry.notes}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="closure" className="space-y-4 mt-4">
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={hr.outcome ?? ""} onValueChange={(v) => setHr({ ...hr, outcome: v })}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
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
            <div className="space-y-2">
              <Label>Closure Notes</Label>
              <Textarea value={hr.closure_notes ?? ""} onChange={(e) => setHr({ ...hr, closure_notes: e.target.value })} rows={4} />
            </div>
            <Button onClick={closeCase} variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Close Case</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="space-y-2 mt-4">
        {(hr.history_log ?? []).slice().reverse().map((entry, i) => (
          <div key={i} className="text-sm border-b pb-2">
            <span className="text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
            <span className="mx-2">·</span>
            <span>{entry.details ?? entry.action}</span>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}
