"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import { SHIFT_REQUIRED_ROLES, SHIFT_TYPES } from "@/lib/constants";
import { formatDate, formatTimeRange } from "@/lib/utils";
import type { Shift, ShiftRequiredRole, ShiftType } from "@/lib/types";
import { Plus, MapPin, Clock, Pencil, Trash2 } from "lucide-react";

interface ShiftBoardProps {
  shifts: Shift[];
  userEmail: string;
  isAdmin: boolean;
}

interface TimeSlotForm {
  key: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  volunteers_needed: number;
  notes: string;
}

interface PositionForm {
  key: string;
  name: string;
  shift_type: ShiftType;
  required_roles: ShiftRequiredRole;
  slots: TimeSlotForm[];
}

interface EditFormState {
  event_name: string;
  position_name: string;
  shift_type: ShiftType;
  required_roles: ShiftRequiredRole;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  volunteers_needed: number;
  notes: string;
}

function newKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySlot(defaults?: Partial<TimeSlotForm>): TimeSlotForm {
  return {
    key: newKey("slot"),
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    volunteers_needed: 1,
    notes: "",
    ...defaults,
  };
}

function emptyPosition(defaults?: Partial<Omit<PositionForm, "slots">> & { slots?: TimeSlotForm[] }): PositionForm {
  return {
    key: newKey("position"),
    name: "",
    shift_type: "event",
    required_roles: "any",
    slots: [emptySlot()],
    ...defaults,
  };
}

