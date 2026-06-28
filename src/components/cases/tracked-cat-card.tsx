"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isTrackedCatClinicFixed, parseTrackedCatGender } from "@/lib/cases/tracked-cat-fix";
import { ClinicFixFosterFields } from "@/components/cases/clinic-fix-foster-fields";
import { ClinicFixSummary } from "@/components/cases/clinic-fix-summary";
import { LogClinicFixDialog } from "@/components/cases/log-clinic-fix-dialog";
import { FemaleReproductiveStatusSelect } from "@/components/cases/female-reproductive-status-select";
import { fosterFormFromCat, validateTrackedCatFosterForm } from "@/lib/cases/tracked-cat-foster";
import {
  femaleReproductiveStatusLabel,
  type FemaleReproductiveStatus,
} from "@/lib/cases/female-reproductive-status";
import { formatFosterFacilitySummary } from "@/lib/cases/foster-facility";
import { InfoRow } from "@/components/cases/case-detail-fields";
import type { Cat, ClinicFix } from "@/lib/types";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { Pencil, X, Check } from "lucide-react";

interface TrackedCatCardProps {
  cat: Cat;
  clinics: { id: string; name: string }[];
  helpRequestId: string;
  caseNumber: string;
  clinicFix?: ClinicFix | null;
  canLogClinicFix: boolean;
  onUpdated: (cat: Cat) => void;
}

type CatDraft = {
  name: string;
  gender: "" | "male" | "female";
  femaleReproductiveStatus: FemaleReproductiveStatus | "";
  colors: string;
  breed: string;
  microchip_id: string;
  clinic_id: string;
  clinic_name: string;
  medical_notes: string;
  appointment_status: string;
  notes: string;
  age_category: "" | "adult" | "kitten";
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
};

function toDraft(cat: Cat): CatDraft {
  const foster = fosterFormFromCat(cat);
  const gender = cat.gender?.trim().toLowerCase();
  const normalizedGender =
    gender === "male" || gender === "female"
      ? gender
      : gender?.startsWith("f")
        ? "female"
        : gender?.startsWith("m")
          ? "male"
          : "";

  return {
    name: cat.name ?? "",
    gender: normalizedGender,
    femaleReproductiveStatus: cat.female_reproductive_status ?? "",
    colors: cat.colors ?? "",
    breed: cat.breed ?? "",
    microchip_id: cat.microchip_id ?? "",
    clinic_id: cat.clinic_id ?? "",
    clinic_name: cat.clinic_name ?? "",
    medical_notes: cat.medical_notes ?? "",
    appointment_status: cat.appointment_status ?? "",
    notes: cat.notes ?? "",
    age_category: cat.age_category ?? "",
    ...foster,
  };
}

function fosterSummaryForCat(cat: Cat) {
  if (cat.went_to_foster_facility === true || cat.went_to_foster_facility === false) {
    return formatFosterFacilitySummary(
      cat.went_to_foster_facility,
      cat.foster_facility,
      cat.foster_facility_other
    );
  }

  if (cat.return_status?.trim().toLowerCase().includes("foster")) {
    return cat.foster_program ? `Planned: ${cat.foster_program}` : "Planned foster/facility";
  }

  return null;
}

