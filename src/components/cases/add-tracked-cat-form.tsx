"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CaseCollapsibleSection } from "@/components/cases/case-collapsible-section";
import { ClinicFixFosterFields } from "@/components/cases/clinic-fix-foster-fields";
import { hasFosterFormAnswer, validateTrackedCatFosterForm } from "@/lib/cases/tracked-cat-foster";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import type { Cat } from "@/lib/types";
import { Plus } from "lucide-react";

const EMPTY_CAT = {
  name: "",
  gender: "",
  colors: "",
  microchip_id: "",
  medical_notes: "",
};

interface AddTrackedCatFormProps {
  helpRequestId: string;
  defaultOpen?: boolean;
  onAdded: (cat: Cat) => void;
}

export function AddTrackedCatForm({
  helpRequestId,
  defaultOpen = false,
  onAdded,
}: AddTrackedCatFormProps) {
  const router = useRouter();
  const [newCat, setNewCat] = useState(EMPTY_CAT);
  const [fixedAtClinic, setFixedAtClinic] = useState(false);
  const [ageCategory, setAgeCategory] = useState<"" | "adult" | "kitten">("");
  const [wentToFoster, setWentToFoster] = useState<"" | "yes" | "no">("");
  const [fosterFacility, setFosterFacility] = useState<FosterFacility | "">("");
  const [fosterFacilityOther, setFosterFacilityOther] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setNewCat(EMPTY_CAT);
    setFixedAtClinic(false);
    setAgeCategory("");
    setWentToFoster("");
    setFosterFacility("");
    setFosterFacilityOther("");
    setError(null);
  }

  async function addCat() {
    if (fixedAtClinic && !ageCategory) {
      setError("Select adult or kitten.");
      return;
    }

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
      if (shouldRefresh) {
        router.refresh();
      }
    }
  }

  return (
    <CaseCollapsibleSection title="Add cat" defaultOpen={defaultOpen}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Name</Label>
          <Input
            className="text-base"
            placeholder="e.g. Marmalade"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Gender</Label>
          <Select
            value={newCat.gender || undefined}
            onValueChange={(value) => setNewCat({ ...newCat, gender: value as "male" | "female" })}
          >
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Colors / Markings</Label>
          <Input
            className="text-base"
            placeholder="Colors"
            value={newCat.colors}
            onChange={(e) => setNewCat({ ...newCat, colors: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Microchip ID #</Label>
          <Input
            className="text-base"
            placeholder="Microchip number"
            value={newCat.microchip_id}
            onChange={(e) => setNewCat({ ...newCat, microchip_id: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm font-medium">Medical Notes</Label>
          <Textarea
            className="text-base"
            placeholder="Injuries, illness, special handling..."
            value={newCat.medical_notes}
            onChange={(e) => setNewCat({ ...newCat, medical_notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm font-medium">Fixed at clinic?</Label>
          <Select
            value={fixedAtClinic ? "yes" : "no"}
            onValueChange={(value) => {
              setFixedAtClinic(value === "yes");
              if (value !== "yes") {
                setAgeCategory("");
              }
              setError(null);
            }}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">Not yet — still at colony or in progress</SelectItem>
              <SelectItem value="yes">Yes — already fixed at clinic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {fixedAtClinic && (
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
        )}

        <div className="sm:col-span-2">
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
        </div>

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <Button onClick={addCat} className="sm:col-span-2" disabled={adding}>
          <Plus className="h-4 w-4 mr-2" />
          {adding ? "Adding…" : "Add Cat"}
        </Button>
      </div>
    </CaseCollapsibleSection>
  );
}
