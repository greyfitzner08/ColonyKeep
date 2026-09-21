"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimAppointmentDialog } from "@/components/appointments/claim-appointment-dialog";
import {
  LogClinicResultDialog,
  type ClinicResultAppointment,
} from "@/components/appointments/log-clinic-result-dialog";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import {
  APPOINTMENT_WEEKDAY_LABELS,
  buildMonthGrid,
  groupAppointmentsByDate,
  monthLabel,
  toDateKey,
} from "@/lib/appointments/calendar-grid";
import {
  appointmentClinicResultSummary,
  canUnreserveAppointment,
  clinicResultAgeLabel,
  clinicResultGenderLabel,
  isClinicResultDue,
  shouldShowAppointmentStatusBadge,
} from "@/lib/appointments/clinic-result";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { fosterFormFromCat } from "@/lib/cases/tracked-cat-foster";
import { trackedCatDetailsFromCat } from "@/lib/cases/tracked-cat-form";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment, Cat, ClinicFix } from "@/lib/types";
import type { HelpRequestOption } from "@/lib/cases/help-request-options";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface CaseAppointmentsSectionProps {
  helpRequest: HelpRequestOption;
  appointments: Appointment[];
  availableAppointments: Appointment[];
  cats?: Cat[];
  clinicFixes?: ClinicFix[];
  userEmail?: string;
  isAdmin?: boolean;
  /** When true, hide reserve / unreserve / log-result actions. */
  readOnly?: boolean;
}

