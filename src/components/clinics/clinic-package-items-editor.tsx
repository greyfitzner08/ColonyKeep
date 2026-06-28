"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClinicServiceOption } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface ClinicPackageItemsEditorProps {
  items: string[];
  catalog: ClinicServiceOption[];
  showCatalogPrices?: boolean;
  onChange: (items: string[]) => void;
}

function normalizeItemName(name: string): string {
  return name.trim();
}

export function ClinicPackageItemsEditor({
  items,
  catalog,
  showCatalogPrices = false,
  onChange,
}: ClinicPackageItemsEditorProps) {
  const [draft, setDraft] = useState("");

  function addCustomItem() {
    const name = normalizeItemName(draft);
    if (!name || items.includes(name)) {
      setDraft("");
      return;
    }
    onChange([...items, name]);
    setDraft("");
  }

  function removeItem(name: string) {
    onChange(items.filter((item) => item !== name));
  }

  function toggleCatalogItem(serviceName: string, checked: boolean) {
    if (checked) {
      if (items.includes(serviceName)) return;
      onChange([...items, serviceName]);
      return;
    }
    onChange(items.filter((item) => item !== serviceName));
  }

  const catalogNames = new Set(catalog.map((service) => service.name));

  return (
    <div className="space-y-3">
      <Label className="text-sm font-normal text-muted-foreground">Included items</Label>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">{item}</span>
              {!catalogNames.has(item) && (
                <span className="shrink-0 text-xs text-muted-foreground">Custom</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeItem(item)}
                aria-label={`Remove ${item}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Add items included in this package.</p>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="e.g. Spay/neuter, rabies vaccine, ear tip"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomItem();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addCustomItem} disabled={!draft.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {catalog.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <p className="text-sm font-medium">Quick add from service catalog</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((service) => (
              <label
                key={service.name}
                className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2"
              >
                <Checkbox
                  checked={items.includes(service.name)}
                  onCheckedChange={(checked) => toggleCatalogItem(service.name, !!checked)}
                />
                <span className="min-w-0 flex-1 text-sm">{service.name}</span>
                {showCatalogPrices && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {service.included_in_base ? "Included" : formatCurrency(service.price)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
