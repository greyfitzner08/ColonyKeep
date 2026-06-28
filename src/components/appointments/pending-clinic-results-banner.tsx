"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogClinicResultDialog,
  type ClinicResultAppointment,
} from "@/components/appointments/log-clinic-result-dialog";
import { formatDate } from "@/lib/utils";

interface PendingClinicResultsBannerProps {
  appointments: ClinicResultAppointment[];
}

export function PendingClinicResultsBanner({ appointments }: PendingClinicResultsBannerProps) {
  const [target, setTarget] = useState<ClinicResultAppointment | null>(null);

  if (appointments.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-orange-300 bg-orange-50/80 dark:border-orange-900 dark:bg-orange-950/30">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-orange-900 dark:text-orange-100">
                {appointments.length === 1
                  ? "Log clinic results for your appointment"
                  : `${appointments.length} appointments need clinic results`}
              </p>
              <p className="text-sm text-orange-800/90 dark:text-orange-200/90">
                The day after a reserved appointment, record whether the cat was male or female so
                colony counts stay accurate.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-2 rounded-md border border-orange-200/80 bg-background/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-orange-900/60"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {appointment.case_number ?? "Case"} · {appointment.clinic_name}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDate(appointment.date)}
                    {appointment.cat_name ? ` · ${appointment.cat_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {appointment.help_request_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/case/${appointment.help_request_id}`}>Open case</Link>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setTarget(appointment)}>
                    Log results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <LogClinicResultDialog appointment={target} onOpenChange={(open) => !open && setTarget(null)} />
    </>
  );
}
