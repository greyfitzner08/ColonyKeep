"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment, Clinic } from "@/lib/types";
import { Plus, Calendar } from "lucide-react";

const CLINIC_COLORS = [
  "border-l-blue-500",
  "border-l-green-500",
  "border-l-purple-500",
  "border-l-orange-500",
  "border-l-pink-500",
];

interface AppointmentsCalendarProps {
  appointments: Appointment[];
  clinics: Clinic[];
  helpRequests: { id: string; case_number: string; contact_name: string }[];
}

export function AppointmentsCalendar({
  appointments: initial,
  clinics,
  helpRequests,
}: AppointmentsCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<"month" | "list">("list");
  const [selectedClinics, setSelectedClinics] = useState<string[]>(clinics.map((c) => c.id));
  const [claimDialog, setClaimDialog] = useState<Appointment | null>(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({ clinic_id: "", date: "", count: 5 });
  const [claimForm, setClaimForm] = useState({ help_request_id: "", cat_name: "" });
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);

  const clinicColorMap = Object.fromEntries(
    clinics.map((c, i) => [c.id, CLINIC_COLORS[i % CLINIC_COLORS.length]])
  );

  const filtered = initial.filter((a) => selectedClinics.includes(a.clinic_id));

  const grouped = filtered.reduce(
    (acc, appt) => {
      const key = appt.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  async function bulkCreate() {
    const clinic = clinics.find((c) => c.id === bulkForm.clinic_id);
    if (!clinic) {
      setBulkError("Select a clinic before creating slots.");
      return;
    }
    setBulkError(null);
    setSavingBulk(true);
    const response = await fetch("/api/appointments/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      clinic_id: clinic.id,
      clinic_name: clinic.name,
      date: bulkForm.date,
      count: bulkForm.count,
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingBulk(false);

    if (!response.ok) {
      setBulkError(result?.error ?? "Unable to create appointment slots");
      return;
    }

    setBulkDialog(false);
    router.refresh();
  }

  async function claimSlot() {
    if (!claimDialog || !claimForm.help_request_id) return;
    setClaimError(null);
    setSavingClaim(true);
    const response = await fetch("/api/appointments/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: claimDialog.id,
        helpRequestId: claimForm.help_request_id,
        catDetails: { name: claimForm.cat_name },
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingClaim(false);

    if (!response.ok) {
      setClaimError(result?.error ?? "Unable to reserve appointment");
      return;
    }

    setClaimDialog(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>List</Button>
          <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>Month</Button>
        </div>
        <Button onClick={() => { setBulkError(null); setBulkDialog(true); }}><Plus className="h-4 w-4 mr-2" />Bulk Create Slots</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="flex items-center gap-2">
            <Checkbox
              id={clinic.id}
              checked={selectedClinics.includes(clinic.id)}
              onCheckedChange={(checked) => {
                setSelectedClinics(
                  checked
                    ? [...selectedClinics, clinic.id]
                    : selectedClinics.filter((id) => id !== clinic.id)
                );
              }}
            />
            <Label htmlFor={clinic.id}>{clinic.name}</Label>
          </div>
        ))}
      </div>

      {view === "list" && (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, appts]) => (
              <div key={date}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />{formatDate(date)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {appts.map((appt) => (
                    <Card
                      key={appt.id}
                      className={cn("border-l-4 cursor-pointer hover:shadow-md", clinicColorMap[appt.clinic_id])}
                      onClick={() => appt.status === "available" && setClaimDialog(appt)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{appt.clinic_name}</p>
                            {appt.cat_name && <p className="text-xs text-muted-foreground">{appt.cat_name}</p>}
                            {appt.help_request_id && <p className="text-xs text-primary">Linked to case</p>}
                          </div>
                          <Badge className={cn("text-xs", APPOINTMENT_STATUS_COLORS[appt.status])}>
                            {appt.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={!!claimDialog} onOpenChange={() => { setClaimError(null); setClaimDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Appointment</DialogTitle>
            <DialogDescription>
              Link this slot to a help request case
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Help Request</Label>
              <Select value={claimForm.help_request_id} onValueChange={(v) => setClaimForm({ ...claimForm, help_request_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select case" /></SelectTrigger>
                <SelectContent>
                  {helpRequests.map((hr) => (
                    <SelectItem key={hr.id} value={hr.id}>{hr.case_number} — {hr.contact_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cat Name</Label>
              <Input value={claimForm.cat_name} onChange={(e) => setClaimForm({ ...claimForm, cat_name: e.target.value })} />
            </div>
            {claimError && <p className="text-sm text-destructive">{claimError}</p>}
            <Button onClick={claimSlot} className="w-full" disabled={savingClaim}>
              {savingClaim ? "Reserving..." : "Reserve Slot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Create Slots</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clinic</Label>
              <Select value={bulkForm.clinic_id} onValueChange={(v) => setBulkForm({ ...bulkForm, clinic_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={bulkForm.date} onChange={(e) => setBulkForm({ ...bulkForm, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Number of Slots</Label><Input type="number" min={1} value={bulkForm.count} onChange={(e) => setBulkForm({ ...bulkForm, count: parseInt(e.target.value) || 1 })} /></div>
            {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}
            <Button onClick={bulkCreate} className="w-full" disabled={savingBulk}>
              {savingBulk ? "Creating..." : "Create Slots"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
