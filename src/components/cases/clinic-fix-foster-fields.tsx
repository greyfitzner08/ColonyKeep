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

interface ClinicFixFosterFieldsProps {
  wentToFoster: "" | "yes" | "no";
  onWentToFosterChange: (value: "" | "yes" | "no") => void;
  fosterFacility: FosterFacility | "";
  onFosterFacilityChange: (value: FosterFacility | "") => void;
  fosterFacilityOther: string;
  onFosterFacilityOtherChange: (value: string) => void;
}

export function ClinicFixFosterFields({
  wentToFoster,
  onWentToFosterChange,
  fosterFacility,
  onFosterFacilityChange,
  fosterFacilityOther,
  onFosterFacilityOtherChange,
}: ClinicFixFosterFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Did this cat go into foster or a facility?</Label>
        <Select
          value={wentToFoster || "unset"}
          onValueChange={(value) => {
            const next = value === "unset" ? "" : (value as "yes" | "no");
            onWentToFosterChange(next);
            if (next !== "yes") {
              onFosterFacilityChange("");
              onFosterFacilityOtherChange("");
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Select…</SelectItem>
            <SelectItem value="no">No — returned to colony</SelectItem>
            <SelectItem value="yes">Yes — went to foster/facility</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {wentToFoster === "yes" && (
        <>
          <div className="space-y-2">
            <Label>Where did the cat go?</Label>
            <Select
              value={fosterFacility || "unset"}
              onValueChange={(value) => {
                onFosterFacilityChange(value === "unset" ? "" : (value as FosterFacility));
                if (value !== "other") {
                  onFosterFacilityOtherChange("");
                }
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

          {fosterFacility === "other" && (
            <div className="space-y-2">
              <Label>Other location</Label>
              <Input
                value={fosterFacilityOther}
                onChange={(e) => onFosterFacilityOtherChange(e.target.value)}
                placeholder="Where did the cat go?"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
