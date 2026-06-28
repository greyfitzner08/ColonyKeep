"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClinicFixFosterFields, type FosterFormFields } from "@/components/cases/clinic-fix-foster-fields";
import { TrackedCatDetailsFields } from "@/components/cases/tracked-cat-details-fields";
import type { TrackedCatDetails } from "@/lib/cases/tracked-cat-form";

interface TrackedCatIntakeSectionsProps {
  idPrefix: string;
  details: TrackedCatDetails;
  onDetailsChange: (details: TrackedCatDetails) => void;
  fixedAtClinic: boolean;
  onFixedAtClinicChange?: (fixedAtClinic: boolean) => void;
  /** When false, fixed-at-clinic is shown as read-only "Yes" (clinic result / fix flows). */
  showFixedAtClinicToggle?: boolean;
  ageCategory: "" | "adult" | "kitten";
  onAgeCategoryChange: (ageCategory: "" | "adult" | "kitten") => void;
  foster: FosterFormFields;
  onFosterChange: (foster: FosterFormFields) => void;
}

export function TrackedCatIntakeSections({
  idPrefix,
  details,
  onDetailsChange,
  fixedAtClinic,
  onFixedAtClinicChange,
  showFixedAtClinicToggle = true,
  ageCategory,
  onAgeCategoryChange,
  foster,
  onFosterChange,
}: TrackedCatIntakeSectionsProps) {
  return (
    <div className="space-y-4">
      <TrackedCatDetailsFields idPrefix={idPrefix} value={details} onChange={onDetailsChange} />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Fixed at clinic?</Label>
        {showFixedAtClinicToggle ? (
          <Select
            value={fixedAtClinic ? "yes" : "no"}
            onValueChange={(value) => {
              const nextFixed = value === "yes";
              onFixedAtClinicChange?.(nextFixed);
              if (!nextFixed) {
                onAgeCategoryChange("");
              }
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
        ) : (
          <Select value="yes" disabled>
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — already fixed at clinic</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {fixedAtClinic && (
        <div className="space-y-2 max-w-sm">
          <Label className="text-sm font-medium">Age at clinic</Label>
          <Select
            value={ageCategory || "unset"}
            onValueChange={(value) =>
              onAgeCategoryChange(value === "unset" ? "" : (value as "adult" | "kitten"))
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

      <ClinicFixFosterFields variant="tracked-cat" value={foster} onChange={onFosterChange} />
    </div>
  );
}
