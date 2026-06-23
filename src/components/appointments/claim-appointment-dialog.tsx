"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseSearchPicker } from "@/components/appointments/case-search-picker";
import { type HelpRequestOption } from "@/lib/cases/help-request-options";
import type { Appointment } from "@/lib/types";

interface ClaimAppointmentDialogProps {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
  helpRequests: HelpRequestOption[];
  /** When set, the slot is linked to this case automatically (no search). */
  linkedHelpRequest?: HelpRequestOption | null;
}

export function ClaimAppointmentDialog({
  appointment,
  onOpenChange,
  helpRequests,
  linkedHelpRequest = null,
}: ClaimAppointmentDialogProps) {
  const router = useRouter();
  const [helpRequestId, setHelpRequestId] = useState("");
  const [catName, setCatName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lockedCase = linkedHelpRequest ?? null;
  const effectiveHelpRequestId = lockedCase?.id ?? helpRequestId;

  useEffect(() => {
    if (!appointment) return;
    setHelpRequestId(lockedCase?.id ?? "");
    setCatName("");
    setError(null);
  }, [appointment, lockedCase?.id]);

  async function claimSlot() {
    if (!appointment || !effectiveHelpRequestId) return;

    setError(null);
    setSaving(true);
    const response = await fetch("/api/appointments/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        helpRequestId: effectiveHelpRequestId,
        catDetails: { name: catName },
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
              ? `${appointment.clinic_name} · ${appointment.date}`
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
            <Label>Cat name / description</Label>
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Orange tabby male"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={claimSlot}
            className="w-full"
            disabled={saving || !effectiveHelpRequestId}
          >
            {saving ? "Reserving…" : "Reserve slot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
