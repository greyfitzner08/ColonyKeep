"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AddressAutocomplete,
  formatAddressPartsLine,
} from "@/components/forms/address-autocomplete";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { SHIFT_REQUIRED_ROLES, SHIFT_TYPES } from "@/lib/constants";
import { formatDate, formatTimeRange, cn } from "@/lib/utils";
import type { Shift, ShiftRequiredRole, ShiftType } from "@/lib/types";
import { ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";

function shiftIdentityKey(input: {
  event_name: string;
  position_name: string;
  date: string;
  start_time: string;
  end_time: string;
}) {
  return [
    input.event_name.trim().toLowerCase(),
    input.position_name.trim().toLowerCase(),
    input.date,
    input.start_time.slice(0, 5),
    input.end_time.slice(0, 5),
  ].join("|");
}

interface ShiftBoardProps {
  shifts: Shift[];
  userEmail: string;
  isAdmin: boolean;
  /** Admin-only map of lowercase email → display name for people signed up. */
  signupNamesByEmail?: Record<string, string>;
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

type PendingDestructiveAction =
  | {
      type: "delete_shifts";
      ids: string[];
      title: string;
      description: string;
      confirmLabel: string;
    }
  | {
      type: "remove_signup" | "remove_waitlist";
      shiftId: string;
      email: string;
      title: string;
      description: string;
      confirmLabel: string;
    };

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

export function ShiftBoard({
  shifts: initial,
  userEmail,
  isAdmin,
  signupNamesByEmail = {},
}: ShiftBoardProps) {
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
  const [additionalSlots, setAdditionalSlots] = useState<TimeSlotForm[]>([]);
  const [createTitle, setCreateTitle] = useState("Create Event");
  const [lockingEventName, setLockingEventName] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PendingDestructiveAction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openEvents, setOpenEvents] = useState<Set<string>>(() => new Set());

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

    return Array.from(groups.entries())
      .map(([name, shifts]) => {
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

        const dates = sorted.map((shift) => shift.date).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const whenLabel =
          startDate === endDate
            ? formatDate(startDate)
            : `${formatDate(startDate)} – ${formatDate(endDate)}`;

        const filled = sorted.reduce(
          (sum, shift) => sum + (shift.signed_up_emails?.length ?? 0),
          0
        );
        const needed = sorted.reduce((sum, shift) => sum + shift.volunteers_needed, 0);

        return {
          name,
          shifts: sorted,
          whenLabel,
          startDate,
          filled,
          needed,
          positions: Array.from(byPosition.entries()).map(([positionName, positionShifts]) => ({
            name: positionName,
            shifts: positionShifts,
          })),
        };
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [filtered]);

  function toggleEvent(name: string) {
    setOpenEvents((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function openCreateDialog() {
    setEventName("");
    setDefaultLocation("");
    setPositions([emptyPosition()]);
    setFormError(null);
    setCreateTitle("Create Event");
    setLockingEventName(false);
    setCreateOpen(true);
  }

  function openAddShiftsToEvent(eventGroupName: string, eventShifts: Shift[]) {
    const sample = eventShifts[0];
    // Start blank so "Add shifts" never clones an existing slot by accident.
    // Keep only event-level defaults (location / type / role).
    setEventName(eventGroupName);
    setDefaultLocation(sample?.location ?? "");
    setPositions([
      emptyPosition({
        shift_type: sample?.shift_type ?? "event",
        required_roles: sample?.required_roles ?? "any",
        slots: [emptySlot()],
      }),
    ]);
    setFormError(null);
    setCreateTitle(`Add shifts · ${eventGroupName}`);
    setLockingEventName(true);
    setCreateOpen(true);
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift);
    setEditForm(formFromShift(shift));
    setAdditionalSlots([]);
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

  function addAdditionalSlot() {
    setAdditionalSlots((current) => {
      const last = current[current.length - 1];
      return [
        ...current,
        emptySlot({
          // Leave date empty so save cannot silently clone this shift.
          date: "",
          start_time: last?.start_time || editForm.start_time,
          end_time: last?.end_time || editForm.end_time,
          location: last?.location || "",
          volunteers_needed: last?.volunteers_needed ?? editForm.volunteers_needed ?? 1,
        }),
      ];
    });
  }

  function updateAdditionalSlot(key: string, patch: Partial<TimeSlotForm>) {
    setAdditionalSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot))
    );
  }

  function removeAdditionalSlot(key: string) {
    setAdditionalSlots((current) => current.filter((slot) => slot.key !== key));
  }

  async function claimShift(
    shiftId: string,
    action: "claim" | "unclaim" | "waitlist" | "leave_waitlist"
  ) {
    if (action === "claim" || action === "waitlist") {
      const shift = initial.find((row) => row.id === shiftId);
      if (shift && isAppointmentDatePast(shift.date)) return;
    }
    await fetch("/api/shifts/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, action }),
    });
    router.refresh();
  }

  function openDestructiveConfirm(target: PendingDestructiveAction) {
    setFormError(null);
    if (editOpen) {
      setEditOpen(false);
      setEditingShift(null);
      window.setTimeout(() => setDeleteTarget(target), 80);
      return;
    }
    setDeleteTarget(target);
  }

  async function confirmDestructiveAction() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFormError(null);
    try {
      if (deleteTarget.type === "remove_signup" || deleteTarget.type === "remove_waitlist") {
        const response = await fetch("/api/shifts/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shiftId: deleteTarget.shiftId,
            action: deleteTarget.type === "remove_waitlist" ? "remove_waitlist" : "remove",
            email: deleteTarget.email,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setFormError(
            result?.error ??
              (deleteTarget.type === "remove_waitlist"
                ? "Unable to remove from waitlist"
                : "Unable to remove signup")
          );
          return;
        }
      } else if (deleteTarget.type === "delete_shifts") {
        if (deleteTarget.ids.length === 0) return;
        const response = await fetch("/api/shifts/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: deleteTarget.ids }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setFormError(result?.error ?? "Unable to delete");
          return;
        }
      }
      setDeleteTarget(null);
      setEditOpen(false);
      setEditingShift(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function requestDeleteShift(shift: Shift) {
    const signupCount = shift.signed_up_emails?.length ?? 0;
    openDestructiveConfirm({
      type: "delete_shifts",
      ids: [shift.id],
      title: "Are you sure you would like to delete this shift?",
      description:
        signupCount > 0
          ? `This permanently removes ${formatDate(shift.date)} (${formatTimeRange(shift.start_time, shift.end_time)}) and clears ${signupCount} signup${signupCount === 1 ? "" : "s"}. This cannot be undone.`
          : `This permanently removes ${formatDate(shift.date)} (${formatTimeRange(shift.start_time, shift.end_time)}). This cannot be undone.`,
      confirmLabel: "Yes, delete shift",
    });
  }

  function requestDeletePosition(eventName: string, positionName: string, shifts: Shift[]) {
    const signupCount = shifts.reduce(
      (sum, shift) => sum + (shift.signed_up_emails?.length ?? 0),
      0
    );
    openDestructiveConfirm({
      type: "delete_shifts",
      ids: shifts.map((shift) => shift.id),
      title: `Are you sure you would like to delete the position "${positionName}"?`,
      description:
        signupCount > 0
          ? `This permanently deletes ${shifts.length} shift${shifts.length === 1 ? "" : "s"} under ${eventName} and clears ${signupCount} signup${signupCount === 1 ? "" : "s"}. This cannot be undone.`
          : `This permanently deletes ${shifts.length} shift${shifts.length === 1 ? "" : "s"} under ${eventName}. This cannot be undone.`,
      confirmLabel: "Yes, delete position",
    });
  }

  function requestDeleteEvent(eventName: string, shifts: Shift[]) {
    const signupCount = shifts.reduce(
      (sum, shift) => sum + (shift.signed_up_emails?.length ?? 0),
      0
    );
    openDestructiveConfirm({
      type: "delete_shifts",
      ids: shifts.map((shift) => shift.id),
      title: `Are you sure you would like to delete the event "${eventName}"?`,
      description:
        signupCount > 0
          ? `This permanently deletes the whole event (${shifts.length} shift${shifts.length === 1 ? "" : "s"}) and clears ${signupCount} signup${signupCount === 1 ? "" : "s"}. This cannot be undone.`
          : `This permanently deletes the whole event (${shifts.length} shift${shifts.length === 1 ? "" : "s"}). This cannot be undone.`,
      confirmLabel: "Yes, delete event",
    });
  }

  function requestRemoveSignup(shiftId: string, email: string) {
    const name = signupLabel(email);
    openDestructiveConfirm({
      type: "remove_signup",
      shiftId,
      email,
      title: "Are you sure you would like to remove this signup?",
      description: `This removes ${name} from the shift. If anyone is waitlisted, the next person is moved into the open spot.`,
      confirmLabel: "Yes, remove signup",
    });
  }

  function requestRemoveWaitlist(shiftId: string, email: string) {
    const name = signupLabel(email);
    openDestructiveConfirm({
      type: "remove_waitlist",
      shiftId,
      email,
      title: "Are you sure you would like to remove this person from the waitlist?",
      description: `This removes ${name} from the waitlist.`,
      confirmLabel: "Yes, remove from waitlist",
    });
  }

  function signupLabel(email: string) {
    const key = email.trim().toLowerCase();
    return signupNamesByEmail[key] || email;
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

    const existingKeys = new Set(
      initial.map((shift) =>
        shiftIdentityKey({
          event_name: shift.event_name,
          position_name: positionLabel(shift),
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
        })
      )
    );
    const batchKeys = new Set<string>();

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

      const key = shiftIdentityKey({
        event_name: eventName,
        position_name: slot.position_name,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
      if (batchKeys.has(key)) {
        setFormError(`${slot.label}: this matches another new shift in this form.`);
        return;
      }
      if (existingKeys.has(key)) {
        setFormError(
          `${slot.label}: a shift with this position, date, and time already exists on this event.`
        );
        return;
      }
      batchKeys.add(key);
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

    const existingKeys = new Set(
      initial.map((shift) =>
        shiftIdentityKey({
          event_name: shift.event_name,
          position_name: positionLabel(shift),
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
        })
      )
    );
    // The edited shift may still match its own identity until saved — exclude it.
    existingKeys.delete(
      shiftIdentityKey({
        event_name: editingShift.event_name,
        position_name: positionLabel(editingShift),
        date: editingShift.date,
        start_time: editingShift.start_time,
        end_time: editingShift.end_time,
      })
    );

    const editedKey = shiftIdentityKey({
      event_name: editForm.event_name,
      position_name: editForm.position_name,
      date: editForm.date,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
    });
    if (existingKeys.has(editedKey)) {
      setFormError(
        "Another shift already uses this event, position, date, and time."
      );
      return;
    }

    const batchKeys = new Set<string>([editedKey]);

    for (const [index, slot] of additionalSlots.entries()) {
      const location = (slot.location.trim() || editForm.location).trim();
      const label = `Additional shift ${index + 1}`;
      if (!slot.date) {
        setFormError(`${label}: choose a date.`);
        return;
      }
      if (!slot.start_time || !slot.end_time) {
        setFormError(`${label}: set start and end times.`);
        return;
      }
      if (!location) {
        setFormError(`${label}: set a location.`);
        return;
      }

      const key = shiftIdentityKey({
        event_name: editForm.event_name,
        position_name: editForm.position_name,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
      if (batchKeys.has(key) || existingKeys.has(key)) {
        setFormError(
          `${label}: a shift with this position, date, and time already exists.`
        );
        return;
      }
      batchKeys.add(key);
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

    if (!response.ok) {
      setSaving(false);
      setFormError(result?.error ?? "Unable to update shift");
      return;
    }

    if (additionalSlots.length > 0) {
      const createResponse = await fetch("/api/shifts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: editForm.event_name.trim(),
          shifts: additionalSlots.map((slot) => ({
            position_name: editForm.position_name.trim(),
            shift_type: editForm.shift_type,
            required_roles: editForm.required_roles,
            date: slot.date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            location: (slot.location.trim() || editForm.location).trim(),
            volunteers_needed: slot.volunteers_needed,
            notes: slot.notes.trim() || null,
          })),
        }),
      });
      const createResult = await createResponse.json().catch(() => null);
      setSaving(false);

      if (!createResponse.ok) {
        setFormError(
          createResult?.error ??
            "Saved this shift, but could not create the additional shifts."
        );
        router.refresh();
        return;
      }
    } else {
      setSaving(false);
    }

    setEditOpen(false);
    setEditingShift(null);
    setAdditionalSlots([]);
    router.refresh();
  }

  const totalShiftCount = positions.reduce((sum, position) => sum + position.slots.length, 0);

  function shiftSignupSummary(shift: Shift) {
    const signedUp = shift.signed_up_emails ?? [];
    const waitlist = shift.waitlist_emails ?? [];
    const spotsLeft = Math.max(0, shift.volunteers_needed - signedUp.length);
    return {
      signedUp,
      waitlist,
      spotsLeft,
      pastDate: isAppointmentDatePast(shift.date),
    };
  }

  function ShiftClaimButton({
    shift,
    className,
  }: {
    shift: Shift;
    className?: string;
  }) {
    const { signedUp, waitlist, spotsLeft, pastDate } = shiftSignupSummary(shift);
    const emailLower = userEmail.trim().toLowerCase();
    const isSignedUp = signedUp.some((email) => email.toLowerCase() === emailLower);
    const waitlistIndex = waitlist.findIndex((email) => email.toLowerCase() === emailLower);
    const isWaitlisted = waitlistIndex >= 0;

    if (isSignedUp) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={className}
          onClick={() => claimShift(shift.id, "unclaim")}
        >
          Unclaim
        </Button>
      );
    }
    if (pastDate) {
      return (
        <Button size="sm" className={className} disabled>
          Past date
        </Button>
      );
    }
    if (spotsLeft > 0) {
      return (
        <Button size="sm" className={className} onClick={() => claimShift(shift.id, "claim")}>
          Sign Up
        </Button>
      );
    }
    if (isWaitlisted) {
      return (
        <Button
          variant="outline"
          size="sm"
          className={className}
          onClick={() => claimShift(shift.id, "leave_waitlist")}
        >
          Leave waitlist (#{waitlistIndex + 1})
        </Button>
      );
    }
    return (
      <Button
        variant="secondary"
        size="sm"
        className={className}
        onClick={() => claimShift(shift.id, "waitlist")}
      >
        Join waitlist
      </Button>
    );
  }

  function AdminPeopleLists({ shift }: { shift: Shift }) {
    if (!isAdmin) return null;
    const signedUp = shift.signed_up_emails ?? [];
    const waitlist = shift.waitlist_emails ?? [];
    if (signedUp.length === 0 && waitlist.length === 0) return null;

    return (
      <div className="space-y-2">
        {signedUp.length > 0 ? (
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Signed up</p>
            <ul className="mt-1.5 space-y-1.5">
              {signedUp.map((email) => (
                <li key={email} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{signupLabel(email)}</span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-destructive hover:underline"
                    onClick={() => requestRemoveSignup(shift.id, email)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {waitlist.length > 0 ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2">
            <p className="text-xs font-medium text-amber-900/80">Waitlist</p>
            <ul className="mt-1.5 space-y-1.5">
              {waitlist.map((email, index) => (
                <li key={email} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-amber-950">
                    #{index + 1} {signupLabel(email)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-destructive hover:underline"
                    onClick={() => requestRemoveWaitlist(shift.id, email)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-full text-sm sm:w-[200px]">
            <SelectValue placeholder="Shift type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SHIFT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}
      </div>

      {groupedEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No shifts match this filter.</p>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {groupedEvents.map((event) => {
            const isOpen = openEvents.has(event.name);
            return (
              <article
                key={event.name}
                className={cn(
                  "overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-sm",
                  "border-l-4 border-l-primary"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5",
                    isOpen ? "bg-primary/10" : "bg-primary/5"
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggleEvent(event.name)}
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Event
                      </p>
                      <h2 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                        {event.name}
                      </h2>
                      <p className="text-base font-semibold text-primary sm:text-lg">
                        {event.whenLabel}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.positions.length} position
                        {event.positions.length === 1 ? "" : "s"} · {event.shifts.length}{" "}
                        shift
                        {event.shifts.length === 1 ? "" : "s"} · {event.filled}/{event.needed}{" "}
                        filled
                        {!isOpen ? " · tap to view shifts" : ""}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-5 w-5 shrink-0 text-primary transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {isAdmin && (
                    <div className="flex shrink-0 flex-wrap gap-2 sm:pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/30 bg-background"
                        onClick={() => openAddShiftsToEvent(event.name, event.shifts)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add shifts
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => requestDeleteEvent(event.name, event.shifts)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="divide-y border-t border-primary/15 bg-background">
                    {event.positions.map((position) => (
                      <section
                        key={`${event.name}-${position.name}`}
                        className="border-l-4 border-l-secondary-foreground/25 bg-secondary/30 px-4 py-4 sm:px-5"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-secondary-foreground">
                            {position.name}
                          </h3>
                          {isAdmin && (
                            <button
                              type="button"
                              className="text-xs text-destructive hover:underline"
                              onClick={() =>
                                requestDeletePosition(
                                  event.name,
                                  position.name,
                                  position.shifts
                                )
                              }
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <ul className="space-y-3">
                          {position.shifts.map((shift) => {
                            const { signedUp, waitlist, spotsLeft } = shiftSignupSummary(shift);
                            return (
                              <li
                                key={shift.id}
                                className={cn(
                                  "rounded-xl border border-border bg-background p-3 shadow-sm sm:p-4",
                                  "border-l-4 border-l-accent-foreground/30",
                                  spotsLeft > 0 && "bg-primary/[0.03]"
                                )}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="font-semibold">
                                        {formatDate(shift.date)}
                                      </span>
                                      <span className="tabular-nums text-muted-foreground">
                                        {formatTimeRange(shift.start_time, shift.end_time)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {shift.location}
                                    </p>
                                    {typeFilter === "all" ? (
                                      <p className="text-xs text-muted-foreground">
                                        {shiftTypeLabel(shift.shift_type)}
                                      </p>
                                    ) : null}
                                    {shift.notes ? (
                                      <p className="text-sm text-muted-foreground">
                                        {shift.notes}
                                      </p>
                                    ) : null}
                                    <AdminPeopleLists shift={shift} />
                                  </div>

                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:flex-col md:items-stretch lg:flex-row lg:items-center">
                                    <div className="text-sm tabular-nums sm:min-w-[5.5rem] md:text-right">
                                      <p>
                                        <span className="font-semibold">
                                          {signedUp.length}/{shift.volunteers_needed}
                                        </span>
                                        <span
                                          className={cn(
                                            spotsLeft > 0
                                              ? "text-primary"
                                              : "text-muted-foreground"
                                          )}
                                        >
                                          {spotsLeft > 0
                                            ? " open"
                                            : signedUp.length > 0
                                              ? " full"
                                              : ""}
                                        </span>
                                      </p>
                                      {waitlist.length > 0 ? (
                                        <p className="text-xs text-amber-800/90">
                                          {waitlist.length} waitlisted
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {isAdmin && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            title="Edit shift"
                                            onClick={() => openEditDialog(shift)}
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                                            title="Delete shift"
                                            onClick={() => requestDeleteShift(shift)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                      <ShiftClaimButton
                                        shift={shift}
                                        className="h-10 flex-1 sm:flex-none sm:min-w-[7.5rem]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createTitle}</DialogTitle>
            <DialogDescription>
              {lockingEventName
                ? "Enter a new position or reuse an existing one, then set date and times for each new shift. Fields start blank so nothing is duplicated by mistake."
                : "Name the event, add volunteer positions, and give each position one or more dated shifts — including multi-day schedules."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Event Name</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Spring Trap Day"
                disabled={lockingEventName}
              />
            </div>
            {lockingEventName && (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Existing positions:{" "}
                {Array.from(
                  new Set(
                    initial
                      .filter((shift) => shift.event_name.trim() === eventName.trim())
                      .map((shift) => positionLabel(shift))
                  )
                ).join(", ") || "none yet"}
                . Reuse a name to add another shift to that position.
              </p>
            )}
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
                ? lockingEventName
                  ? "Adding..."
                  : "Creating..."
                : lockingEventName
                  ? totalShiftCount === 1
                    ? "Add shift to event"
                    : `Add ${totalShiftCount} shifts to event`
                  : totalShiftCount === 1
                    ? "Create Event"
                    : `Create Event (${totalShiftCount} shifts)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingShift(null);
            setAdditionalSlots([]);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>
              Update this shift, or add more dated shifts for the same event and position.
            </DialogDescription>
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

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Additional shifts</p>
                  <p className="text-xs text-muted-foreground">
                    Same event and position · pick a date (starts blank) · times copy as a starting
                    point · optional locations default to this shift’s location
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAdditionalSlot}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add shift
                </Button>
              </div>

              {additionalSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No extra shifts yet. Use Add shift to create more dates or times for this
                  position.
                </p>
              ) : (
                additionalSlots.map((slot, slotIndex) => (
                  <div key={slot.key} className="space-y-3 rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {slot.date ? formatDate(slot.date) : `Additional shift ${slotIndex + 1}`}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeAdditionalSlot(slot.key)}
                        aria-label={`Remove additional shift ${slotIndex + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={slot.date}
                          onChange={(e) =>
                            updateAdditionalSlot(slot.key, { date: e.target.value })
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
                            updateAdditionalSlot(slot.key, { volunteers_needed: value });
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
                            updateAdditionalSlot(slot.key, { start_time: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>End</Label>
                        <Input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) =>
                            updateAdditionalSlot(slot.key, { end_time: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <AddressAutocomplete
                      label="Location (optional)"
                      defaultValue={slot.location}
                      placeholder={editForm.location || "Same as this shift"}
                      onAddressChange={(location) =>
                        updateAdditionalSlot(slot.key, { location })
                      }
                      onSelect={(parts) =>
                        updateAdditionalSlot(slot.key, {
                          location: formatAddressPartsLine(parts),
                        })
                      }
                    />
                    <div className="space-y-1">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={slot.notes}
                        onChange={(e) =>
                          updateAdditionalSlot(slot.key, { notes: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              {editingShift && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                  disabled={saving || deleting}
                  onClick={() => requestDeleteShift(editingShift)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete shift
                </Button>
              )}
              <Button onClick={saveEditedShift} className="w-full flex-1" disabled={saving || deleting}>
                {saving
                  ? "Saving..."
                  : additionalSlots.length > 0
                    ? `Save + add ${additionalSlots.length} shift${additionalSlots.length === 1 ? "" : "s"}`
                    : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.title ?? "Are you sure you would like to delete this?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.description ?? "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDestructiveAction();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Working..." : deleteTarget?.confirmLabel ?? "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
