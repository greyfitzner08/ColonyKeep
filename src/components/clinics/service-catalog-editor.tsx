"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_INCLUDED_SERVICE_NAMES,
  getAddonOptions,
  getIncludedOptions,
} from "@/lib/clinics/service-catalog";
import type { ClinicServiceOption } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface ServiceCatalogEditorProps {
  value: ClinicServiceOption[];
  onChange: (catalog: ClinicServiceOption[]) => void;
  /** When true, clinic pricing is package-based — hide base-price included section. */
  packageMode?: boolean;
}

export function ServiceCatalogEditor({
  value,
  onChange,
  packageMode = false,
}: ServiceCatalogEditorProps) {
  const included = getIncludedOptions(value);
  const addons = getAddonOptions(value);

  function setIncludedNames(names: string[]) {
    const addonItems = getAddonOptions(value);
    const nextIncluded = names.map((name) => {
      const existing = included.find((item) => item.name === name);
      return existing ?? { name, price: 0, included_in_base: true };
    });
    onChange([...nextIncluded, ...addonItems]);
  }

  function toggleIncludedPreset(name: string, checked: boolean) {
    const current = included.map((item) => item.name);
    if (checked) {
      setIncludedNames([...current, name]);
    } else {
      setIncludedNames(current.filter((item) => item !== name));
    }
  }

  function addCustomIncluded() {
    onChange([...value, { name: "", price: 0, included_in_base: true }]);
  }

  function addAddon() {
    onChange([...value, { name: "", price: 0, included_in_base: false }]);
  }

  function updateAddon(index: number, patch: Partial<ClinicServiceOption>) {
    const addonItems = [...addons];
    addonItems[index] = { ...addonItems[index], ...patch };
    onChange([...included, ...addonItems]);
  }

  function removeAddon(index: number) {
    onChange([...included, ...addons.filter((_, i) => i !== index)]);
  }

  function updateCustomIncluded(currentName: string, name: string) {
    const includedItems = included.map((item) =>
      item.name === currentName ? { ...item, name } : item
    );
    onChange([...includedItems, ...addons]);
  }

  function removeCustomIncluded(name: string) {
    onChange([...included.filter((item) => item.name !== name), ...addons]);
  }

  const presetNames = new Set(DEFAULT_INCLUDED_SERVICE_NAMES);
  const customIncluded = included.filter((item) => !presetNames.has(item.name as typeof DEFAULT_INCLUDED_SERVICE_NAMES[number]));

  return (
    <div className="space-y-6">
      {!packageMode && (
      <div className="space-y-3">
        <Label className="text-base">Included in base price</Label>
        <p className="text-sm text-muted-foreground">
          Checked items are included with the base clinic price at no extra charge.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_INCLUDED_SERVICE_NAMES.map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                checked={included.some((item) => item.name === name)}
                onCheckedChange={(checked) => toggleIncludedPreset(name, !!checked)}
              />
              <Label className="font-normal">{name}</Label>
              <span className="ml-auto text-xs text-muted-foreground">Included</span>
            </div>
          ))}
        </div>

        {customIncluded.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Custom included items</Label>
            {customIncluded.map((item) => (
              <div key={item.name || "new"} className="flex gap-2">
                <Input
                  value={item.name}
                  placeholder="Custom included service"
                  onChange={(e) => updateCustomIncluded(item.name, e.target.value)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomIncluded(item.name)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addCustomIncluded}>
          <Plus className="h-4 w-4 mr-1" />
          Add custom included item
        </Button>
      </div>
      )}

      {packageMode && (
        <p className="text-sm text-muted-foreground">
          Package services are defined above. Use this section only for optional add-ons at booking time.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-base">Optional add-on services</Label>
            <p className="text-sm text-muted-foreground">
              {packageMode
                ? "Extras outside packages that sign-ups can opt into (e.g. microchip)."
                : "Sign-ups can opt in. Track payment for each add-on in booking management."}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAddon}>
            <Plus className="h-4 w-4 mr-1" />
            Add service
          </Button>
        </div>

        {addons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No add-on services yet (e.g. microchip, combo test).</p>
        ) : (
          addons.map((addon, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder="Service name"
                value={addon.name}
                onChange={(e) => updateAddon(index, { name: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                className="w-28"
                placeholder="Price"
                value={addon.price}
                onChange={(e) => updateAddon(index, { price: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-sm text-muted-foreground w-20 shrink-0">
                {formatCurrency(addon.price)}
              </span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAddon(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
