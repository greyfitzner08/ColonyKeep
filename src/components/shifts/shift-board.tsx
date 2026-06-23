"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHIFT_REQUIRED_ROLES, SHIFT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Shift, ShiftRequiredRole, ShiftType } from "@/lib/types";
import { Plus, MapPin, Clock, Pencil } from "lucide-react";

interface ShiftBoardProps {
  shifts: Shift[];
  userEmail: string;
  isAdmin: boolean;
}

interface ShiftFormState {
  event_name: string;
  shift_type: ShiftType;
  required_roles: ShiftRequiredRole;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  volunteers_needed: number;
  notes: string;
}

const EMPTY_FORM: ShiftFormState = {
  event_name: "",
  shift_type: "event",
  required_roles: "any",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  volunteers_needed: 1,
  notes: "",
};

function shiftTypeLabel(type: ShiftType) {
  return SHIFT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

function formFromShift(shift: Shift): ShiftFormState {
  return {
    event_name: shift.event_name,
    shift_type: shift.shift_type,
    required_roles: shift.required_roles,
    date: shift.date,
    start_time: shift.start_time.slice(0, 5),
    end_time: shift.end_time.slice(0, 5),
    location: shift.location,
    volunteers_needed: shift.volunteers_needed,
    notes: shift.notes ?? "",
  };
}

export function ShiftBoard({ shifts: initial, userEmail, isAdmin }: ShiftBoardProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShiftFormState>(EMPTY_FORM);

  const filtered = typeFilter === "all"
    ? initial
    : initial.filter((shift) => shift.shift_type === typeFilter);

  function openCreateDialog() {
    setEditingShift(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift);
    setForm(formFromShift(shift));
    setFormError(null);
    setDialogOpen(true);
  }

  async function claimShift(shiftId: string, action: "claim" | "unclaim") {
    await fetch("/api/shifts/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, action }),
    });
    router.refresh();
  }

  async function saveShift() {
    setFormError(null);
    setSaving(true);

    const payload = {
      ...form,
      notes: form.notes || null,
      team_ids: editingShift?.team_ids ?? [],
    };

    const response = await fetch(editingShift ? "/api/shifts/update" : "/api/shifts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingShift ? { id: editingShift.id, ...payload } : payload),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setFormError(result?.error ?? `Unable to ${editingShift ? "update" : "create"} shift`);
      return;
    }

    setDialogOpen(false);
    setEditingShift(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Shift type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SHIFT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />Create Shift
          </Button>
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
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base">{shift.event_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{shiftTypeLabel(shift.shift_type)}</Badge>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(shift)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDate(shift.date)} · {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />{shift.location}
                </div>
                <p>
                  {signedUp.length}/{shift.volunteers_needed} volunteers signed up
                </p>
                {shift.notes && (
                  <p className="text-muted-foreground">{shift.notes}</p>
                )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift" : "Create Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Event Name</Label>
              <Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Shift Type</Label>
                <Select
                  value={form.shift_type}
                  onValueChange={(value) => setForm({ ...form, shift_type: value as ShiftType })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Required Role</Label>
                <Select
                  value={form.required_roles}
                  onValueChange={(value) => setForm({ ...form, required_roles: value as ShiftRequiredRole })}
                >
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {SHIFT_REQUIRED_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Volunteers Needed</Label>
              <Input
                type="number"
                min={1}
                value={form.volunteers_needed}
                onChange={(e) => setForm({ ...form, volunteers_needed: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={saveShift} className="w-full" disabled={saving}>
              {saving ? "Saving..." : editingShift ? "Save Changes" : "Create Shift"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
