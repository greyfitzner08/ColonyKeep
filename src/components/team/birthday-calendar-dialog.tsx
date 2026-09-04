"use client";

import { useMemo, useState } from "react";
import { Cake, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  birthdaysInMonth,
  birthdaysOnCalendarDay,
  formatBirthdayMonthDay,
  getMonthGrid,
  getWeekDays,
  startOfWeekSunday,
  type BirthdayPerson,
} from "@/lib/team-feed/birthdays";
import { cn, formatDate } from "@/lib/utils";

type CalendarView = "month" | "week";

interface BirthdayCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: BirthdayPerson[];
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BirthdayNameChip({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex max-w-full items-center rounded-md border border-pink-100 bg-pink-50 px-2 py-0.5",
        "text-xs font-medium leading-snug text-pink-950",
        "whitespace-nowrap",
        className
      )}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

export function BirthdayCalendarDialog({
  open,
  onOpenChange,
  people,
}: BirthdayCalendarDialogProps) {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [view, setView] = useState<CalendarView>("month");
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekCursor, setWeekCursor] = useState(() => startOfWeekSunday(today));

  const monthLabel = monthCursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const weekDays = useMemo(() => getWeekDays(weekCursor), [weekCursor]);
  const weekLabel = `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}`;

  const monthGrid = useMemo(
    () => getMonthGrid(monthCursor.getFullYear(), monthCursor.getMonth()),
    [monthCursor]
  );

  const monthBirthdays = useMemo(
    () => birthdaysInMonth(people, monthCursor.getFullYear(), monthCursor.getMonth()),
    [people, monthCursor]
  );

  function shiftMonth(delta: number) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function shiftWeek(delta: number) {
    setWeekCursor((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + delta * 7);
      return next;
    });
  }

  function isToday(date: Date): boolean {
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Team birthdays
          </DialogTitle>
          <DialogDescription>
            Month and day only — birth years stay private. Browse by month or week.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === "month" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "week" ? "default" : "ghost"}
              className="h-8"
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => (view === "month" ? shiftMonth(-1) : shiftWeek(-1))}
              aria-label={view === "month" ? "Previous month" : "Previous week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium">
              {view === "month" ? monthLabel : weekLabel}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => (view === "month" ? shiftMonth(1) : shiftWeek(1))}
              aria-label={view === "month" ? "Next month" : "Next week"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {view === "month" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map(({ date, inMonth }) => {
                const dayBirthdays = birthdaysOnCalendarDay(people, date);
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "min-h-[5.5rem] rounded-md border p-1.5 text-left",
                      inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                      isToday(date) && "border-pink-300 ring-1 ring-pink-200"
                    )}
                  >
                    <p className={cn("text-xs font-medium", isToday(date) && "text-pink-700")}>
                      {date.getDate()}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayBirthdays.slice(0, 2).map((person) => (
                        <BirthdayNameChip
                          key={person.full_name}
                          name={person.full_name}
                          className="px-1 py-0 text-[10px]"
                        />
                      ))}
                      {dayBirthdays.length > 2 && (
                        <p className="text-[10px] text-muted-foreground">+{dayBirthdays.length - 2}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {monthBirthdays.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  All birthdays in {monthLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {monthBirthdays.map((person) => (
                    <BirthdayNameChip
                      key={person.full_name}
                      name={`${person.full_name} · ${formatBirthdayMonthDay(person.birthday)}`}
                      className="rounded-full px-2.5 py-1"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {weekDays.map((day) => {
              const dayBirthdays = birthdaysOnCalendarDay(people, day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:gap-4",
                    isToday(day) && "border-pink-300 bg-pink-50/40"
                  )}
                >
                  <div className="flex shrink-0 items-baseline gap-2 sm:w-36 sm:flex-col sm:gap-0.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p className={cn("text-sm font-semibold", isToday(day) && "text-pink-700")}>
                      {formatDate(day)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    {dayBirthdays.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No birthdays</p>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5" aria-label={`Birthdays on ${formatDate(day)}`}>
                        {dayBirthdays.map((person) => (
                          <li key={person.full_name} className="min-w-0 max-w-full">
                            <BirthdayNameChip name={person.full_name} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
