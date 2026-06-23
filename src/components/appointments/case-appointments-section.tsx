"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClaimAppointmentDialog } from "@/components/appointments/claim-appointment-dialog";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment, Cat } from "@/lib/types";
import { Calendar, Plus } from "lucide-react";
import type { HelpRequestOption } from "@/lib/cases/help-request-options";

interface CaseAppointmentsSectionProps {
  helpRequest: HelpRequestOption;
  appointments: Appointment[];
  availableAppointments: Appointment[];
  cats?: Cat[];
}

export function CaseAppointmentsSection({
  helpRequest,
  appointments,
  availableAppointments,
  cats = [],
}: CaseAppointmentsSectionProps) {
  const router = useRouter();
  const [claimTarget, setClaimTarget] = useState<Appointment | null>(null);
  const [unreserveId, setUnreserveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = availableAppointments.reduce(
    (acc, appt) => {
      if (!acc[appt.date]) acc[appt.date] = [];
      acc[appt.date].push(appt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

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

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {appointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">Reserved for this case</h3>
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="pt-6 flex justify-between items-start gap-4">
                <div>
                  <p className="text-lg font-semibold">{appt.clinic_name}</p>
                  <p className="text-base text-muted-foreground mt-1">
                    {formatDate(appt.date)} · {appt.cat_name ?? "No cat assigned"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn("text-sm", APPOINTMENT_STATUS_COLORS[appt.status])}>
                    {appt.status}
                  </Badge>
                  {appt.status === "reserved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={unreserveId === appt.id}
                      onClick={() => unreserve(appt.id)}
                    >
                      {unreserveId === appt.id ? "Releasing…" : "Un-reserve"}
                    </Button>
                  )}
                </div>
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
        cats={cats}
      />
    </div>
  );
}
