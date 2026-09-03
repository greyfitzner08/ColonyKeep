"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export interface ClinicBookingSpotFields {
  cat_name: string;
  cat_colors: string;
  cat_gender: string;
  has_injuries: boolean;
  injury_details: string;
  has_notes: boolean;
  selected_addons: string[];
  notes: string;
}

interface AddonOption {
  name: string;
  price: number;
}

export function ClinicBookingCatFields({
  index,
  spot,
  addons,
  total,
  onPatch,
}: {
  index: number;
  spot: ClinicBookingSpotFields;
  addons: AddonOption[];
  total: number;
  onPatch: (patch: Partial<ClinicBookingSpotFields>) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h4 className="text-sm font-semibold">About this cat</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`cat-name-${index}`}>Cat name</Label>
            <Input
              id={`cat-name-${index}`}
              value={spot.cat_name}
              onChange={(e) => onPatch({ cat_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cat-gender-${index}`}>Gender</Label>
            <Select
              value={spot.cat_gender || undefined}
              onValueChange={(value) => onPatch({ cat_gender: value })}
            >
              <SelectTrigger id={`cat-gender-${index}`}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cat-colors-${index}`}>Colors / markings</Label>
          <Input
            id={`cat-colors-${index}`}
            value={spot.cat_colors}
            onChange={(e) => onPatch({ cat_colors: e.target.value })}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Health</h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`cat-injuries-${index}`}
            checked={spot.has_injuries}
            onCheckedChange={(v) => onPatch({ has_injuries: !!v })}
          />
          <Label htmlFor={`cat-injuries-${index}`} className="font-normal">
            Injuries or medical concerns
          </Label>
        </div>
        {spot.has_injuries && (
          <div className="space-y-2 pl-6">
            <Label htmlFor={`cat-injury-details-${index}`}>Injury details</Label>
            <Textarea
              id={`cat-injury-details-${index}`}
              value={spot.injury_details}
              onChange={(e) => onPatch({ injury_details: e.target.value })}
            />
          </div>
        )}
      </section>

      {addons.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3 rounded-md bg-muted/50 p-3">
            <div>
              <h4 className="text-sm font-semibold">Add-on services</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Optional extras for this cat only. Included clinic services are already covered.
              </p>
            </div>
            <ul className="divide-y rounded-md border bg-background">
              {addons.map((addon) => {
                const checked = spot.selected_addons.includes(addon.name);
                const addonId = `cat-${index}-addon-${addon.name}`;
                return (
                  <li key={addon.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Checkbox
                        id={addonId}
                        checked={checked}
                        onCheckedChange={(v) =>
                          onPatch({
                            selected_addons: v
                              ? [...spot.selected_addons, addon.name]
                              : spot.selected_addons.filter((name) => name !== addon.name),
                          })
                        }
                      />
                      <Label htmlFor={addonId} className="font-normal">
                        {addon.name}
                      </Label>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(addon.price)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <Separator />

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Notes</h4>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`cat-notes-${index}`}
            checked={spot.has_notes}
            onCheckedChange={(v) => onPatch({ has_notes: !!v })}
          />
          <Label htmlFor={`cat-notes-${index}`} className="font-normal">
            Add a note for this cat
          </Label>
        </div>
        {spot.has_notes && (
          <div className="space-y-2 pl-6">
            <Label htmlFor={`cat-notes-text-${index}`}>Notes</Label>
            <Textarea
              id={`cat-notes-text-${index}`}
              rows={3}
              value={spot.notes}
              onChange={(e) => onPatch({ notes: e.target.value })}
            />
          </div>
        )}
      </section>

      <p className="border-t pt-3 text-sm font-medium">
        Estimated total for this cat: {formatCurrency(total)}
      </p>
    </div>
  );
}
