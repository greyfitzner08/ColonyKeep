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
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { ClaimAppointmentDialog } from "@/components/appointments/claim-appointment-dialog";
import { AppointmentDetailDialog } from "@/components/appointments/appointment-detail-dialog";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { canUnreserveAppointment, shouldShowAppointmentStatusBadge } from "@/lib/appointments/clinic-result";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { formatDate, parseDisplayDate, cn } from "@/lib/utils";
import type { Appointment, Clinic, Cat } from "@/lib/types";
import type { HelpRequestOption } from "@/lib/cases/help-request-options";
import { Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({ clinic_id: "", date: "", count: 5 });
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);

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

  async function bulkCreate() {
    const clinic = clinics.find((c) => c.id === bulkForm.clinic_id);
    if (!clinic) {
      setBulkError("Select a clinic before creating slots.");
      return;
    }
    const isoDate = parseDisplayDate(bulkForm.date);
    if (!isoDate) {
      setBulkError("Enter the date as DD-MM-YYYY.");
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
        date: isoDate,
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
                <div className="space-y-3">
                  {selectedDayAppointments.some((appt) => appt.status === "available") && (
                    <p className="text-sm text-muted-foreground">
                      Available slots for this day are shown in the selection dialog.
                    </p>
                  )}
                  {selectedDayAppointments.some((appt) => appt.status !== "available") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedDayAppointments
                        .filter((appt) => appt.status !== "available")
                        .map((appt) => renderAppointmentCard(appt))}
                    </div>
                  )}
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
            <div className="space-y-2">
              <Label htmlFor="bulk-create-date">Date (DD-MM-YYYY)</Label>
              <Input
                id="bulk-create-date"
                type="text"
                inputMode="numeric"
                placeholder="DD-MM-YYYY"
                value={bulkForm.date}
                onChange={(e) => setBulkForm({ ...bulkForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Slots</Label>
              <NumberInput
                integer
                min={1}
                emptyValue={1}
                value={bulkForm.count}
                onValueChange={(value) => {
                  if (typeof value === "number") setBulkForm({ ...bulkForm, count: value });
                }}
              />
            </div>
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
