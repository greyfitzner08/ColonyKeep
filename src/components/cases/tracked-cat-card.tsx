"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DisplayDateInput } from "@/components/ui/display-date-input";
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
import { LogClinicFixDialog } from "@/components/cases/log-clinic-fix-dialog";
import { clinicResultAgeLabel } from "@/lib/appointments/clinic-result";
import { FemaleReproductiveStatusSelect } from "@/components/cases/female-reproductive-status-select";
import { fosterFormFromCat, validateTrackedCatFosterForm } from "@/lib/cases/tracked-cat-foster";
import {
  femaleReproductiveStatusLabel,
  type FemaleReproductiveStatus,
} from "@/lib/cases/female-reproductive-status";
import { formatFosterFacilitySummary, fosterFacilityLabel } from "@/lib/cases/foster-facility";
import { InfoRow } from "@/components/cases/case-detail-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Cat, ClinicFix } from "@/lib/types";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { formatDate, isCalendarIsoDate, cn } from "@/lib/utils";
import { ChevronDown, Pencil, Trash2, X, Check } from "lucide-react";

interface TrackedCatCardProps {
  cat: Cat;
  helpRequestId: string;
  caseNumber: string;
  clinicFix?: ClinicFix | null;
  canLogClinicFix: boolean;
  /** When true, hide edit/remove controls (view-only). */
  readOnly?: boolean;
  onUpdated: (cat: Cat) => void;
  onRemoved: (catId: string) => void;
}

type CatDraft = {
  name: string;
  gender: "" | "male" | "female";
  femaleReproductiveStatus: FemaleReproductiveStatus | "";
  colors: string;
  microchip_id: string;
  medical_notes: string;
  fixedAtClinic: boolean;
  clinicName: string;
  fixDate: string;
  age_category: "" | "adult" | "kitten";
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
};

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

function isoDateFromValue(value: string | null | undefined): string {
  if (!value) return todayIsoDate();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? todayIsoDate();
}

