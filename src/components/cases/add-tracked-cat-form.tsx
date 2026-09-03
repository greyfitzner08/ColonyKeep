"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrackedCatIntakeSections } from "@/components/cases/tracked-cat-intake-sections";
import { hasFosterFormAnswer, validateTrackedCatFosterForm } from "@/lib/cases/tracked-cat-foster";
import { EMPTY_TRACKED_CAT_DETAILS, type TrackedCatDetails } from "@/lib/cases/tracked-cat-form";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import type { Cat } from "@/lib/types";
import { Plus } from "lucide-react";

interface AddTrackedCatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpRequestId: string;
  onAdded: (cat: Cat) => void;
}

export function AddTrackedCatDialog({
  open,
  onOpenChange,
  helpRequestId,
  onAdded,
}: AddTrackedCatDialogProps) {
  const router = useRouter();
  const [newCat, setNewCat] = useState<TrackedCatDetails>(EMPTY_TRACKED_CAT_DETAILS);
  const [fixedAtClinic, setFixedAtClinic] = useState(false);
  const [ageCategory, setAgeCategory] = useState<"" | "adult" | "kitten">("");
  const [wentToFoster, setWentToFoster] = useState<"" | "yes" | "no">("");
  const [fosterFacility, setFosterFacility] = useState<FosterFacility | "">("");
  const [fosterFacilityOther, setFosterFacilityOther] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setNewCat(EMPTY_TRACKED_CAT_DETAILS);
    setFixedAtClinic(false);
    setAgeCategory("");
    setWentToFoster("");
    setFosterFacility("");
    setFosterFacilityOther("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function addCat() {
    const fosterError = validateTrackedCatFosterForm(
      {
        wentToFoster,
        fosterFacility,
        fosterFacilityOther,
      },
      { required: fixedAtClinic }
    );
    if (fosterError) {
      setError(fosterError);
      return;
    }

    setAdding(true);
    setError(null);

    const response = await fetch("/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helpRequestId,
        name: newCat.name,
        gender: newCat.gender,
        femaleReproductiveStatus: newCat.femaleReproductiveStatus || undefined,
        colors: newCat.colors,
        microchip_id: newCat.microchip_id,
        medical_notes: newCat.medical_notes,
        fixedAtClinic,
        ageCategory: fixedAtClinic ? ageCategory : undefined,
        ...(hasFosterFormAnswer(wentToFoster)
          ? {
              wentToFoster,
              fosterFacility,
              fosterFacilityOther,
            }
          : {}),
      }),
    });

    const result = await response.json().catch(() => null);
    setAdding(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to add tracked cat");
      return;
    }

    if (result?.cat) {
      const shouldRefresh = fixedAtClinic || hasFosterFormAnswer(wentToFoster);
      onAdded(result.cat as Cat);
      resetForm();
      onOpenChange(false);
      if (shouldRefresh) {
        router.refresh();
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add cat</DialogTitle>
          <DialogDescription>
            Track an individual cat at this colony — name, markings, clinic status, and foster plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TrackedCatIntakeSections
            idPrefix="add-cat"
            details={newCat}
            onDetailsChange={setNewCat}
            fixedAtClinic={fixedAtClinic}
            onFixedAtClinicChange={(nextFixed) => {
              setFixedAtClinic(nextFixed);
              setError(null);
            }}
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
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={addCat} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? "Adding…" : "Add cat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
