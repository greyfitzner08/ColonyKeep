"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { canUnreserveAppointment, shouldShowAppointmentStatusBadge } from "@/lib/appointments/clinic-result";
import { formatDate, cn } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

interface AppointmentDetailDialogProps {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
  onUnreserve?: (appointmentId: string) => void;
  unreserveLoading?: boolean;
}

export function AppointmentDetailDialog({
  appointment,
  onOpenChange,
  onUnreserve,
  unreserveLoading,
}: AppointmentDetailDialogProps) {
  if (!appointment) return null;

  const canUnreserve = canUnreserveAppointment(appointment);

  return (
    <Dialog open={Boolean(appointment)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {appointment.clinic_name}
            {shouldShowAppointmentStatusBadge(appointment) && (
              <Badge className={cn("text-xs", APPOINTMENT_STATUS_COLORS[appointment.status])}>
                {appointment.status.replace(/_/g, " ")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(appointment.date)}</p>
          </div>

          {appointment.status !== "available" && (
            <>
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <p className="font-medium">Claimed by</p>
                <p>{appointment.reserved_by_name ?? appointment.reserved_by ?? "Unknown"}</p>
                {appointment.reserved_by && (
                  <p className="text-muted-foreground">{appointment.reserved_by}</p>
                )}
              </div>

              {(appointment.contact_name || appointment.contact_email || appointment.contact_phone) && (
                <div className="space-y-1">
                  <p className="font-medium">Contact</p>
                  {appointment.contact_name && <p>{appointment.contact_name}</p>}
                  {appointment.contact_email && (
                    <p className="text-muted-foreground">{appointment.contact_email}</p>
                  )}
                  {appointment.contact_phone && (
                    <p className="text-muted-foreground">{appointment.contact_phone}</p>
                  )}
                </div>
              )}

              {(appointment.cat_name || appointment.cat_gender || appointment.cat_colors) && (
                <div className="space-y-1">
                  <p className="font-medium">Cat</p>
                  <p>{appointment.cat_name ?? "Unnamed"}</p>
                  {appointment.cat_gender && (
                    <p className="text-muted-foreground">Gender: {appointment.cat_gender}</p>
                  )}
                  {appointment.cat_colors && (
                    <p className="text-muted-foreground">Colors: {appointment.cat_colors}</p>
                  )}
                  {appointment.cat_breed && (
                    <p className="text-muted-foreground">Breed: {appointment.cat_breed}</p>
                  )}
                </div>
              )}

              {appointment.help_request_id && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/case/${appointment.help_request_id}`}>Open linked case</Link>
                </Button>
              )}
            </>
          )}

          {appointment.status === "available" && (
            <p className="text-muted-foreground">This slot is open for claiming.</p>
          )}

          {canUnreserve && onUnreserve && (
            <Button
              variant="destructive"
              size="sm"
              disabled={unreserveLoading}
              onClick={() => onUnreserve(appointment.id)}
            >
              {unreserveLoading ? "Releasing…" : "Un-reserve appointment"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