function toDraft(cat: Cat, clinicFix?: ClinicFix | null): CatDraft {
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
    microchip_id: cat.microchip_id ?? "",
    medical_notes: cat.medical_notes ?? "",
    fixedAtClinic: isTrackedCatClinicFixed(cat) || Boolean(clinicFix),
    clinicName: cat.clinic_name?.trim() || clinicFix?.clinic_name?.trim() || "",
    fixDate: isoDateFromValue(clinicFix?.fix_date ?? cat.return_date ?? cat.trap_date),
    age_category: cat.age_category ?? "",
    ...foster,
    wentToFoster: cat.transferred_unfixed ? "yes" : foster.wentToFoster,
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

function ageLabelForCat(cat: Cat) {
  if (cat.age_category === "adult" || cat.age_category === "kitten") {
    return clinicResultAgeLabel(cat.age_category);
  }
  return null;
}

function clinicLineForCat(cat: Cat, clinicFix: ClinicFix | null) {
  const clinic = cat.clinic_name?.trim() || clinicFix?.clinic_name?.trim() || null;
  const date = clinicFix?.fix_date ?? cat.return_date ?? cat.trap_date ?? null;

  if (clinic && date) return `${clinic} · ${formatDate(date)}`;
  if (clinic) return clinic;
  if (date) return formatDate(date);
  return null;
}

function catSubtitle(cat: Cat) {
  const parts = [
    cat.colors?.trim(),
    femaleReproductiveStatusLabel(cat.female_reproductive_status),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function genderLabelForCat(cat: Cat) {
  const gender = cat.gender?.trim();
  if (!gender) return "Unknown gender";
  const lower = gender.toLowerCase();
  if (lower === "male" || lower.startsWith("m")) return "Male";
  if (lower === "female" || lower.startsWith("f")) return "Female";
  return gender;
}

export function TrackedCatCard({
  cat,
  helpRequestId,
  caseNumber,
  clinicFix = null,
  canLogClinicFix,
  readOnly = false,
  onUpdated,
  onRemoved,
}: TrackedCatCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [logFixOpen, setLogFixOpen] = useState(false);
  const [draft, setDraft] = useState<CatDraft>(() => toDraft(cat, clinicFix));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catDisplayName = cat.name?.trim() || "Unnamed cat";
  const fosterSummary = fosterSummaryForCat(cat);
  const defaultGender = parseTrackedCatGender(cat.gender);
  const isFixed = isTrackedCatClinicFixed(cat) || Boolean(clinicFix);
  const wentToFacility = cat.went_to_foster_facility === true || cat.transferred_unfixed === true;
  const transferredUnfixed = !isFixed && cat.transferred_unfixed === true;
  const ageLabel = ageLabelForCat(cat);
  const clinicLine = clinicLineForCat(cat, clinicFix);
  const subtitle = catSubtitle(cat);

  function startEditing() {
    setDraft(toDraft(cat, clinicFix));
    setError(null);
    setExpanded(true);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(toDraft(cat, clinicFix));
    setError(null);
    setEditing(false);
  }

  async function saveCat() {
    const transferred = draft.wentToFoster === "yes";
    const fosterError = validateTrackedCatFosterForm(
      {
        wentToFoster: transferred ? "yes" : "no",
        fosterFacility: draft.fosterFacility,
        fosterFacilityOther: draft.fosterFacilityOther,
      },
      { required: transferred }
    );
    if (fosterError) {
      setError(fosterError);
      return;
    }
    if (draft.fixedAtClinic && !isCalendarIsoDate(draft.fixDate)) {
      setError("Enter a valid fix date like September 4, 2026.");
      return;
    }
    if (transferred && !draft.fixedAtClinic && draft.age_category !== "adult" && draft.age_category !== "kitten") {
      setError("Select adult or kitten.");
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
        microchip_id: draft.microchip_id,
        medical_notes: draft.medical_notes,
        fixedAtClinic: draft.fixedAtClinic,
        transferredUnfixed: transferred && !draft.fixedAtClinic,
        clinicName: draft.fixedAtClinic ? draft.clinicName : "",
        fixDate: draft.fixedAtClinic ? draft.fixDate : "",
        ageCategory: draft.fixedAtClinic || transferred ? draft.age_category : "",
        wentToFoster: transferred ? "yes" : "no",
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

  async function confirmRemoveCat() {
    setRemoving(true);
    setError(null);

    const response = await fetch(`/api/cats/${cat.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    setRemoving(false);

    if (!response.ok) {
      setError(result?.error ?? "Unable to remove cat");
      return;
    }

    onRemoved(cat.id);
    setRemoveDialogOpen(false);
    router.refresh();
  }

  const removeCatDialog = (
    <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {catDisplayName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {catDisplayName} from case {caseNumber}. Clinic fixes linked to this
            cat will stay on the case without a cat link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={removing}
            onClick={(event) => {
              event.preventDefault();
              void confirmRemoveCat();
            }}
          >
            {removing ? "Removing…" : "Remove cat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Edit tracked cat</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setRemoveDialogOpen(true)}
                disabled={saving || removing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving || removing}>
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
            <Label className="text-sm font-medium">Name</Label>
            <Input
              className="text-base"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Gender (optional)</Label>
            <Select
              value={draft.gender || "unset"}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  gender: value === "unset" ? "" : (value as "male" | "female"),
                  femaleReproductiveStatus:
                    value === "female" ? draft.femaleReproductiveStatus : "",
                })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Unknown / not set</SelectItem>
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
            <Label className="text-sm font-medium">Colors / Markings</Label>
            <Input
              className="text-base"
              value={draft.colors}
              onChange={(e) => setDraft({ ...draft, colors: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Microchip ID #</Label>
            <Input
              className="text-base"
              value={draft.microchip_id}
              onChange={(e) => setDraft({ ...draft, microchip_id: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm font-medium">Medical Notes</Label>
            <Textarea
              className="text-sm"
              value={draft.medical_notes}
              onChange={(e) => setDraft({ ...draft, medical_notes: e.target.value })}
              rows={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Fixed at a clinic?</Label>
            <Select
              value={draft.fixedAtClinic ? "yes" : "no"}
              onValueChange={(value) => {
                setDraft({ ...draft, fixedAtClinic: value === "yes" });
                setError(null);
              }}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Transferred to a facility?</Label>
            <Select
              value={draft.wentToFoster === "yes" ? "yes" : "no"}
              onValueChange={(value) => {
                const transferred = value === "yes";
                setDraft({
                  ...draft,
                  wentToFoster: transferred ? "yes" : "no",
                  fosterFacility: transferred ? draft.fosterFacility : "",
                  fosterFacilityOther: transferred ? draft.fosterFacilityOther : "",
                });
                setError(null);
              }}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.wentToFoster === "yes" && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {draft.fixedAtClinic
                ? "They count as fixed, and as transferred to a facility."
                : "They leave the count of cats that still need fixing, and are not counted as fixed."}
            </p>
          )}

          {draft.fixedAtClinic && (
            <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Where fixed</Label>
              <Input
                className="text-base"
                value={draft.clinicName}
                onChange={(e) => setDraft({ ...draft, clinicName: e.target.value })}
                placeholder="Clinic name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor={`edit-cat-fix-date-${cat.id}`}>
                Fix date
              </Label>
              <DisplayDateInput
                id={`edit-cat-fix-date-${cat.id}`}
                monthDayYear
                className="text-base"
                value={draft.fixDate}
                onValueChange={(value) => setDraft({ ...draft, fixDate: value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Age at clinic (optional)</Label>
              <Select
                value={draft.age_category || "unset"}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    age_category: value === "unset" ? "" : (value as "adult" | "kitten"),
                  })
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
            </>
          )}

          {draft.wentToFoster === "yes" && !draft.fixedAtClinic && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Age</Label>
              <Select
                value={draft.age_category || "unset"}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    age_category: value === "unset" ? "" : (value as "adult" | "kitten"),
                  })
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
            {draft.wentToFoster === "yes" ? (
              <ClinicFixFosterFields
                variant="tracked-cat"
                destinationOnly
                value={{
                  wentToFoster: "yes",
                  fosterFacility: draft.fosterFacility,
                  fosterFacilityOther: draft.fosterFacilityOther,
                }}
                onChange={(foster) => setDraft((prev) => ({ ...prev, ...foster, wentToFoster: "yes" }))}
              />
            ) : null}
          </div>

          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        </CardContent>
        {removeCatDialog}
      </Card>
    );
  }

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
        <div className="min-w-0 flex-1">
          <span className="text-lg font-semibold leading-tight">
            {cat.name || "Unnamed cat"}
          </span>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{genderLabelForCat(cat)}</span>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-5">
          <div className="flex items-start justify-between gap-3 border-t pt-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {isFixed && (
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90">
                    Fixed at clinic
                  </Badge>
                )}
                {wentToFacility && (
                  <Badge variant="default" className="bg-sky-700 hover:bg-sky-700/90">
                    {transferredUnfixed ? "Transferred, not fixed" : "Transferred"}
                  </Badge>
                )}
                {!isFixed && !wentToFacility && (
                  <Badge variant="secondary">In progress</Badge>
                )}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              {!readOnly && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveDialogOpen(true)}
                    disabled={removing || saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                  <Button size="sm" variant="outline" onClick={startEditing} disabled={removing}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive mt-3">{error}</p>}

          {(ageLabel ||
            cat.microchip_id ||
            clinicLine ||
            fosterSummary ||
            cat.medical_notes ||
            cat.notes) && (
            <dl className="mt-4 rounded-lg border bg-muted/20 px-3">
              {(isFixed || transferredUnfixed) && ageLabel && (
                <InfoRow label={isFixed ? "Age at clinic" : "Age"} value={ageLabel} />
              )}
              <InfoRow label="Microchip ID" value={cat.microchip_id} />
              {isFixed && <InfoRow label="Clinic" value={clinicLine} />}
              {wentToFacility ? (
                <InfoRow
                  label="Transferred to"
                  value={
                    fosterFacilityLabel(cat.foster_facility, cat.foster_facility_other) ??
                    fosterSummary
                  }
                />
              ) : (
                <InfoRow label="After clinic" value={isFixed ? fosterSummary : null} />
              )}
              <InfoRow label="Medical notes" value={cat.medical_notes} />
              <InfoRow label="Notes" value={cat.notes} />
            </dl>
          )}

          {!isFixed && canLogClinicFix && (
            <div className="mt-4">
              <Button size="sm" onClick={() => setLogFixOpen(true)}>
                Log clinic fix
              </Button>
            </div>
          )}
        </CardContent>
      )}

      <LogClinicFixDialog
        open={logFixOpen}
        onOpenChange={setLogFixOpen}
        helpRequestId={helpRequestId}
        caseNumber={caseNumber}
        catId={cat.id}
        cat={cat}
        catName={cat.name}
        defaultClinicName={cat.clinic_name}
        defaultGender={defaultGender ?? ""}
      />
      {removeCatDialog}
    </Card>
  );
}
