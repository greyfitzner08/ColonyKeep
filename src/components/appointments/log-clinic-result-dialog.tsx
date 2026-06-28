"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export interface ClinicResultAppointment {
  id: string;
  date: string;
  clinic_name: string;
  cat_name: string | null;
  case_number: string | null;
  help_request_id: string | null;
}

interface LogClinicResultDialogProps {
  appointment: ClinicResultAppointment | null;
  onOpenChange: (open: boolean) => void;
}

export function LogClinicResultDialog({ appointment, onOpenChange }: LogClinicResultDialogProps) {
  const router = useRouter();
  const [ageCategory, setAgeCategory] = useState<"adult" | "kitten" | "">("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setAgeCategory("");
    setGender("");
    setError(null);
  }

  async function submit() {
    if (!appointment) return;
    if (!ageCategory || !gender) {
      setError("Select age category and gender.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/appointments/log-clinic-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        ageCategory,
        gender,
      }),
    });

    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save clinic results");
      return;
    }

    resetForm();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={Boolean(appointment)}
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log clinic results</DialogTitle>
          <DialogDescription>
            {appointment ? (
              <>
                {appointment.case_number ? `${appointment.case_number} · ` : ""}
                {appointment.clinic_name} · {formatDate(appointment.date)}
                {appointment.cat_name ? ` · ${appointment.cat_name}` : ""}
              </>
            ) : (
              "Record the cat fixed at this appointment."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Age category</Label>
            <Select
              value={ageCategory}
              onValueChange={(value) => setAgeCategory(value as "adult" | "kitten")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select age category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">Adult (8+ weeks)</SelectItem>
                <SelectItem value="kitten">Kitten (under 8 weeks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={(value) => setGender(value as "male" | "female")}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            This records one fixed cat, keeps the originally reported colony size, and updates
            remaining counts on the case.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Save results"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
