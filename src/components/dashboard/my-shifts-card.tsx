"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTimeRange } from "@/lib/utils";
import { getShiftStart, getShiftTiming } from "@/lib/shifts/countdown";
import type { Shift } from "@/lib/types";
import { CalendarDays, Clock } from "lucide-react";

interface MyShiftsCardProps {
  shifts: Shift[];
}

function countdownLabel(shift: Shift, now: Date): string {
  const timing = getShiftTiming(shift, now);

  if (timing === "ended") return "Ended";
  if (timing === "in_progress") return "In progress now";

  const start = getShiftStart(shift.date, shift.start_time);
  return `Starts in ${formatDistanceToNowStrict(start)}`;
}

export function MyShiftsCard({ shifts }: MyShiftsCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const upcoming = shifts
    .filter((shift) => getShiftTiming(shift, now) !== "ended")
    .sort(
      (a, b) =>
        getShiftStart(a.date, a.start_time).getTime() -
        getShiftStart(b.date, b.start_time).getTime()
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          My Upcoming Shifts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>You are not signed up for any upcoming shifts.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/shift-board">Browse shift board</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((shift) => {
              const timing = getShiftTiming(shift, now);
              return (
                <div
                  key={shift.id}
                  className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{shift.event_name}</p>
                    {shift.position_name?.trim() && (
                      <p className="text-sm">{shift.position_name.trim()}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(shift.date)} · {formatTimeRange(shift.start_time, shift.end_time)}
                    </p>
                    {shift.location && (
                      <p className="text-xs text-muted-foreground">{shift.location}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge
                      variant={timing === "in_progress" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {countdownLabel(shift, now)}
                    </Badge>
                    <Badge variant="outline">{shift.shift_type}</Badge>
                  </div>
                </div>
              );
            })}
            <Button asChild variant="link" className="px-0">
              <Link href="/shift-board">View shift board</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