export function TrackedCatCard({
  cat,
  clinics,
  helpRequestId,
  caseNumber,
  clinicFix = null,
  canLogClinicFix,
  onUpdated,
}: TrackedCatCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [logFixOpen, setLogFixOpen] = useState(false);
  const [draft, setDraft] = useState<CatDraft>(() => toDraft(cat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fosterSummary = fosterSummaryForCat(cat);
  const defaultGender = parseTrackedCatGender(cat.gender);

  function startEditing() {
    setDraft(toDraft(cat));
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(toDraft(cat));
    setError(null);
    setEditing(false);
  }

  async function saveCat() {
    const clinicFixed = isTrackedCatClinicFixed({
      trapped_status: cat.trapped_status,
      appointment_status: draft.appointment_status,
    });

    const fosterError = validateTrackedCatFosterForm(
      {
        wentToFoster: draft.wentToFoster,
        fosterFacility: draft.fosterFacility,
        fosterFacilityOther: draft.fosterFacilityOther,
      },
      { required: clinicFixed }
    );
    if (fosterError) {
      setError(fosterError);
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/cats/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        gender: draft.gender,
        femaleReproductiveStatus: draft.femaleReproductiveStatus || undefined,
        colors: draft.colors,
        breed: draft.breed,
        microchip_id: draft.microchip_id,
        clinic_id: draft.clinic_id,
        clinic_name: draft.clinic_name,
        medical_notes: draft.medical_notes,
        appointment_status: draft.appointment_status,
        notes: draft.notes,
        age_category: draft.age_category,
        wentToFoster: draft.wentToFoster,
        fosterFacility: draft.fosterFacility,
        fosterFacilityOther: draft.fosterFacilityOther,
      }),
    });

    const result = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to save cat");
      return;
    }

    if (result?.cat) {
      onUpdated(result.cat as Cat);
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    const clinicFixed = isTrackedCatClinicFixed({
      trapped_status: cat.trapped_status,
      appointment_status: draft.appointment_status,
    });

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Edit tracked cat</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveCat} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={draft.gender || undefined}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  gender: value as "male" | "female",
                  femaleReproductiveStatus:
                    value === "female" ? draft.femaleReproductiveStatus : "",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            {draft.gender === "female" && (
              <FemaleReproductiveStatusSelect
                id={`edit-cat-reproductive-status-${cat.id}`}
                value={draft.femaleReproductiveStatus}
                onChange={(femaleReproductiveStatus) =>
                  setDraft({ ...draft, femaleReproductiveStatus })
                }
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Colors / markings</Label>
            <Input
              value={draft.colors}
              onChange={(e) => setDraft({ ...draft, colors: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Breed</Label>
            <Input
              value={draft.breed}
              onChange={(e) => setDraft({ ...draft, breed: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Microchip ID</Label>
            <Input
              value={draft.microchip_id}
              onChange={(e) => setDraft({ ...draft, microchip_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Clinic</Label>
            <Select
              value={draft.clinic_id || "none"}
              onValueChange={(value) => {
                const clinic = clinics.find((entry) => entry.id === value);
                setDraft({
                  ...draft,
                  clinic_id: value === "none" ? "" : value,
                  clinic_name: clinic?.name ?? "",
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not yet assigned</SelectItem>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Appointment status</Label>
            <Input
              value={draft.appointment_status}
              onChange={(e) => setDraft({ ...draft, appointment_status: e.target.value })}
              placeholder="e.g. reserved, completed"
            />
          </div>
          {clinicFixed && (
            <div className="space-y-2">
              <Label>Age at clinic</Label>
              <Select
                value={draft.age_category || "unset"}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    age_category: value === "unset" ? "" : (value as "adult" | "kitten"),
                  })
                }
              >
                <SelectTrigger>
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
                wentToFoster: draft.wentToFoster,
                fosterFacility: draft.fosterFacility,
                fosterFacilityOther: draft.fosterFacilityOther,
              }}
              onChange={(foster) => setDraft((prev) => ({ ...prev, ...foster }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Medical notes</Label>
            <Textarea
              value={draft.medical_notes}
              onChange={(e) => setDraft({ ...draft, medical_notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>General notes</Label>
            <Textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{cat.name || "Unnamed cat"}</p>
            <p className="text-base text-muted-foreground mt-1">
              {[cat.colors, cat.gender, cat.breed].filter(Boolean).join(" · ") || "—"}
            </p>
            {femaleReproductiveStatusLabel(cat.female_reproductive_status) && (
              <p className="text-sm text-muted-foreground mt-1">
                {femaleReproductiveStatusLabel(cat.female_reproductive_status)}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={startEditing}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <InfoRow alwaysShow label="Microchip ID" value={cat.microchip_id} />
          <InfoRow alwaysShow label="Clinic" value={cat.clinic_name} />
          <InfoRow alwaysShow label="Medical notes" value={cat.medical_notes} />
          <InfoRow alwaysShow label="Notes" value={cat.notes} />
          {fosterSummary && <InfoRow alwaysShow label="Foster / facility" value={fosterSummary} />}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {cat.appointment_status && (
            <Badge variant="secondary">Appt: {cat.appointment_status}</Badge>
          )}
        </div>

        <div className="mt-4 space-y-3 border-t pt-4">
          {clinicFix ? (
            <ClinicFixSummary fix={clinicFix} />
          ) : canLogClinicFix ? (
            <Button size="sm" onClick={() => setLogFixOpen(true)}>
              Log clinic fix
            </Button>
          ) : null}
        </div>

        <LogClinicFixDialog
          open={logFixOpen}
          onOpenChange={setLogFixOpen}
          helpRequestId={helpRequestId}
          caseNumber={caseNumber}
          catId={cat.id}
          catName={cat.name}
          defaultClinicName={cat.clinic_name}
          defaultGender={defaultGender}
        />
      </CardContent>
    </Card>
  );
}
