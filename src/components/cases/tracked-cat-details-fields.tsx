"use client";

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
import { FemaleReproductiveStatusSelect } from "@/components/cases/female-reproductive-status-select";
import type { TrackedCatDetails } from "@/lib/cases/tracked-cat-form";

interface TrackedCatDetailsFieldsProps {
  idPrefix: string;
  value: TrackedCatDetails;
  onChange: (value: TrackedCatDetails) => void;
}

export function TrackedCatDetailsFields({
  idPrefix,
  value,
  onChange,
}: TrackedCatDetailsFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          className="text-base"
          placeholder="e.g. Marmalade"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Gender</Label>
        <Select
          value={value.gender || undefined}
          onValueChange={(nextGender) =>
            onChange({
              ...value,
              gender: nextGender as "male" | "female",
              femaleReproductiveStatus:
                nextGender === "female" ? value.femaleReproductiveStatus : "",
            })
          }
        >
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
        {value.gender === "female" && (
          <FemaleReproductiveStatusSelect
            id={`${idPrefix}-reproductive-status`}
            value={value.femaleReproductiveStatus}
            onChange={(femaleReproductiveStatus) =>
              onChange({ ...value, femaleReproductiveStatus })
            }
          />
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Colors / Markings</Label>
        <Input
          className="text-base"
          placeholder="Colors"
          value={value.colors}
          onChange={(e) => onChange({ ...value, colors: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Microchip ID #</Label>
        <Input
          className="text-base"
          placeholder="Microchip number"
          value={value.microchip_id}
          onChange={(e) => onChange({ ...value, microchip_id: e.target.value })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-sm font-medium">Medical Notes</Label>
        <Textarea
          className="text-base"
          placeholder="Injuries, illness, special handling..."
          value={value.medical_notes}
          onChange={(e) => onChange({ ...value, medical_notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
