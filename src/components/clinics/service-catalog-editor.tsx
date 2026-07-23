"use client";

import { useState } from "react";
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

function isPresetIncludedName(name: string): boolean {
  return (DEFAULT_INCLUDED_SERVICE_NAMES as readonly string[]).includes(name);
}

export function ServiceCatalogEditor({
  value,
  onChange,
  packageMode = false,
}: ServiceCatalogEditorProps) {
  const included = getIncludedOptions(value);
  const addons = getAddonOptions(value);
  const customIncluded = included.filter((item) => !isPresetIncludedName(item.name));
  const [customDraft, setCustomDraft] = useState("");
  const [addonDraftName, setAddonDraftName] = useState("");
  const [addonDraftPrice, setAddonDraftPrice] = useState("");

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
    const name = customDraft.trim();
    if (!name) return;
    if (included.some((item) => item.name === name)) {
      setCustomDraft("");
      return;
    }
    onChange([...value, { name, price: 0, included_in_base: true }]);
    setCustomDraft("");
  }

  function removeCustomIncluded(name: string) {
    onChange([...included.filter((item) => item.name !== name), ...addons]);
  }

  function addAddon() {
    const name = addonDraftName.trim();
    if (!name) return;
    if (addons.some((item) => item.name === name)) {
      setAddonDraftName("");
      setAddonDraftPrice("");
      return;
    }
    onChange([
      ...value,
      { name, price: parseFloat(addonDraftPrice) || 0, included_in_base: false },
    ]);
    setAddonDraftName("");
    setAddonDraftPrice("");
  }

  function updateAddon(index: number, patch: Partial<ClinicServiceOption>) {
    const addonItems = [...addons];
    addonItems[index] = { ...addonItems[index], ...patch };
    onChange([...included, ...addonItems]);
  }

  function removeAddon(index: number) {
    onChange([...included, ...addons.filter((_, i) => i !== index)]);
  }

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

        <div className="space-y-2">
          <Label className="text-sm">Custom included items</Label>
          {customIncluded.length > 0 ? (
            <ul className="space-y-2">
              {customIncluded.map((item) => (
                <li key={item.name} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm">{item.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeCustomIncluded(item.name)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No custom included items yet.</p>
          )}

          <div className="flex gap-2">
            <Input
              value={customDraft}
              placeholder="Custom included service"
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomIncluded();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomIncluded}
              disabled={!customDraft.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
      )}

      {packageMode && (
        <p className="text-sm text-muted-foreground">
          Package services are defined above. Use this section only for optional add-ons at booking time.
        </p>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-base">Optional add-on services</Label>
          <p className="text-sm text-muted-foreground">
            {packageMode
              ? "Extras outside packages that sign-ups can opt into (e.g. microchip)."
              : "Sign-ups can opt in. Track payment for each add-on in booking management."}
          </p>
        </div>

        {addons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No add-on services yet (e.g. microchip, combo test).</p>
        ) : (
          addons.map((addon, index) => (
            <div key={`addon-${addon.name}-${index}`} className="flex gap-2 items-center">
              <span className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm">{addon.name}</span>
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

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Service name"
            value={addonDraftName}
            onChange={(e) => setAddonDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAddon();
              }
            }}
          />
          <Input
            type="number"
            step="0.01"
            className="w-28"
            placeholder="Price"
            value={addonDraftPrice}
            onChange={(e) => setAddonDraftPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAddon();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addAddon}
            disabled={!addonDraftName.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