const EMPTY_EDIT: EditFormState = {
  event_name: "",
  position_name: "",
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

function positionLabel(shift: Shift) {
  const name = shift.position_name?.trim();
  return name || shiftTypeLabel(shift.shift_type);
}

function formFromShift(shift: Shift): EditFormState {
  return {
    event_name: shift.event_name,
    position_name: shift.position_name?.trim() ?? "",
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
  const [positions, setPositions] = useState<PositionForm[]>([emptyPosition()]);
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

    return Array.from(groups.entries()).map(([name, shifts]) => {
      const sorted = [...shifts].sort((a, b) => {
        const positionDiff = positionLabel(a).localeCompare(positionLabel(b));
        if (positionDiff !== 0) return positionDiff;
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.start_time.localeCompare(b.start_time);
      });

      const byPosition = new Map<string, Shift[]>();
      for (const shift of sorted) {
        const key = positionLabel(shift);
        const list = byPosition.get(key) ?? [];
        list.push(shift);
        byPosition.set(key, list);
      }

      return {
        name,
        shifts: sorted,
        positions: Array.from(byPosition.entries()).map(([positionName, positionShifts]) => ({
          name: positionName,
          shifts: positionShifts,
        })),
      };
    });
  }, [filtered]);

  function openCreateDialog() {
    setEventName("");
    setDefaultLocation("");
    setPositions([emptyPosition()]);
    setFormError(null);
    setCreateOpen(true);
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift);
    setEditForm(formFromShift(shift));
    setFormError(null);
    setEditOpen(true);
  }

  function updatePosition(key: string, patch: Partial<Omit<PositionForm, "slots">>) {
    setPositions((current) =>
      current.map((position) => (position.key === key ? { ...position, ...patch } : position))
    );
  }

  function updateSlot(positionKey: string, slotKey: string, patch: Partial<TimeSlotForm>) {
    setPositions((current) =>
      current.map((position) => {
        if (position.key !== positionKey) return position;
        return {
          ...position,
          slots: position.slots.map((slot) =>
            slot.key === slotKey ? { ...slot, ...patch } : slot
          ),
        };
      })
    );
  }

  function addPosition() {
    const last = positions[positions.length - 1];
    setPositions((current) => [
      ...current,
      emptyPosition({
        shift_type: last?.shift_type,
        required_roles: last?.required_roles,
        slots: [
          emptySlot({
            date: last?.slots[0]?.date,
            start_time: last?.slots[0]?.start_time,
            end_time: last?.slots[0]?.end_time,
            volunteers_needed: last?.slots[0]?.volunteers_needed ?? 1,
          }),
        ],
      }),
    ]);
  }

  function removePosition(key: string) {
    setPositions((current) =>
      current.length <= 1 ? current : current.filter((position) => position.key !== key)
    );
  }

  function addSlot(positionKey: string) {
    setPositions((current) =>
      current.map((position) => {
        if (position.key !== positionKey) return position;
        const last = position.slots[position.slots.length - 1];
        return {
          ...position,
          slots: [
            ...position.slots,
            emptySlot({
              date: last?.date,
              start_time: last?.start_time,
              end_time: last?.end_time,
              volunteers_needed: last?.volunteers_needed ?? 1,
            }),
          ],
        };
      })
    );
  }

  function removeSlot(positionKey: string, slotKey: string) {
    setPositions((current) =>
      current.map((position) => {
        if (position.key !== positionKey) return position;
        if (position.slots.length <= 1) return position;
        return {
          ...position,
          slots: position.slots.filter((slot) => slot.key !== slotKey),
        };
      })
    );
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

    const prepared: Array<{
      label: string;
      position_name: string;
      shift_type: ShiftType;
      required_roles: ShiftRequiredRole;
      date: string;
      start_time: string;
      end_time: string;
      location: string;
      volunteers_needed: number;
      notes: string | null;
    }> = [];

    for (const [positionIndex, position] of positions.entries()) {
      const positionName = position.name.trim();
      if (!positionName) {
        setFormError(`Position ${positionIndex + 1}: enter a position name.`);
        return;
      }

      for (const [slotIndex, slot] of position.slots.entries()) {
        const location = (slot.location.trim() || defaultLocation).trim();
        const label = `${positionName} · shift ${slotIndex + 1}`;
        prepared.push({
          label,
          position_name: positionName,
          shift_type: position.shift_type,
          required_roles: position.required_roles,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          location,
          volunteers_needed: slot.volunteers_needed,
          notes: slot.notes.trim() || null,
        });
      }
    }

    for (const slot of prepared) {
      if (!slot.date) {
        setFormError(`${slot.label}: choose a date.`);
        return;
      }
      if (!slot.start_time || !slot.end_time) {
        setFormError(`${slot.label}: set start and end times.`);
        return;
      }
      if (!slot.location) {
        setFormError(`${slot.label}: set a location (or a default event location).`);
        return;
      }
    }

    setSaving(true);
    const response = await fetch("/api/shifts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName.trim(),
        shifts: prepared.map(({ label: _label, ...shift }) => shift),
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

    if (!editForm.event_name.trim()) {
      setFormError("Event name is required.");
      return;
    }
    if (!editForm.position_name.trim()) {
      setFormError("Position name is required.");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/shifts/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingShift.id,
        ...editForm,
        event_name: editForm.event_name.trim(),
        position_name: editForm.position_name.trim(),
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

  const totalShiftCount = positions.reduce((sum, position) => sum + position.slots.length, 0);

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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
          {groupedEvents.map((group) => (
            <Card key={group.name} className="overflow-hidden">
              <CardHeader className="space-y-2 border-b bg-muted/30 pb-5">
                <CardTitle className="text-xl leading-snug">{group.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {group.positions.length} position{group.positions.length === 1 ? "" : "s"}
                  {" · "}
                  {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}
                  {group.shifts.length > 1
                    ? ` · ${formatDate(group.shifts[0].date)} – ${formatDate(group.shifts[group.shifts.length - 1].date)}`
                    : ` · ${formatDate(group.shifts[0].date)}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-5">
                {group.positions.map((position) => (
                  <div key={`${group.name}-${position.name}`} className="space-y-3">
                    <h3 className="text-base font-semibold tracking-tight">{position.name}</h3>
                    <div className="space-y-3">
                      {position.shifts.map((shift) => {
                        const signedUp = shift.signed_up_emails ?? [];
                        const isSignedUp = signedUp.includes(userEmail);
                        const spotsLeft = shift.volunteers_needed - signedUp.length;

                        return (
                          <div
                            key={shift.id}
                            className="flex flex-col gap-4 rounded-xl border bg-background p-4 sm:p-5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-2">
                                <p className="text-base font-medium leading-snug">
                                  {formatDate(shift.date)}
                                </p>
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4 shrink-0" />
                                  {formatTimeRange(shift.start_time, shift.end_time)}
                                </p>
                                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                                  <span className="min-w-0 break-words leading-relaxed">
                                    {shift.location}
                                  </span>
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge variant="secondary" className="whitespace-nowrap">
                                  {shiftTypeLabel(shift.shift_type)}
                                </Badge>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditDialog(shift)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm">
                              {signedUp.length}/{shift.volunteers_needed} volunteers signed up
                              {spotsLeft > 0
                                ? ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`
                                : ""}
                            </p>
                            {shift.notes && (
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {shift.notes}
                              </p>
                            )}
                            {isSignedUp ? (
                              <Button
                                variant="outline"
                                className="mt-auto w-full sm:w-auto sm:self-start"
                                onClick={() => claimShift(shift.id, "unclaim")}
                              >
                                Unclaim Shift
                              </Button>
                            ) : spotsLeft > 0 ? (
                              <Button
                                className="mt-auto w-full sm:w-auto sm:self-start"
                                onClick={() => claimShift(shift.id, "claim")}
                              >
                                Sign Up
                              </Button>
                            ) : (
                              <Button className="mt-auto w-full sm:w-auto sm:self-start" disabled>
                                Full
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Name the event, add volunteer positions, and give each position one or more dated
              shifts — including multi-day schedules.
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
                <Label className="text-base">Volunteer positions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPosition}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add position
                </Button>
              </div>

              {positions.map((position, positionIndex) => (
                <div key={position.key} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Position {positionIndex + 1}</p>
                    {positions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removePosition(position.key)}
                        aria-label={`Remove position ${positionIndex + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>Position name</Label>
                    <Input
                      value={position.name}
                      onChange={(e) => updatePosition(position.key, { name: e.target.value })}
                      placeholder="Registration Desk"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Shift type</Label>
                      <Select
                        value={position.shift_type}
                        onValueChange={(value) =>
                          updatePosition(position.key, { shift_type: value as ShiftType })
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
                        value={position.required_roles}
                        onValueChange={(value) =>
                          updatePosition(position.key, { required_roles: value as ShiftRequiredRole })
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Shifts for this position</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSlot(position.key)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add shift
                      </Button>
                    </div>

                    {position.slots.map((slot, slotIndex) => (
                      <div key={slot.key} className="space-y-3 rounded-md border bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {slot.date ? formatDate(slot.date) : `Shift ${slotIndex + 1}`}
                          </p>
                          {position.slots.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeSlot(position.key, slot.key)}
                              aria-label={`Remove shift ${slotIndex + 1}`}
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
                              onChange={(e) =>
                                updateSlot(position.key, slot.key, { date: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Volunteers needed</Label>
                            <NumberInput
                              integer
                              min={1}
                              emptyValue={1}
                              value={slot.volunteers_needed}
                              onValueChange={(value) => {
                                if (typeof value !== "number") return;
                                updateSlot(position.key, slot.key, {
                                  volunteers_needed: value,
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Start</Label>
                            <Input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) =>
                                updateSlot(position.key, slot.key, { start_time: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>End</Label>
                            <Input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) =>
                                updateSlot(position.key, slot.key, { end_time: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <AddressAutocomplete
                          label="Location override (optional)"
                          defaultValue={slot.location}
                          placeholder={defaultLocation || "Same as event location"}
                          onAddressChange={(location) =>
                            updateSlot(position.key, slot.key, { location })
                          }
                          onSelect={(parts) =>
                            updateSlot(position.key, slot.key, {
                              location: formatAddressPartsLine(parts),
                            })
                          }
                        />

                        <div className="space-y-1">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            value={slot.notes}
                            onChange={(e) =>
                              updateSlot(position.key, slot.key, { notes: e.target.value })
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={saveEventShifts} className="w-full" disabled={saving}>
              {saving
                ? "Creating..."
                : totalShiftCount === 1
                  ? "Create Event"
                  : `Create Event (${totalShiftCount} shifts)`}
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
            <div className="space-y-1">
              <Label>Position name</Label>
              <Input
                value={editForm.position_name}
                onChange={(e) => setEditForm({ ...editForm, position_name: e.target.value })}
                placeholder="Registration Desk"
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
              <NumberInput
                integer
                min={1}
                emptyValue={1}
                value={editForm.volunteers_needed}
                onValueChange={(value) => {
                  if (typeof value !== "number") return;
                  setEditForm({ ...editForm, volunteers_needed: value });
                }}
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
