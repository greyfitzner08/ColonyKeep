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
import {
  CAT_COLOR_MARKINGS,
  CAT_COLOR_OTHER,
  catColorOtherText,
  catColorSelectValue,
} from "@/lib/cats/colors";
import { formatCurrency } from "@/lib/utils";

export interface ClinicBookingSpotFields {
  cat_name: string;
  cat_colors: string;
  cat_gender: string;
  has_injuries: boolean;
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
          <Select
            value={catColorSelectValue(spot.cat_colors)}
            onValueChange={(value) =>
              onPatch({ cat_colors: value === CAT_COLOR_OTHER ? CAT_COLOR_OTHER : value })
            }
          >
            <SelectTrigger id={`cat-colors-${index}`}>
              <SelectValue placeholder="Select colors / markings" />
            </SelectTrigger>
            <SelectContent>
              {CAT_COLOR_MARKINGS.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {catColorSelectValue(spot.cat_colors) === CAT_COLOR_OTHER && (
            <Input
              id={`cat-colors-other-${index}`}
              value={catColorOtherText(spot.cat_colors)}
              onChange={(e) => onPatch({ cat_colors: e.target.value.trim() ? e.target.value : CAT_COLOR_OTHER })}
              placeholder="Describe colors / markings"
              aria-label="Describe other colors or markings"
            />
          )}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`cat-extra-${index}`}
            checked={spot.has_injuries}
            onCheckedChange={(v) => onPatch({ has_injuries: !!v })}
          />
          <Label htmlFor={`cat-extra-${index}`} className="font-normal">
            Injuries, medical concerns, or notes
          </Label>
        </div>
        {spot.has_injuries && (
          <div className="space-y-2 pl-6">
            <Label htmlFor={`cat-extra-details-${index}`}>Details</Label>
            <Textarea
              id={`cat-extra-details-${index}`}
              rows={3}
              value={spot.notes}
              onChange={(e) => onPatch({ notes: e.target.value })}
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

      <p className="border-t pt-3 text-sm font-medium">
        Estimated total for this cat: {formatCurrency(total)}
      </p>
    </div>
  );
}
