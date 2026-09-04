"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseSearchPicker } from "@/components/appointments/case-search-picker";
import { isAppointmentDatePast } from "@/lib/appointments/slot-date";
import { type HelpRequestOption } from "@/lib/cases/help-request-options";
import type { Appointment, Cat } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ClaimAppointmentDialogProps {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
  helpRequests: HelpRequestOption[];
  cats?: Cat[];
  /** When set, the slot is linked to this case automatically (no search). */
  linkedHelpRequest?: HelpRequestOption | null;
}

export function ClaimAppointmentDialog({
  appointment,
  onOpenChange,
  helpRequests,
  cats = [],
  linkedHelpRequest = null,
}: ClaimAppointmentDialogProps) {
  const router = useRouter();
  const [helpRequestId, setHelpRequestId] = useState("");
  const [catMode, setCatMode] = useState<"new" | string>("new");
  const [catName, setCatName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lockedCase = linkedHelpRequest ?? null;
  const effectiveHelpRequestId = lockedCase?.id ?? helpRequestId;
  const datePast = appointment ? isAppointmentDatePast(appointment.date) : false;
  const availableCats = cats.filter(
    (cat) => !cat.appointment_id || cat.appointment_id === appointment?.id
  );

  useEffect(() => {
    if (!appointment) return;
    setHelpRequestId(lockedCase?.id ?? "");
    setCatMode("new");
    setCatName("");
    setError(
      isAppointmentDatePast(appointment.date)
        ? "This appointment date has passed and cannot be claimed"
        : null
    );
  }, [appointment, lockedCase?.id]);

  async function claimSlot() {
    if (!appointment || !effectiveHelpRequestId) return;
    if (isAppointmentDatePast(appointment.date)) {
      setError("This appointment date has passed and cannot be claimed");
      return;
    }
    if (catMode === "new" && !catName.trim()) {
      setError("Enter a cat name or select an existing tracked cat");
      return;
    }

    setError(null);
    setSaving(true);
    const response = await fetch("/api/appointments/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        helpRequestId: effectiveHelpRequestId,
        ...(catMode !== "new" ? { catId: catMode } : { catDetails: { name: catName.trim() } }),
      }),
    });
    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to reserve appointment");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={!!appointment}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim Appointment</DialogTitle>
          <DialogDescription>
            {appointment
              ? `${appointment.clinic_name} · ${formatDate(appointment.date)}`
              : "Link this slot to a case"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {lockedCase ? (
            <div className="space-y-2">
              <Label>Case</Label>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="font-medium">{lockedCase.case_number}</p>
                <p className="text-sm text-muted-foreground">{lockedCase.contact_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Linked automatically from this case
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Case</Label>
              <CaseSearchPicker
                options={helpRequests}
                value={helpRequestId}
                onChange={setHelpRequestId}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Cat</Label>
            {availableCats.length > 0 ? (
              <Select value={catMode} onValueChange={setCatMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or add cat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Add new tracked cat</SelectItem>
                  {availableCats.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name || "Unnamed cat"}
                      {cat.colors ? ` · ${cat.colors}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {catMode === "new" && (
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Orange tabby male"
              />
            )}
            {catMode !== "new" && (
              <p className="text-sm text-muted-foreground">
                Using tracked cat from this case. It will be linked to this appointment.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={claimSlot}
            className="w-full"
            disabled={saving || !effectiveHelpRequestId || datePast}
          >
            {saving ? "Reserving…" : datePast ? "Date has passed" : "Reserve slot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
