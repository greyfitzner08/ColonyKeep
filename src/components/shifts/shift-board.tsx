"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Shift, ShiftType } from "@/lib/types";
import { Plus, MapPin, Clock } from "lucide-react";

interface ShiftBoardProps {
  shifts: Shift[];
  userEmail: string;
  isAdmin: boolean;
}

export function ShiftBoard({ shifts: initial, userEmail, isAdmin }: ShiftBoardProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    event_name: "",
    shift_type: "trapping" as ShiftType,
    required_roles: "any" as Shift["required_roles"],
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    volunteers_needed: 1,
    notes: "",
  });

  const filtered = typeFilter === "all"
    ? initial
    : initial.filter((s) => s.shift_type === typeFilter);

  async function claimShift(shiftId: string, action: "claim" | "unclaim") {
    await fetch("/api/shifts/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, action }),
    });
    router.refresh();
  }

  async function createShift() {
    setCreateError(null);
    setCreating(true);
    const response = await fetch("/api/shifts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, team_ids: [] }),
    });
    const result = await response.json().catch(() => null);
    setCreating(false);

    if (!response.ok) {
      setCreateError(result?.error ?? "Unable to create shift");
      return;
    }

    setCreateOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="trapping">Trapping</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="recovery">Recovery</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button onClick={() => { setCreateError(null); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />Create Shift</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((shift) => {
          const signedUp = shift.signed_up_emails ?? [];
          const isSignedUp = signedUp.includes(userEmail);
          const spotsLeft = shift.volunteers_needed - signedUp.length;

          return (
            <Card key={shift.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{shift.event_name}</CardTitle>
                  <Badge variant="secondary">{shift.shift_type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDate(shift.date)} · {shift.start_time} - {shift.end_time}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />{shift.location}
                </div>
                <p>{signedUp.length}/{shift.volunteers_needed} volunteers signed up</p>
                {isSignedUp ? (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => claimShift(shift.id, "unclaim")}>
                    Unclaim Shift
                  </Button>
                ) : spotsLeft > 0 ? (
                  <Button size="sm" className="w-full" onClick={() => claimShift(shift.id, "claim")}>
                    Sign Up
                  </Button>
                ) : (
                  <Button size="sm" className="w-full" disabled>Full</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Event Name</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div className="space-y-1"><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>Volunteers Needed</Label><Input type="number" min={1} value={form.volunteers_needed} onChange={(e) => setForm({ ...form, volunteers_needed: parseInt(e.target.value) || 1 })} /></div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button onClick={createShift} className="w-full" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
