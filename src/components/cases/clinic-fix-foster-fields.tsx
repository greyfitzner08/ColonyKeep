"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOSTER_FACILITIES, type FosterFacility } from "@/lib/cases/foster-facility";
import {
  validateClinicFixFosterForm,
  fosterFormToPayload,
} from "@/lib/cases/tracked-cat-foster";

export { validateClinicFixFosterForm, fosterFormToPayload };

export type FosterFormFields = {
  wentToFoster: "" | "yes" | "no";
  fosterFacility: FosterFacility | "";
  fosterFacilityOther: string;
};

export const EMPTY_FOSTER_FORM: FosterFormFields = {
  wentToFoster: "",
  fosterFacility: "",
  fosterFacilityOther: "",
};

interface ClinicFixFosterFieldsProps {
  value: FosterFormFields;
  onChange: (value: FosterFormFields) => void;
  /** Use tracked-cat copy when the cat may not be fixed yet. */
  variant?: "clinic-fix" | "tracked-cat";
}

export function ClinicFixFosterFields({
  value,
  onChange,
  variant = "clinic-fix",
}: ClinicFixFosterFieldsProps) {
  const isTrackedCat = variant === "tracked-cat";
  const { wentToFoster, fosterFacility, fosterFacilityOther } = value;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          {isTrackedCat
            ? "Will this cat go to foster or a facility?"
            : "Did this cat go into foster or a facility?"}
        </Label>
        <Select
          value={wentToFoster || "unset"}
          onValueChange={(nextValue) => {
            const next = nextValue === "unset" ? "" : (nextValue as "yes" | "no");
            if (next !== "yes") {
              onChange({ wentToFoster: next, fosterFacility: "", fosterFacilityOther: "" });
              return;
            }
            onChange({ ...value, wentToFoster: next });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Select…</SelectItem>
            <SelectItem value="no">
              {isTrackedCat ? "No — expected to return to colony" : "No — returned to colony"}
            </SelectItem>
            <SelectItem value="yes">
              {isTrackedCat ? "Yes — going to foster/facility" : "Yes — went to foster/facility"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {wentToFoster === "yes" && (
        <div className="space-y-2">
          <Label>{isTrackedCat ? "Where will the cat go?" : "Where did the cat go?"}</Label>
          <Select
            value={fosterFacility || "unset"}
            onValueChange={(nextValue) => {
              const facility = nextValue === "unset" ? "" : (nextValue as FosterFacility);
              onChange({
                ...value,
                fosterFacility: facility,
                fosterFacilityOther: facility === "other" ? fosterFacilityOther : "",
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Select location</SelectItem>
              {FOSTER_FACILITIES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {wentToFoster === "yes" && fosterFacility === "other" && (
        <div className="space-y-2">
          <Label>Other location</Label>
          <Input
            value={fosterFacilityOther}
            onChange={(e) => onChange({ ...value, fosterFacilityOther: e.target.value })}
            placeholder={isTrackedCat ? "Where will the cat go?" : "Where did the cat go?"}
          />
        </div>
      )}
    </div>
  );
}
