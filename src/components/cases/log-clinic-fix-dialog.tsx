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
import { TrackedCatDetailsFields } from "@/components/cases/tracked-cat-details-fields";
import {
  EMPTY_TRACKED_CAT_DETAILS,
  trackedCatDetailsFromCat,
  type TrackedCatDetails,
} from "@/lib/cases/tracked-cat-form";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import type { Cat } from "@/lib/types";

interface LogClinicFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpRequestId: string;
  caseNumber: string;
  catId?: string;
  cat?: Cat | null;
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
  cat,
  catName,
  defaultClinicName,
  defaultGender = "",
}: LogClinicFixDialogProps) {
  const router = useRouter();
  const [details, setDetails] = useState<TrackedCatDetails>(EMPTY_TRACKED_CAT_DETAILS);
  const [ageCategory, setAgeCategory] = useState<"adult" | "kitten" | "">("");
  const [clinicName, setClinicName] = useState("");
  const [fixDate, setFixDate] = useState(new Date().toISOString().split("T")[0]);
  const [wentToFoster, setWentToFoster] = useState<"" | "yes" | "no">("");
  const [fosterFacility, setFosterFacility] = useState<FosterFacility | "">("");
  const [fosterFacilityOther, setFosterFacilityOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (cat) {
      setDetails(trackedCatDetailsFromCat(cat));
      setAgeCategory(cat.age_category ?? "");
    } else {
      setDetails({
        ...EMPTY_TRACKED_CAT_DETAILS,
        name: catName?.trim() ?? "",
        gender: defaultGender,
      });
      setAgeCategory("");
    }
    setClinicName(defaultClinicName?.trim() ?? "");
  }, [open, cat, catName, defaultClinicName, defaultGender]);

  function resetForm() {
    if (cat) {
      setDetails(trackedCatDetailsFromCat(cat));
      setAgeCategory(cat.age_category ?? "");
    } else {
      setDetails({
        ...EMPTY_TRACKED_CAT_DETAILS,
        name: catName?.trim() ?? "",
        gender: defaultGender,
      });
      setAgeCategory("");
    }
    setClinicName(defaultClinicName?.trim() ?? "");
    setFixDate(new Date().toISOString().split("T")[0]);
    setWentToFoster("");
    setFosterFacility("");
    setFosterFacilityOther("");
    setError(null);
  }

  async function submit() {
    if (!ageCategory || !details.gender) {
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
        gender: details.gender,
        femaleReproductiveStatus: details.femaleReproductiveStatus || undefined,
        name: details.name,
        colors: details.colors,
        microchip_id: details.microchip_id,
        medical_notes: details.medical_notes,
        clinicName: clinicName.trim() || undefined,
        fixDate,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log clinic fix</DialogTitle>
          <DialogDescription>
            {caseNumber}
            {catName || details.name ? ` — ${catName || details.name}` : " — walk-in fix"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TrackedCatDetailsFields
            idPrefix="clinic-fix"
            value={details}
            onChange={setDetails}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Clinic name (optional)</Label>
              <Input
                className="text-base"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Feral Fixers"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fix date</Label>
              <Input
                className="text-base"
                type="date"
                value={fixDate}
                onChange={(e) => setFixDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Age at clinic</Label>
            <Select
              value={ageCategory || "unset"}
              onValueChange={(value) =>
                setAgeCategory(value === "unset" ? "" : (value as "adult" | "kitten"))
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Select age</SelectItem>
                <SelectItem value="adult">Adult (8+ weeks)</SelectItem>
                <SelectItem value="kitten">Kitten (&lt;8 weeks)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ClinicFixFosterFields
            variant="tracked-cat"
            value={{
              wentToFoster,
              fosterFacility,
              fosterFacilityOther,
            }}
            onChange={(foster) => {
              setWentToFoster(foster.wentToFoster);
              setFosterFacility(foster.fosterFacility);
              setFosterFacilityOther(foster.fosterFacilityOther);
            }}
          />

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
