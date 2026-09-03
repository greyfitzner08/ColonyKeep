"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { TrackedCatIntakeSections } from "@/components/cases/tracked-cat-intake-sections";
import { fosterFormToPayload, validateClinicFixFosterForm } from "@/components/cases/clinic-fix-foster-fields";
import {
  EMPTY_TRACKED_CAT_DETAILS,
  type TrackedCatDetails,
} from "@/lib/cases/tracked-cat-form";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import type { FosterFormFields } from "@/components/cases/clinic-fix-foster-fields";

export interface ClinicResultAppointment {
  id: string;
  date: string;
  clinic_name: string;
  cat_id: string | null;
  cat_name: string | null;
  cat_colors: string | null;
  cat_gender: string | null;
  case_number: string | null;
  help_request_id: string | null;
  defaultDetails?: Partial<TrackedCatDetails>;
  defaultAgeCategory?: "" | "adult" | "kitten";
  defaultFoster?: FosterFormFields;
}

function defaultDetailsForAppointment(
  appointment: ClinicResultAppointment
): TrackedCatDetails {
  const gender = appointment.cat_gender?.trim().toLowerCase();
  const normalizedGender =
    gender === "male" || gender === "female"
      ? gender
      : gender?.startsWith("f")
        ? "female"
        : gender?.startsWith("m")
          ? "male"
          : "";

  return {
    ...EMPTY_TRACKED_CAT_DETAILS,
    name: appointment.defaultDetails?.name ?? appointment.cat_name ?? "",
    gender: appointment.defaultDetails?.gender ?? normalizedGender,
    femaleReproductiveStatus: appointment.defaultDetails?.femaleReproductiveStatus ?? "",
    colors: appointment.defaultDetails?.colors ?? appointment.cat_colors ?? "",
    microchip_id: appointment.defaultDetails?.microchip_id ?? "",
    medical_notes: appointment.defaultDetails?.medical_notes ?? "",
  };
}

interface LogClinicResultDialogProps {
  appointment: ClinicResultAppointment | null;
  onOpenChange: (open: boolean) => void;
}

export function LogClinicResultDialog({ appointment, onOpenChange }: LogClinicResultDialogProps) {
  const router = useRouter();
  const [details, setDetails] = useState<TrackedCatDetails>(EMPTY_TRACKED_CAT_DETAILS);
  const [ageCategory, setAgeCategory] = useState<"adult" | "kitten" | "">("");
  const [wentToFoster, setWentToFoster] = useState<"" | "yes" | "no">("");
  const [fosterFacility, setFosterFacility] = useState<FosterFacility | "">("");
  const [fosterFacilityOther, setFosterFacilityOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointment) return;
    setDetails(defaultDetailsForAppointment(appointment));
    setAgeCategory(appointment.defaultAgeCategory ?? "");
    setWentToFoster(appointment.defaultFoster?.wentToFoster ?? "");
    setFosterFacility(appointment.defaultFoster?.fosterFacility ?? "");
    setFosterFacilityOther(appointment.defaultFoster?.fosterFacilityOther ?? "");
  }, [appointment]);

  function resetForm() {
    if (appointment) {
      setDetails(defaultDetailsForAppointment(appointment));
      setAgeCategory(appointment.defaultAgeCategory ?? "");
      setWentToFoster(appointment.defaultFoster?.wentToFoster ?? "");
      setFosterFacility(appointment.defaultFoster?.fosterFacility ?? "");
      setFosterFacilityOther(appointment.defaultFoster?.fosterFacilityOther ?? "");
    } else {
      setDetails(EMPTY_TRACKED_CAT_DETAILS);
      setAgeCategory("");
      setWentToFoster("");
      setFosterFacility("");
      setFosterFacilityOther("");
    }
    setError(null);
  }

  async function submit() {
    if (!appointment) return;

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

    const response = await fetch("/api/appointments/log-clinic-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: appointment.id,
        ageCategory: ageCategory || undefined,
        gender: details.gender || undefined,
        femaleReproductiveStatus: details.femaleReproductiveStatus || undefined,
        name: details.name,
        colors: details.colors,
        microchip_id: details.microchip_id,
        medical_notes: details.medical_notes,
        ...fosterPayload,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log clinic results</DialogTitle>
          <DialogDescription>
            {appointment ? (
              <>
                {appointment.case_number ? `${appointment.case_number} · ` : ""}
                {appointment.clinic_name} · {formatDate(appointment.date)}
              </>
            ) : (
              "Record the cat fixed at this appointment."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TrackedCatIntakeSections
            idPrefix="clinic-result"
            details={details}
            onDetailsChange={setDetails}
            fixedAtClinic
            showFixedAtClinicToggle={false}
            ageCategory={ageCategory}
            onAgeCategoryChange={setAgeCategory}
            foster={{
              wentToFoster,
              fosterFacility,
              fosterFacilityOther,
            }}
            onFosterChange={(foster) => {
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
            {loading ? "Saving…" : "Save results"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
