"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimAppointmentDialog } from "@/components/appointments/claim-appointment-dialog";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment } from "@/lib/types";
import { Calendar, Plus } from "lucide-react";
import type { HelpRequestOption } from "@/lib/cases/help-request-options";

interface CaseAppointmentsSectionProps {
  helpRequest: HelpRequestOption;
  appointments: Appointment[];
  availableAppointments: Appointment[];
}

export function CaseAppointmentsSection({
  helpRequest,
  appointments,
  availableAppointments,
}: CaseAppointmentsSectionProps) {
  const [claimTarget, setClaimTarget] = useState<Appointment | null>(null);

  const grouped = availableAppointments.reduce(
    (acc, appt) => {
      if (!acc[appt.date]) acc[appt.date] = [];
      acc[appt.date].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  return (
    <div className="space-y-6">
      {appointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Reserved for this case</h3>
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="pt-6 flex justify-between items-start">
                <div>
                  <p className="text-lg font-semibold">{appt.clinic_name}</p>
                  <p className="text-base text-muted-foreground mt-1">
                    {formatDate(appt.date)} · {appt.cat_name ?? "No cat assigned"}
                  </p>
                </div>
                <Badge className={cn("text-sm", APPOINTMENT_STATUS_COLORS[appt.status])}>
                  {appt.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Reserve a slot
        </h3>
        {availableAppointments.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No available appointment slots right now. Check the{" "}
            <a href="/appointments" className="text-primary underline">
              appointments calendar
            </a>{" "}
            later.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, slots]) => (
                <div key={date}>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(date)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {slots.map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        className="rounded-lg border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setClaimTarget(appt)}
                      >
                        <p className="font-medium">{appt.clinic_name}</p>
                        <p className="text-sm text-muted-foreground">Available · tap to reserve</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <ClaimAppointmentDialog
        appointment={claimTarget}
        onOpenChange={(open) => !open && setClaimTarget(null)}
        helpRequests={[]}
        linkedHelpRequest={helpRequest}
      />
    </div>
  );
}
