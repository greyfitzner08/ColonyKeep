"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClinicFixFosterFields,
  fosterFormToPayload,
  validateClinicFixFosterForm,
} from "@/components/cases/clinic-fix-foster-fields";
import type { FosterFacility } from "@/lib/cases/foster-facility";

interface LogClinicFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpRequestId: string;
  caseNumber: string;
  catId?: string;
  catName?: string | null;
  defaultClinicName?: string | null;
  defaultGender?: "" | "male" | "female";
}

export function LogClinicFixDialog({
  open,
  onOpenChange,
  helpRequestId,
  caseNumber,
  catId,
  catName,
  defaultClinicName,
  defaultGender = "",
}: LogClinicFixDialogProps) {
  const router = useRouter();
  const [ageCategory, setAgeCategory] = useState<"adult" | "kitten" | "">("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [clinicName, setClinicName] = useState("");
  const [fixDate, setFixDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [wentToFoster, setWentToFoster] = useState<"" | "yes" | "no">("");
  const [fosterFacility, setFosterFacility] = useState<FosterFacility | "">("");
  const [fosterFacilityOther, setFosterFacilityOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setClinicName(defaultClinicName?.trim() ?? "");
    setGender(defaultGender);
  }, [open, defaultClinicName, defaultGender]);

  function resetForm() {
    setAgeCategory("");
    setGender(defaultGender);
    setClinicName(defaultClinicName?.trim() ?? "");
    setFixDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setWentToFoster("");
    setFosterFacility("");
    setFosterFacilityOther("");
    setError(null);
  }

  async function submit() {
    if (!ageCategory || !gender) {
      setError("Select age category and gender.");
      return;
    }

    const fosterError = validateClinicFixFosterForm({
      wentToFoster,
      fosterFacility,
      fosterFacilityOther,
    });
    if (fosterError) {
      setError(fosterError);
      return;
    }

    setLoading(true);
    setError(null);

    const fosterPayload = fosterFormToPayload({
      wentToFoster,
      fosterFacility,
      fosterFacilityOther,
    });

    const response = await fetch("/api/help-requests/log-clinic-fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId,
        catId,
        ageCategory,
        gender,
        clinicName: clinicName.trim() || undefined,
        fixDate,
        notes: notes.trim() || undefined,
        ...fosterPayload,
      }),
    });

    const result = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to log clinic fix");
      return;
    }

    resetForm();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log clinic fix</DialogTitle>
          <DialogDescription>
            {caseNumber}
            {catName ? ` — ${catName}` : " — walk-in fix"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Clinic name (optional)</Label>
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="e.g. Feral Fixers"
            />
          </div>

          <div className="space-y-2">
            <Label>Fix date</Label>
            <Input type="date" value={fixDate} onChange={(e) => setFixDate(e.target.value)} />
          </div>

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
            <Select
              value={gender}
              onValueChange={(value) => setGender(value as "male" | "female")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ClinicFixFosterFields
            wentToFoster={wentToFoster}
            onWentToFosterChange={setWentToFoster}
            fosterFacility={fosterFacility}
            onFosterFacilityChange={setFosterFacility}
            fosterFacilityOther={fosterFacilityOther}
            onFosterFacilityOtherChange={setFosterFacilityOther}
          />

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ear tip color, trap used, etc."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Save fix"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
