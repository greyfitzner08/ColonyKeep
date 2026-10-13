"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_INCLUDED_SERVICE_NAMES,
  getAddonOptions,
  getIncludedOptions,
} from "@/lib/clinics/service-catalog";
import type { ClinicServiceOption } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

interface ServiceCatalogEditorProps {
  value: ClinicServiceOption[];
  onChange: (catalog: ClinicServiceOption[]) => void;
  /** When true, clinic pricing is package-based — hide base-price included section. */
  packageMode?: boolean;
}

function isPresetIncludedName(name: string): boolean {
  return (DEFAULT_INCLUDED_SERVICE_NAMES as readonly string[]).includes(name);
}

function CollapsibleCatalogCard({
  title,
  summary,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-md border bg-muted/15", open && "bg-muted/10")}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {!open && summary ? (
          <span className="max-w-[55%] shrink-0 truncate text-xs text-muted-foreground">
            {summary}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="space-y-3 border-t px-3 py-4">
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
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

  const includedSummary =
    included.length === 0
      ? "None selected"
      : `${included.length} selected`;
  const addonSummary =
    addons.length === 0 ? "None yet" : `${addons.length} add-on${addons.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-2">
      {!packageMode ? (
        <CollapsibleCatalogCard
          title="Included services"
          summary={includedSummary}
          description="What's covered when this clinic doesn't use fixed packages."
        >
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
        </CollapsibleCatalogCard>
      ) : null}

      <CollapsibleCatalogCard
        title="Optional add-ons"
        summary={addonSummary}
        description={
          packageMode
            ? "Extras people can add when booking a clinic event (e.g. microchip)."
            : "Optional extras with their own price on clinic event booking."
        }
      >
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
      </CollapsibleCatalogCard>
    </div>
  );
}