function initialMonthCursor(appointments: Appointment[]) {
  const now = new Date();
  const upcoming = appointments
    .map((appt) => appt.date.trim().slice(0, 10))
    .filter((date) => date >= toDateKey(now))
    .sort();
  const seed = upcoming[0] ?? appointments.map((a) => a.date.trim().slice(0, 10)).sort()[0];
  if (seed) {
    const [year, month] = seed.split("-").map(Number);
    if (year && month) return { year, month: month - 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function CaseAppointmentsSection({
  helpRequest,
  appointments,
  availableAppointments,
  cats = [],
  clinicFixes = [],
  userEmail = "",
  isAdmin = false,
  readOnly = false,
}: CaseAppointmentsSectionProps) {
  const router = useRouter();
  const calendarAppointments = useMemo(() => {
    const byId = new Map<string, Appointment>();
    for (const appt of [...appointments, ...availableAppointments]) {
      byId.set(appt.id, appt);
    }
    return Array.from(byId.values());
  }, [appointments, availableAppointments]);

  const reservedIds = useMemo(
    () => new Set(appointments.map((appt) => appt.id)),
    [appointments]
  );

  const [monthCursor, setMonthCursor] = useState(() => initialMonthCursor(calendarAppointments));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<Appointment | null>(null);
  const [logTarget, setLogTarget] = useState<ClinicResultAppointment | null>(null);
  const [unreserveId, setUnreserveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () => groupAppointmentsByDate(calendarAppointments),
    [calendarAppointments]
  );
  const monthGrid = buildMonthGrid(monthCursor.year, monthCursor.month);
  const selectedDayAppointments = selectedDate ? grouped[selectedDate] ?? [] : [];
  const selectedReserved = selectedDayAppointments.filter((appt) => reservedIds.has(appt.id));
  const selectedAvailable = selectedDayAppointments.filter(
    (appt) => appt.status === "available" && !reservedIds.has(appt.id)
  );

  function shiftMonth(delta: number) {
    setMonthCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    setSelectedDate(null);
  }

  async function unreserve(appointmentId: string) {
    setError(null);
    setUnreserveId(appointmentId);
    const response = await fetch("/api/appointments/unreserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    const result = await response.json().catch(() => null);
    setUnreserveId(null);

    if (!response.ok) {
      setError(result?.error ?? "Unable to release appointment");
      return;
    }

    router.refresh();
  }

  function canLogResults(appt: Appointment) {
    if (readOnly) return false;
    if (!isClinicResultDue(appt, clinicFixes)) return false;
    return appt.reserved_by === userEmail || isAdmin;
  }

  function openLogResults(appt: Appointment) {
    const linkedCat = appt.cat_id ? cats.find((cat) => cat.id === appt.cat_id) : undefined;
    setLogTarget({
      id: appt.id,
      date: appt.date,
      clinic_name: appt.clinic_name,
      cat_id: appt.cat_id,
      cat_name: appt.cat_name,
      cat_colors: appt.cat_colors,
      cat_gender: appt.cat_gender,
      case_number: helpRequest.case_number,
      help_request_id: helpRequest.id,
      defaultDetails: linkedCat ? trackedCatDetailsFromCat(linkedCat) : undefined,
      defaultAgeCategory: linkedCat?.age_category ?? undefined,
      defaultFoster: linkedCat ? fosterFormFromCat(linkedCat) : undefined,
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-600" aria-hidden />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" aria-hidden />
          Reserved for this case
        </span>
      </div>

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

        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[32rem]">
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {APPOINTMENT_WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground sm:px-2 sm:text-xs"
                >
                  <span className="sm:hidden">{label.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((cell) => {
                const dayAppointments = grouped[cell.date] ?? [];
                const reservedCount = dayAppointments.filter((appt) =>
                  reservedIds.has(appt.id)
                ).length;
                const availableCount = dayAppointments.filter(
                  (appt) =>
                    appt.status === "available" &&
                    !reservedIds.has(appt.id) &&
                    !isAppointmentDatePast(appt.date)
                ).length;
                const isSelected = selectedDate === cell.date;
                const isToday = cell.date === toDateKey(new Date());

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    className={cn(
                      "min-h-16 border-b border-r p-1 text-left transition-colors hover:bg-muted/40 sm:min-h-24 sm:p-2",
                      !cell.inMonth && "bg-muted/20 text-muted-foreground",
                      isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                      isToday && cell.inMonth && "font-semibold"
                    )}
                  >
                    <span className="text-sm">{cell.day}</span>
                    {dayAppointments.length > 0 && (
                      <div className="mt-1 space-y-1 sm:mt-2">
                        <div className="flex flex-wrap gap-1 sm:hidden">
                          {availableCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600/15 px-1.5 text-[10px] font-medium text-green-700">
                              {availableCount}
                            </span>
                          )}
                          {reservedCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600/15 px-1.5 text-[10px] font-medium text-blue-700">
                              {reservedCount}
                            </span>
                          )}
                        </div>
                        <div className="hidden space-y-1 sm:block">
                          {dayAppointments.slice(0, 2).map((appt) => {
                            const isReserved = reservedIds.has(appt.id);
                            const pastAvailable =
                              appt.status === "available" && isAppointmentDatePast(appt.date);
                            return (
                              <div
                                key={appt.id}
                                className={cn(
                                  "truncate rounded px-1.5 py-0.5 text-[10px] text-white",
                                  isReserved
                                    ? "bg-blue-600"
                                    : pastAvailable
                                      ? "bg-muted-foreground"
                                      : "bg-green-600"
                                )}
                              >
                                {isReserved ? `Yours · ${appt.clinic_name}` : appt.clinic_name}
                              </div>
                            );
                          })}
                          {dayAppointments.length > 2 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{dayAppointments.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedDate ? (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Calendar className="h-4 w-4" />
            {formatDate(selectedDate)}
          </h3>

          {selectedDayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments on this day.</p>
          ) : (
            <div className="space-y-4">
              {selectedReserved.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Reserved for this case</h4>
                  {selectedReserved.map((appt) => {
                    const loggedSummary = appointmentClinicResultSummary(appt, clinicFixes);
                    return (
                      <Card key={appt.id} className="border-l-4 border-l-blue-600">
                        <CardContent className="flex items-start justify-between gap-4 pt-6">
                          <div className="space-y-1">
                            <p className="text-lg font-semibold">{appt.clinic_name}</p>
                            <p className="text-base text-muted-foreground">
                              {appt.cat_name ?? "No cat assigned"}
                            </p>
                            {loggedSummary && (
                              <p className="text-sm text-muted-foreground">
                                Logged:{" "}
                                {[
                                  loggedSummary.ageCategory
                                    ? clinicResultAgeLabel(loggedSummary.ageCategory)
                                    : null,
                                  loggedSummary.gender
                                    ? clinicResultGenderLabel(loggedSummary.gender)
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Cat"}{" "}
                                fixed
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {shouldShowAppointmentStatusBadge(appt, clinicFixes) && (
                              <Badge className={cn("text-sm", APPOINTMENT_STATUS_COLORS[appt.status])}>
                                {appt.status}
                              </Badge>
                            )}
                            {canLogResults(appt) && (
                              <Button size="sm" onClick={() => openLogResults(appt)}>
                                Log clinic results
                              </Button>
                            )}
                            {canUnreserveAppointment(appt, clinicFixes) &&
                              !isClinicResultDue(appt, clinicFixes) &&
                              !readOnly && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={unreserveId === appt.id}
                                  onClick={() => void unreserve(appt.id)}
                                >
                                  {unreserveId === appt.id ? "Releasing…" : "Un-reserve"}
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {!readOnly && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Available to reserve</h4>
                  {selectedAvailable.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No open slots on this day. Pick another date, or check the{" "}
                      <a href="/appointments" className="text-primary underline">
                        appointments calendar
                      </a>
                      .
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedAvailable.map((appt) => {
                        const past = isAppointmentDatePast(appt.date);
                        return (
                          <button
                            key={appt.id}
                            type="button"
                            disabled={past}
                            className={cn(
                              "rounded-lg border border-l-4 border-l-green-600 px-4 py-3 text-left transition-colors",
                              past
                                ? "cursor-not-allowed opacity-60"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => {
                              if (!past) setClaimTarget(appt);
                            }}
                          >
                            <p className="font-medium">{appt.clinic_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {past ? "Past date · cannot claim" : "Available · tap to reserve"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {readOnly && selectedReserved.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Claim this case to reserve appointment slots.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a day to reserve a slot
          {appointments.length > 0 ? " or manage this case’s appointments." : "."}
        </p>
      )}

      {calendarAppointments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No appointment slots are on the calendar yet. Check the{" "}
          <a href="/appointments" className="text-primary underline">
            appointments page
          </a>{" "}
          later.
        </p>
      )}

      <ClaimAppointmentDialog
        appointment={readOnly ? null : claimTarget}
        onOpenChange={(open) => !open && setClaimTarget(null)}
        helpRequests={[]}
        linkedHelpRequest={helpRequest}
        cats={cats}
      />

      <LogClinicResultDialog
        appointment={readOnly ? null : logTarget}
        onOpenChange={(open) => !open && setLogTarget(null)}
      />
    </div>
  );
}
