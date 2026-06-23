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
import { DetailField, formatAddress, formatYesNo } from "@/components/cases/case-detail-fields";
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
        contact_name: payload.contact_name,
        contact_first_name: payload.contact_first_name,
        contact_last_name: payload.contact_last_name,
        contact_email: payload.contact_email,
        contact_phone: payload.contact_phone,
        contact_street: payload.contact_street,
        contact_city: payload.contact_city,
        contact_state: payload.contact_state,
        contact_zip: payload.contact_zip,
        contact_county: payload.contact_county,
        colony_address: payload.colony_address,
        colony_city: payload.colony_city,
        colony_state: payload.colony_state,
        colony_county: payload.colony_county,
        colony_zip: payload.colony_zip,
        kittens_under_8_weeks: payload.kittens_under_8_weeks,
        cats_over_8_weeks: payload.cats_over_8_weeks,
        pregnant_count: payload.pregnant_count,
        relationship_to_cats: payload.relationship_to_cats,
        feeding_cats: payload.feeding_cats,
        feeder_if_not: payload.feeder_if_not,
        trapping_experience: payload.trapping_experience,
        need_traps: payload.need_traps,
        willing_to_trap_transport: payload.willing_to_trap_transport,
        able_to_trap_transport: payload.able_to_trap_transport,
        has_recovery_space: payload.has_recovery_space,
        how_heard: payload.how_heard,
        apartment_name: payload.apartment_name,
        intake_notes: payload.intake_notes,
        additional_notes: payload.additional_notes,
        follow_up_due_date: payload.follow_up_due_date,
        assigned_team_id: payload.assigned_team_id,
        assigned_team_name: payload.assigned_team_name,
        assigned_team: payload.assigned_team_name,
        medical_flags: payload.medical_flags,
        outcome: payload.outcome,
        closure_notes: payload.closure_notes,
      })
      .eq("id", hr.id);
    setHr(payload);
    router.refresh();
  }

  async function saveAll() {
    setSaving(true);
    const medicalFlags = mergeMedicalFlags(
      hr.medical_flags ?? [],
      detectMedicalKeywords(hr.intake_notes ?? "")
    );
    await persistCase(hr, medicalFlags);
    setSaving(false);
  }

  async function updateStatus(status: HelpRequestStatus) {
    await persistCase({ ...hr, status });
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

  const colonyLocation = formatAddress([
    hr.colony_address,
    hr.colony_city,
    hr.colony_state,
    hr.colony_zip,
    hr.colony_county,
  ]);
  const contactLocation = formatAddress([
    hr.contact_street,
    hr.contact_city,
    hr.contact_state,
    hr.contact_zip,
    hr.contact_county,
  ]);

  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="contact">Contact</TabsTrigger>
        <TabsTrigger value="colony">Colony & Cats</TabsTrigger>
        <TabsTrigger value="cats">Tracked Cats ({cats.length})</TabsTrigger>
        <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        <TabsTrigger value="followup">Follow-up Log</TabsTrigger>
        <TabsTrigger value="closure">Closure</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Case Workflow</CardTitle></CardHeader>
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
                    setHr({
                      ...hr,
                      assigned_team_id: v === "none" ? null : v,
                      assigned_team_name: team?.name ?? null,
                    });
                  }}
                  disabled={userRole === "inquiry_team"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-assigned from colony ZIP {hr.colony_zip || "—"} when saved.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Follow-up Due Date</Label>
                <Input type="date" value={hr.follow_up_due_date ?? ""} onChange={(e) => setHr({ ...hr, follow_up_due_date: e.target.value })} />
              </div>
              <DetailField label="Priority" value={hr.priority} />
              <DetailField label="Assigned To (legacy)" value={hr.assigned_to} />
              <DetailField label="Trapper / Trap Loaner" value={hr.trapper_trap_loaner} />
              <DetailField label="Submitted" value={formatDateTime(hr.created_at)} />
            </div>
            <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save Workflow"}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Reporter / Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>First Name</Label><Input value={hr.contact_first_name ?? ""} onChange={(e) => setHr({ ...hr, contact_first_name: e.target.value, contact_name: `${e.target.value} ${hr.contact_last_name ?? ""}`.trim() })} /></div>
            <div className="space-y-2"><Label>Last Name</Label><Input value={hr.contact_last_name ?? ""} onChange={(e) => setHr({ ...hr, contact_last_name: e.target.value, contact_name: `${hr.contact_first_name ?? ""} ${e.target.value}`.trim() })} /></div>
            <div className="space-y-2"><Label>Full Name</Label><Input value={hr.contact_name} onChange={(e) => setHr({ ...hr, contact_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={hr.contact_email} onChange={(e) => setHr({ ...hr, contact_email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={hr.contact_phone} onChange={(e) => setHr({ ...hr, contact_phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Relationship to Cats</Label><Input value={hr.relationship_to_cats ?? ""} onChange={(e) => setHr({ ...hr, relationship_to_cats: e.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Street Address</Label><Input value={hr.contact_street ?? ""} onChange={(e) => setHr({ ...hr, contact_street: e.target.value })} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={hr.contact_city ?? ""} onChange={(e) => setHr({ ...hr, contact_city: e.target.value })} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={hr.contact_state ?? ""} onChange={(e) => setHr({ ...hr, contact_state: e.target.value })} /></div>
            <div className="space-y-2"><Label>Zip Code</Label><Input value={hr.contact_zip ?? ""} onChange={(e) => setHr({ ...hr, contact_zip: e.target.value })} /></div>
            <div className="space-y-2"><Label>County</Label><Input value={hr.contact_county ?? ""} onChange={(e) => setHr({ ...hr, contact_county: e.target.value })} /></div>
            <div className="md:col-span-2"><DetailField label="Formatted Contact Address" value={contactLocation} /></div>
            <DetailField label="How Did You Hear About Us?" value={hr.how_heard} />
            <DetailField label="Apartment / Community" value={hr.apartment_name} />
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save Contact"}</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="colony" className="space-y-4 mt-4">
        <Card>
          <CardHeader><CardTitle>Colony Location</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2"><Label>Colony Street Address</Label><Input value={hr.colony_address} onChange={(e) => setHr({ ...hr, colony_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Colony City</Label><Input value={hr.colony_city} onChange={(e) => setHr({ ...hr, colony_city: e.target.value })} /></div>
            <div className="space-y-2"><Label>Colony State</Label><Input value={hr.colony_state ?? ""} onChange={(e) => setHr({ ...hr, colony_state: e.target.value })} /></div>
            <div className="space-y-2"><Label>Colony Zip Code</Label><Input value={hr.colony_zip} onChange={(e) => setHr({ ...hr, colony_zip: e.target.value })} /></div>
            <div className="space-y-2"><Label>Colony County</Label><Input value={hr.colony_county} onChange={(e) => setHr({ ...hr, colony_county: e.target.value })} /></div>
            <div className="md:col-span-2"><DetailField label="Full Colony Location" value={colonyLocation} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Colony Cat Counts</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Cats Over 8 Weeks</Label><Input type="number" min={0} value={hr.cats_over_8_weeks} onChange={(e) => setHr({ ...hr, cats_over_8_weeks: Number.parseInt(e.target.value || "0", 10) })} /></div>
            <div className="space-y-2"><Label>Kittens Under 8 Weeks</Label><Input type="number" min={0} value={hr.kittens_under_8_weeks} onChange={(e) => setHr({ ...hr, kittens_under_8_weeks: Number.parseInt(e.target.value || "0", 10) })} /></div>
            <div className="space-y-2"><Label>Suspected Pregnant</Label><Input type="number" min={0} value={hr.pregnant_count} onChange={(e) => setHr({ ...hr, pregnant_count: Number.parseInt(e.target.value || "0", 10) })} /></div>
            <DetailField label="Cats Remaining" value={hr.cats_remaining} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trapping & Care</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Feeding the Cats?" value={formatYesNo(hr.feeding_cats)} />
            <DetailField label="Feeder If Not Reporter" value={hr.feeder_if_not} />
            <DetailField label="Trapping Experience" value={hr.trapping_experience} />
            <DetailField label="Need Traps?" value={formatYesNo(hr.need_traps)} />
            <DetailField label="Willing to Trap & Transport" value={hr.willing_to_trap_transport} />
            <DetailField label="Able to Trap & Transport" value={hr.able_to_trap_transport} />
            <DetailField label="Recovery Space Available" value={formatYesNo(hr.has_recovery_space)} />
            <div className="md:col-span-2 space-y-2"><Label>Colony / Intake Notes</Label><Textarea value={hr.intake_notes ?? ""} onChange={(e) => setHr({ ...hr, intake_notes: e.target.value })} rows={5} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Additional Notes</Label><Textarea value={hr.additional_notes ?? ""} onChange={(e) => setHr({ ...hr, additional_notes: e.target.value })} rows={4} /></div>
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save Colony Info"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Outcomes (Imported)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailField label="TNVR'd" value={hr.outcome_tnvr_count} />
            <DetailField label="Taken to ACC" value={hr.outcome_acc_count} />
            <DetailField label="Taken into Foster" value={hr.outcome_foster_count} />
            <DetailField label="Other Outcome" value={hr.outcome_other_count} />
            <DetailField label="Outcome" value={hr.outcome} />
            <DetailField label="Resolution" value={hr.resolution} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cats" className="space-y-4 mt-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Colony Summary</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{hr.cats_over_8_weeks} adults (8+ weeks)</Badge>
            <Badge variant="secondary">{hr.kittens_under_8_weeks} kittens (&lt;8 weeks)</Badge>
            {hr.pregnant_count > 0 && <Badge variant="secondary">{hr.pregnant_count} suspected pregnant</Badge>}
          </CardContent>
        </Card>
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
          <CardHeader><CardTitle className="text-base">Add Tracked Cat</CardTitle></CardHeader>
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
