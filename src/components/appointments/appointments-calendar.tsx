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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { DisplayDateInput } from "@/components/ui/display-date-input";
import { ClaimAppointmentDialog } from "@/components/appointments/claim-appointment-dialog";
import { AppointmentDetailDialog } from "@/components/appointments/appointment-detail-dialog";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { canUnreserveAppointment, shouldShowAppointmentStatusBadge } from "@/lib/appointments/clinic-result";
import { isAppointmentDatePast, enumerateRecurringDates } from "@/lib/appointments/slot-date";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment, Clinic, Cat } from "@/lib/types";
import type { HelpRequestOption } from "@/lib/cases/help-request-options";
import { Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

type AddAppointmentMode = "one" | "recurring";

const EMPTY_ADD_FORM = {
  mode: "one" as AddAppointmentMode,
  clinic_id: "",
  date: "",
  start_date: "",
  end_date: "",
  weekdays: [2] as number[],
  count: 1,
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Normalize DB/calendar date strings to YYYY-MM-DD for grouping. */
function appointmentDateKey(date: string): string {
  const trimmed = date.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1] : trimmed.slice(0, 10);
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - startWeekday + 1;
    const date = new Date(year, month, dayOffset);
    return {
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

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
  helpRequests: HelpRequestOption[];
  /** Pre-link claims to this case (e.g. from /appointments?caseId=…) */
  linkedHelpRequest?: HelpRequestOption | null;
  linkedCats?: Cat[];
}

export function AppointmentsCalendar({
  appointments: initial,
  clinics,
  helpRequests,
  linkedHelpRequest = null,
  linkedCats = [],
}: AppointmentsCalendarProps) {
  const router = useRouter();
  const [view, setView] = useState<"month" | "list">("month");
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlotsDate, setDaySlotsDate] = useState<string | null>(null);
  const [selectedClinics, setSelectedClinics] = useState<string[]>(clinics.map((c) => c.id));
  const [claimDialog, setClaimDialog] = useState<Appointment | null>(null);
  const [detailDialog, setDetailDialog] = useState<Appointment | null>(null);
  const [unreserveId, setUnreserveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);

  const clinicColorMap = Object.fromEntries(
    clinics.map((c, i) => [c.id, CLINIC_COLORS[i % CLINIC_COLORS.length]])
  );

  const filtered = initial.filter((a) => selectedClinics.includes(a.clinic_id));

  const grouped = filtered.reduce(
    (acc, appt) => {
      const key = appointmentDateKey(appt.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  const monthGrid = buildMonthGrid(monthCursor.year, monthCursor.month);
  const selectedDayAppointments = selectedDate ? grouped[selectedDate] ?? [] : [];
  const daySlotsAppointments = daySlotsDate
    ? (grouped[daySlotsDate] ?? []).filter((appt) => appt.status === "available")
    : [];

  function shiftMonth(delta: number) {
    setMonthCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    setSelectedDate(null);
    setDaySlotsDate(null);
  }

  function handleDayClick(date: string) {
    setSelectedDate(date);
    const available = (grouped[date] ?? []).filter((appt) => appt.status === "available");
    if (available.length > 0) {
      setDaySlotsDate(date);
    } else {
      setDaySlotsDate(null);
    }
  }

  function selectAvailableSlot(appt: Appointment) {
    if (isAppointmentDatePast(appt.date)) return;
    setDaySlotsDate(null);
    setClaimDialog(appt);
  }

  function renderAppointmentCard(appt: Appointment) {
    const pastAvailable =
      appt.status === "available" && isAppointmentDatePast(appt.date);

    return (
      <Card
        key={appt.id}
        className={cn(
          "border-l-4 cursor-pointer hover:shadow-md",
          clinicColorMap[appt.clinic_id],
          pastAvailable && "opacity-60 hover:shadow-none"
        )}
        onClick={() => openAppointment(appt)}
      >
        <CardContent className="pt-4">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-medium text-sm">{appt.clinic_name}</p>
              {appt.cat_name && <p className="text-xs text-muted-foreground">{appt.cat_name}</p>}
              {appt.reserved_by_name && appt.status !== "available" && (
                <p className="text-xs text-muted-foreground">
                  Claimed by {appt.reserved_by_name}
                </p>
              )}
              {pastAvailable && (
                <p className="text-xs text-muted-foreground">Past date · cannot claim</p>
              )}
              {appt.help_request_id && <p className="text-xs text-primary">Linked to case</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {shouldShowAppointmentStatusBadge(appt) && (
                <Badge className={cn("text-xs", APPOINTMENT_STATUS_COLORS[appt.status])}>
                  {appt.status}
                </Badge>
              )}
              {canUnreserveAppointment(appt) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={unreserveId === appt.id}
                  onClick={(e) => unreserve(appt.id, e)}
                >
                  {unreserveId === appt.id ? "…" : "Un-reserve"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function openAddDialog() {
    setAddError(null);
    setAddForm(EMPTY_ADD_FORM);
    setAddDialog(true);
  }

  function toggleWeekday(day: number) {
    setAddForm((current) => {
      const has = current.weekdays.includes(day);
      const weekdays = has
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day].sort((a, b) => a - b);
      return { ...current, weekdays };
    });
  }

  async function createAppointments() {
    const clinic = clinics.find((c) => c.id === addForm.clinic_id);
    if (!clinic) {
      setAddError("Select a clinic.");
      return;
    }

    const count = Math.max(1, addForm.count || 1);
    let dates: string[] = [];

    if (addForm.mode === "one") {
      if (!addForm.date) {
        setAddError("Enter a date like September 4, 2026.");
        return;
      }
      dates = [addForm.date];
    } else {
      if (!addForm.start_date || !addForm.end_date) {
        setAddError("Enter a start and end date for the recurring schedule.");
        return;
      }
      if (addForm.end_date < addForm.start_date) {
        setAddError("End date must be on or after the start date.");
        return;
      }
      if (addForm.weekdays.length === 0) {
        setAddError("Pick at least one weekday.");
        return;
      }
      dates = enumerateRecurringDates(addForm.start_date, addForm.end_date, addForm.weekdays);
      if (dates.length === 0) {
        setAddError("No dates match that weekday pattern in the selected range.");
        return;
      }
    }

    setAddError(null);
    setSavingAdd(true);
    const response = await fetch("/api/appointments/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        dates,
        count,
      }),
    });
    const result = await response.json().catch(() => null);
    setSavingAdd(false);

    if (!response.ok) {
      setAddError(result?.error ?? "Unable to create appointments");
      return;
    }

    setAddDialog(false);
    setAddForm(EMPTY_ADD_FORM);
    router.refresh();
  }

  async function unreserve(appointmentId: string, event?: React.MouseEvent) {
    event?.stopPropagation();
    setActionError(null);
    setUnreserveId(appointmentId);
    const response = await fetch("/api/appointments/unreserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    const result = await response.json().catch(() => null);
    setUnreserveId(null);
    if (!response.ok) {
      setActionError(result?.error ?? "Unable to release appointment");
      return;
    }
    setDetailDialog(null);
    router.refresh();
  }

  function openAppointment(appt: Appointment) {
    if (appt.status === "available" && !isAppointmentDatePast(appt.date)) {
      setClaimDialog(appt);
    } else {
      setDetailDialog(appt);
    }
  }

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      {linkedHelpRequest && (
        <div className="rounded-lg border bg-primary/5 px-4 py-3 text-sm">
          Reserving slots for{" "}
          <span className="font-medium">
            {linkedHelpRequest.case_number} — {linkedHelpRequest.contact_name}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>List</Button>
          <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>Month</Button>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add appointments
        </Button>
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
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No appointments match the selected clinics.
            </p>
          ) : (
            Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, appts]) => (
                <div key={date}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(date)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {appts.map((appt) => renderAppointmentCard(appt))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {view === "month" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">{monthLabel(monthCursor.year, monthCursor.month)}</h3>
            <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50 border-b">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((cell) => {
                const dayAppointments = grouped[cell.date] ?? [];
                const isSelected = selectedDate === cell.date;
                const isToday = cell.date === toDateKey(new Date());

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => handleDayClick(cell.date)}
                    className={cn(
                      "min-h-24 border-b border-r p-2 text-left transition-colors hover:bg-muted/40",
                      !cell.inMonth && "bg-muted/20 text-muted-foreground",
                      isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                      isToday && cell.inMonth && "font-semibold"
                    )}
                  >
                    <span className="text-sm">{cell.day}</span>
                    {dayAppointments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {dayAppointments.slice(0, 2).map((appt) => (
                          <div
                            key={appt.id}
                            className={cn(
                              "truncate rounded px-1.5 py-0.5 text-[10px] text-white",
                              appt.status === "available" && !isAppointmentDatePast(appt.date)
                                ? "bg-green-600"
                                : appt.status === "available"
                                  ? "bg-muted-foreground"
                                  : "bg-blue-600"
                            )}
                          >
                            {appt.clinic_name}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <p className="text-[10px] text-muted-foreground">
                            +{dayAppointments.length - 2} more
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate ? (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(selectedDate)}
              </h3>
              {selectedDayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments on this day.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDayAppointments.map((appt) => renderAppointmentCard(appt))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a day to view appointment details.
            </p>
          )}
        </div>
      )}

      <Dialog
        open={!!daySlotsDate}
        onOpenChange={(open) => {
          if (!open) setDaySlotsDate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Available appointments</DialogTitle>
            <DialogDescription>
              {daySlotsDate
                ? `Select a slot for ${formatDate(daySlotsDate)}`
                : "Select a slot"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {daySlotsAppointments.map((appt, index) => {
              const past = isAppointmentDatePast(appt.date);
              return (
                <button
                  key={appt.id}
                  type="button"
                  disabled={past}
                  onClick={() => selectAvailableSlot(appt)}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                    past
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium">{appt.clinic_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {past
                      ? "Past date · cannot claim"
                      : `Slot ${index + 1} · tap to reserve`}
                  </p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ClaimAppointmentDialog
        appointment={claimDialog}
        onOpenChange={(open) => !open && setClaimDialog(null)}
        helpRequests={helpRequests}
        linkedHelpRequest={linkedHelpRequest}
        cats={linkedCats}
      />

      <AppointmentDetailDialog
        appointment={detailDialog}
        onOpenChange={(open) => !open && setDetailDialog(null)}
        onUnreserve={(id) => unreserve(id)}
        unreserveLoading={unreserveId === detailDialog?.id}
      />

      <Dialog
        open={addDialog}
        onOpenChange={(open) => {
          setAddDialog(open);
          if (!open) {
            setAddError(null);
            setAddForm(EMPTY_ADD_FORM);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add appointments</DialogTitle>
            <DialogDescription>
              Create one clinic appointment, or a recurring schedule across multiple dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  addForm.mode === "one"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setAddForm((current) => ({ ...current, mode: "one" }))}
              >
                <p className="text-sm font-medium">One appointment</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A single date at one clinic
                </p>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  addForm.mode === "recurring"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setAddForm((current) => ({ ...current, mode: "recurring" }))}
              >
                <p className="text-sm font-medium">Recurring appointments</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Repeat on selected weekdays in a date range
                </p>
              </button>
            </div>

            <div className="space-y-2">
              <Label>Clinic</Label>
              <Select
                value={addForm.clinic_id}
                onValueChange={(value) => setAddForm((current) => ({ ...current, clinic_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addForm.mode === "one" ? (
              <div className="space-y-2">
                <Label htmlFor="add-appointment-date">Date</Label>
                <DisplayDateInput
                  id="add-appointment-date"
                  value={addForm.date}
                  onValueChange={(date) => setAddForm((current) => ({ ...current, date }))}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="add-appointment-start">Start date</Label>
                    <DisplayDateInput
                      id="add-appointment-start"
                      value={addForm.start_date}
                      onValueChange={(start_date) =>
                        setAddForm((current) => ({ ...current, start_date }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-appointment-end">End date</Label>
                    <DisplayDateInput
                      id="add-appointment-end"
                      value={addForm.end_date}
                      onValueChange={(end_date) =>
                        setAddForm((current) => ({ ...current, end_date }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Repeat on</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const selected = addForm.weekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={cn(
                            "rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleWeekday(day.value)}
                          aria-pressed={selected}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>
                {addForm.mode === "one"
                  ? "Appointments on this date"
                  : "Appointments per selected day"}
              </Label>
              <NumberInput
                integer
                min={1}
                emptyValue={1}
                value={addForm.count}
                onValueChange={(value) => {
                  if (typeof value === "number") {
                    setAddForm((current) => ({ ...current, count: value }));
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Each appointment is one reservable clinic slot.
              </p>
            </div>

            {addForm.mode === "recurring" &&
              addForm.start_date &&
              addForm.end_date &&
              addForm.weekdays.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const dates = enumerateRecurringDates(
                      addForm.start_date,
                      addForm.end_date,
                      addForm.weekdays
                    );
                    const total = dates.length * Math.max(1, addForm.count || 1);
                    if (dates.length === 0) {
                      return "No matching dates in this range yet.";
                    }
                    return `Will create ${total} appointment${total === 1 ? "" : "s"} across ${dates.length} day${dates.length === 1 ? "" : "s"}.`;
                  })()}
                </p>
              )}

            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <Button onClick={createAppointments} className="w-full" disabled={savingAdd}>
              {savingAdd
                ? "Creating…"
                : addForm.mode === "one"
                  ? addForm.count > 1
                    ? `Add ${addForm.count} appointments`
                    : "Add appointment"
                  : "Add recurring appointments"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
