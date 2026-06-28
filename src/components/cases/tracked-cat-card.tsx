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
import { createClient } from "@/lib/supabase/client";
import { isTrackedCatClinicFixed } from "@/lib/cases/tracked-cat-fix";
import {
  ClinicFixFosterFields,
  fosterFormToPayload,
  validateClinicFixFosterForm,
} from "@/components/cases/clinic-fix-foster-fields";
import {
  fosterFormFromCat,
  trackedCatReturnFields,
} from "@/lib/cases/tracked-cat-foster";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { InfoRow } from "@/components/cases/case-detail-fields";
import type { Cat } from "@/lib/types";
import { Pencil, X, Check } from "lucide-react";

interface TrackedCatCardProps {
  cat: Cat;
  clinics: { id: string; name: string }[];
  onUpdated: (cat: Cat) => void;
}

type CatDraft = {
  name: string;
  gender: string;
  colors: string;
  breed: string;
  microchip_id: string;
  clinic_id: string;
  clinic_name: string;
  medical_notes: string;
  trapped_status: string;
  appointment_status: string;
  return_status: string;
  notes: string;
  age_category: "" | "adult" | "kitten";
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
};

function toDraft(cat: Cat): CatDraft {
  const foster = fosterFormFromCat(cat);
  return {
    name: cat.name ?? "",
    gender: cat.gender ?? "",
    colors: cat.colors ?? "",
    breed: cat.breed ?? "",
    microchip_id: cat.microchip_id ?? "",
    clinic_id: cat.clinic_id ?? "",
    clinic_name: cat.clinic_name ?? "",
    medical_notes: cat.medical_notes ?? "",
    trapped_status: cat.trapped_status ?? "",
    appointment_status: cat.appointment_status ?? "",
    return_status: cat.return_status ?? "",
    notes: cat.notes ?? "",
    age_category: cat.age_category ?? "",
    ...foster,
  };
}

function emptyOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function TrackedCatCard({ cat, clinics, onUpdated }: TrackedCatCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CatDraft>(() => toDraft(cat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      trapped_status: draft.trapped_status,
      appointment_status: draft.appointment_status,
    });

    if (clinicFixed) {
      if (!draft.age_category) {
        setError("Select adult or kitten.");
        return;
      }
      const fosterError = validateClinicFixFosterForm({
        wentToFoster: draft.wentToFoster,
        fosterFacility: draft.fosterFacility,
        fosterFacilityOther: draft.fosterFacilityOther,
      });
      if (fosterError) {
        setError(fosterError);
        return;
      }
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const fosterPayload = clinicFixed
      ? fosterFormToPayload({
          wentToFoster: draft.wentToFoster,
          fosterFacility: draft.fosterFacility,
          fosterFacilityOther: draft.fosterFacilityOther,
        })
      : null;

    const returnFields = fosterPayload
      ? trackedCatReturnFields({
          wentToFosterFacility: fosterPayload.wentToFosterFacility,
          fosterFacility: fosterPayload.fosterFacility as FosterFacility | null,
          fosterFacilityOther: fosterPayload.fosterFacilityOther,
        })
      : null;

    const payload = {
      name: emptyOrNull(draft.name),
      gender: emptyOrNull(draft.gender),
      colors: emptyOrNull(draft.colors),
      breed: emptyOrNull(draft.breed),
      microchip_id: emptyOrNull(draft.microchip_id),
      clinic_id: emptyOrNull(draft.clinic_id),
      clinic_name: emptyOrNull(draft.clinic_name),
      medical_notes: emptyOrNull(draft.medical_notes),
      trapped_status: emptyOrNull(draft.trapped_status),
      appointment_status: emptyOrNull(draft.appointment_status),
      notes: emptyOrNull(draft.notes),
      age_category: clinicFixed ? draft.age_category : null,
      return_status: returnFields?.return_status ?? emptyOrNull(draft.return_status),
      foster_program: returnFields?.foster_program ?? null,
      went_to_foster_facility: returnFields?.went_to_foster_facility ?? null,
      foster_facility: returnFields?.foster_facility ?? null,
      foster_facility_other: returnFields?.foster_facility_other ?? null,
    };

    const { data, error: updateError } = await supabase
      .from("cats")
      .update(payload)
      .eq("id", cat.id)
      .select()
      .single();

    setSaving(false);

    if (updateError || !data) {
      setError(updateError?.message ?? "Unable to save cat");
      return;
    }

    const syncResponse = await fetch("/api/cats/sync-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: cat.help_request_id }),
    });

    if (!syncResponse.ok) {
      const syncResult = await syncResponse.json().catch(() => null);
      setError(syncResult?.error ?? "Cat saved but colony counts could not be updated");
      onUpdated(data as Cat);
      setEditing(false);
      router.refresh();
      return;
    }

    onUpdated(data as Cat);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
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
            <Label>Name / description</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Input
              value={draft.gender}
              onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
            />
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
            <Label>Trapped status</Label>
            <Input
              value={draft.trapped_status}
              onChange={(e) => setDraft({ ...draft, trapped_status: e.target.value })}
              placeholder="e.g. trapped, scheduled"
            />
          </div>
          <div className="space-y-2">
            <Label>Appointment status</Label>
            <Input
              value={draft.appointment_status}
              onChange={(e) => setDraft({ ...draft, appointment_status: e.target.value })}
              placeholder="e.g. reserved, completed"
            />
          </div>
          {isTrackedCatClinicFixed(draft) ? (
            <>
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
              <div className="sm:col-span-2">
                <ClinicFixFosterFields
                  wentToFoster={draft.wentToFoster}
                  onWentToFosterChange={(value) =>
                    setDraft({ ...draft, wentToFoster: value })
                  }
                  fosterFacility={draft.fosterFacility}
                  onFosterFacilityChange={(value) =>
                    setDraft({ ...draft, fosterFacility: value })
                  }
                  fosterFacilityOther={draft.fosterFacilityOther}
                  onFosterFacilityOtherChange={(value) =>
                    setDraft({ ...draft, fosterFacilityOther: value })
                  }
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Return status</Label>
              <Input
                value={draft.return_status}
                onChange={(e) => setDraft({ ...draft, return_status: e.target.value })}
                placeholder="e.g. returned, foster"
              />
            </div>
          )}
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
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {cat.trapped_status && (
            <Badge variant="secondary">Trapped: {cat.trapped_status}</Badge>
          )}
          {cat.appointment_status && (
            <Badge variant="secondary">Appt: {cat.appointment_status}</Badge>
          )}
          {cat.return_status && (
            <Badge variant="secondary">Return: {cat.return_status}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
