"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
    <div className="space-y-5">
      {!packageMode ? (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Included services</Label>
            <p className="text-xs text-muted-foreground">
              What&apos;s covered when this clinic doesn&apos;t use fixed packages.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {DEFAULT_INCLUDED_SERVICE_NAMES.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <Checkbox
                  checked={included.some((item) => item.name === name)}
                  onCheckedChange={(checked) => toggleIncludedPreset(name, !!checked)}
                />
                <span className="text-sm">{name}</span>
              </label>
            ))}
          </div>

          {customIncluded.length > 0 ? (
            <ul className="space-y-1">
              {customIncluded.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1">{item.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeCustomIncluded(item.name)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <Input
              value={customDraft}
              placeholder="Add another included service"
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
              size="sm"
              onClick={addCustomIncluded}
              disabled={!customDraft.trim()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Optional add-ons</Label>
          <p className="text-xs text-muted-foreground">
            {packageMode
              ? "Extras people can add when booking a clinic event (e.g. microchip)."
              : "Optional extras with their own price on clinic event booking."}
          </p>
        </div>

        {addons.length > 0 ? (
          <ul className="space-y-2">
            {addons.map((addon, index) => (
              <li key={`addon-${addon.name}-${index}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{addon.name}</span>
                <NumberInput
                  step="0.01"
                  min={0}
                  className="w-24"
                  aria-label={`${addon.name} price`}
                  value={addon.price}
                  onValueChange={(value) => {
                    if (typeof value === "number") updateAddon(index, { price: value });
                  }}
                />
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(addon.price)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeAddon(index)}
                  aria-label={`Remove ${addon.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No add-ons yet.</p>
        )}

        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Input
            className="min-w-0 flex-1"
            placeholder="Add-on name"
            value={addonDraftName}
            onChange={(e) => setAddonDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAddon();
              }
            }}
          />
          <NumberInput
            step="0.01"
            min={0}
            className="w-28"
            placeholder="Price"
            value={addonDraftPrice === "" ? "" : Number(addonDraftPrice)}
            allowEmpty
            onValueChange={(value) =>
              setAddonDraftPrice(typeof value === "number" ? String(value) : "")
            }
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
            size="sm"
            onClick={addAddon}
            disabled={!addonDraftName.trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
