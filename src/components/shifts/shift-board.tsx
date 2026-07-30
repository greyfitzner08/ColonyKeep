"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import { SHIFT_REQUIRED_ROLES, SHIFT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Shift, ShiftRequiredRole, ShiftType } from "@/lib/types";
import { Plus, MapPin, Clock, Pencil, Trash2 } from "lucide-react";

interface ShiftBoardProps {
  shifts: Shift[];
  userEmail: string;
  isAdmin: boolean;
}

interface ShiftSlotForm {
  key: string;
  shift_type: ShiftType;
  required_roles: ShiftRequiredRole;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  volunteers_needed: number;
  notes: string;
}

interface EditFormState {
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

function newSlotKey() {
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySlot(defaults?: Partial<ShiftSlotForm>): ShiftSlotForm {
  return {
    key: newSlotKey(),
    shift_type: "event",
    required_roles: "any",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    volunteers_needed: 1,
    notes: "",
    ...defaults,
  };
}

const EMPTY_EDIT: EditFormState = {
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

function formFromShift(shift: Shift): EditFormState {
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [eventName, setEventName] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [slots, setSlots] = useState<ShiftSlotForm[]>([emptySlot()]);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT);

  const filtered = typeFilter === "all"
    ? initial
    : initial.filter((shift) => shift.shift_type === typeFilter);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of filtered) {
      const key = shift.event_name.trim() || "Untitled event";
      const list = groups.get(key) ?? [];
      list.push(shift);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([name, shifts]) => ({
      name,
      shifts: [...shifts].sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.start_time.localeCompare(b.start_time);
      }),
    }));
  }, [filtered]);

  function openCreateDialog() {
    setEventName("");
    setDefaultLocation("");
    setSlots([emptySlot()]);
    setFormError(null);
    setCreateOpen(true);
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift);
    setEditForm(formFromShift(shift));
    setFormError(null);
    setEditOpen(true);
  }

  function updateSlot(key: string, patch: Partial<ShiftSlotForm>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot))
    );
  }

  function addSlot() {
    const last = slots[slots.length - 1];
    setSlots((current) => [
      ...current,
      emptySlot({
        shift_type: last?.shift_type,
        required_roles: last?.required_roles,
        date: last?.date,
        start_time: last?.start_time,
        end_time: last?.end_time,
        location: "",
        volunteers_needed: last?.volunteers_needed ?? 1,
      }),
    ]);
  }

  function removeSlot(key: string) {
    setSlots((current) => (current.length <= 1 ? current : current.filter((slot) => slot.key !== key)));
  }

  async function claimShift(shiftId: string, action: "claim" | "unclaim") {
    await fetch("/api/shifts/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, action }),
    });
    router.refresh();
  }

  async function saveEventShifts() {
    setFormError(null);

    if (!eventName.trim()) {
      setFormError("Event name is required.");
      return;
    }

    const prepared = slots.map((slot, index) => {
      const location = (slot.location.trim() || defaultLocation).trim();
      return {
        index: index + 1,
        shift_type: slot.shift_type,
        required_roles: slot.required_roles,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        location,
        volunteers_needed: slot.volunteers_needed,
        notes: slot.notes.trim() || null,
      };
    });

    for (const slot of prepared) {
      if (!slot.date) {
        setFormError(`Shift ${slot.index}: choose a date.`);
        return;
      }
      if (!slot.start_time || !slot.end_time) {
        setFormError(`Shift ${slot.index}: set start and end times.`);
        return;
      }
      if (!slot.location) {
        setFormError(`Shift ${slot.index}: set a location (or a default event location).`);
        return;
      }
    }

    setSaving(true);
    const response = await fetch("/api/shifts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName.trim(),
        shifts: prepared.map(({ index: _index, ...shift }) => shift),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setFormError(result?.error ?? "Unable to create event shifts");
      return;
    }

    setCreateOpen(false);
    router.refresh();
  }

  async function saveEditedShift() {
    if (!editingShift) return;
    setFormError(null);
    setSaving(true);

    const response = await fetch("/api/shifts/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingShift.id,
        ...editForm,
        notes: editForm.notes || null,
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setFormError(result?.error ?? "Unable to update shift");
      return;
    }

    setEditOpen(false);
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
            <Plus className="h-4 w-4 mr-2" />Create Event
          </Button>
        )}
      </div>

      {groupedEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shifts match this filter.</p>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map((group) => (
            <section key={group.name} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">{group.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}
                  {group.shifts.length > 1
                    ? ` · ${formatDate(group.shifts[0].date)} – ${formatDate(group.shifts[group.shifts.length - 1].date)}`
                    : ` · ${formatDate(group.shifts[0].date)}`}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.shifts.map((shift) => {
                  const signedUp = shift.signed_up_emails ?? [];
                  const isSignedUp = signedUp.includes(userEmail);
                  const spotsLeft = shift.volunteers_needed - signedUp.length;

                  return (
                    <Card key={shift.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base">
                            {formatDate(shift.date)} · {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                          </CardTitle>
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
            </section>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add one event with as many shift opportunities as you need — including different days
              and roles at the same location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Event Name</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Spring Trap Day"
              />
            </div>
            <AddressAutocomplete
              label="Default location"
              defaultValue={defaultLocation}
              placeholder="Start typing an address..."
              onAddressChange={setDefaultLocation}
              onSelect={(parts) => setDefaultLocation(formatAddressPartsLine(parts))}
            />
            <p className="text-xs text-muted-foreground">
              Used for every shift unless a shift sets its own location below.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-base">Shift opportunities</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add shift
                </Button>
              </div>

              {slots.map((slot, index) => (
                <div key={slot.key} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Shift {index + 1}</p>
                    {slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeSlot(slot.key)}
                        aria-label={`Remove shift ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={(e) => updateSlot(slot.key, { date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Volunteers needed</Label>
                      <Input
                        type="number"
                        min={1}
                        value={slot.volunteers_needed}
                        onChange={(e) =>
                          updateSlot(slot.key, {
                            volunteers_needed: parseInt(e.target.value, 10) || 1,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(slot.key, { start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(slot.key, { end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Shift type</Label>
                      <Select
                        value={slot.shift_type}
                        onValueChange={(value) =>
                          updateSlot(slot.key, { shift_type: value as ShiftType })
                        }
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
                      <Label>Required role</Label>
                      <Select
                        value={slot.required_roles}
                        onValueChange={(value) =>
                          updateSlot(slot.key, { required_roles: value as ShiftRequiredRole })
                        }
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

                  <AddressAutocomplete
                    label="Location override (optional)"
                    defaultValue={slot.location}
                    placeholder={defaultLocation || "Same as event location"}
                    onAddressChange={(location) => updateSlot(slot.key, { location })}
                    onSelect={(parts) =>
                      updateSlot(slot.key, { location: formatAddressPartsLine(parts) })
                    }
                  />

                  <div className="space-y-1">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={slot.notes}
                      onChange={(e) => updateSlot(slot.key, { notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={saveEventShifts} className="w-full" disabled={saving}>
              {saving
                ? "Creating..."
                : slots.length === 1
                  ? "Create Event"
                  : `Create Event (${slots.length} shifts)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Event Name</Label>
              <Input
                value={editForm.event_name}
                onChange={(e) => setEditForm({ ...editForm, event_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Shift Type</Label>
                <Select
                  value={editForm.shift_type}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, shift_type: value as ShiftType })
                  }
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
                  value={editForm.required_roles}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, required_roles: value as ShiftRequiredRole })
                  }
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
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <AddressAutocomplete
              label="Location"
              defaultValue={editForm.location}
              onAddressChange={(location) => setEditForm({ ...editForm, location })}
              onSelect={(parts) =>
                setEditForm({ ...editForm, location: formatAddressPartsLine(parts) })
              }
            />
            <div className="space-y-1">
              <Label>Volunteers Needed</Label>
              <Input
                type="number"
                min={1}
                value={editForm.volunteers_needed}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    volunteers_needed: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={saveEditedShift} className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
