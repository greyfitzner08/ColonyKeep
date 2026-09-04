"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import type { ClinicPackage } from "@/lib/types";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";

interface ClinicPackagesEditorProps {
  packages: ClinicPackage[];
  onChange: (packages: ClinicPackage[]) => void;
}

function emptyPackage(): ClinicPackage {
  return { name: "", price: 0, services: [] };
}

function PackageServiceChips({
  services,
  onChange,
}: {
  services: string[];
  onChange: (services: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addService() {
    const name = draft.trim();
    if (!name) return;
    if (services.some((service) => service.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...services, name]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Included services</Label>
      {services.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <span
              key={service}
              className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1 text-sm"
            >
              <span className="min-w-0 truncate">{service}</span>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onChange(services.filter((entry) => entry !== service))}
                aria-label={`Remove ${service}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No services listed yet.</p>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="e.g. Spay/neuter, rabies vaccine"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addService();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addService} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  index,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  pkg: ClinicPackage;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ClinicPackage>) => void;
  onRemove: () => void;
}) {
  const title = pkg.name.trim() || "Untitled package";
  const priceLabel = formatCurrency(pkg.price);

  return (
    <div
      className={cn(
        "rounded-md border bg-muted/15",
        !pkg.name.trim() && "border-dashed"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{priceLabel}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t px-3 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-2">
              <Label htmlFor={`clinic-package-name-${index}`}>Name</Label>
              <Input
                id={`clinic-package-name-${index}`}
                placeholder="e.g. Standard TNVR package"
                value={pkg.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`clinic-package-price-${index}`}>Price</Label>
              <NumberInput
                id={`clinic-package-price-${index}`}
                step="0.01"
                min={0}
                placeholder="0.00"
                value={pkg.price}
                onValueChange={(value) => {
                  if (typeof value === "number") onChange({ price: value });
                }}
              />
            </div>
          </div>

          <PackageServiceChips
            services={pkg.services}
            onChange={(services) => onChange({ services })}
          />
        </div>
      )}
    </div>
  );
}

export function ClinicPackagesEditor({ packages, onChange }: ClinicPackagesEditorProps) {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setExpandedIndexes((prev) => {
      const next = new Set<number>();
      packages.forEach((pkg, index) => {
        if (prev.has(index) || !pkg.name.trim()) next.add(index);
      });
      return next;
    });
  }, [packages.length]);

  function updatePackage(index: number, patch: Partial<ClinicPackage>) {
    onChange(packages.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)));
  }

  function removePackage(index: number) {
    onChange(packages.filter((_, i) => i !== index));
    setExpandedIndexes((prev) => {
      const next = new Set<number>();
      for (const value of prev) {
        if (value < index) next.add(value);
        if (value > index) next.add(value - 1);
      }
      return next;
    });
  }

  function addPackage() {
    const nextIndex = packages.length;
    onChange([...packages, emptyPackage()]);
    setExpandedIndexes((prev) => new Set(prev).add(nextIndex));
  }

  function toggleExpanded(index: number) {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-base">Packages</Label>
          <p className="text-sm text-muted-foreground">
            One card per package. Name and price are required for booking; list whatever services
            are included (they do not have to match add-ons below).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addPackage}>
          <Plus className="mr-1 h-4 w-4" />
          Add package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No packages yet. Add one if this clinic sells fixed-price packages instead of (or in
            addition to) per-service add-ons.
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addPackage}>
            <Plus className="mr-1 h-4 w-4" />
            Create first package
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <PackageCard
              key={index}
              pkg={pkg}
              index={index}
              expanded={expandedIndexes.has(index)}
              onToggle={() => toggleExpanded(index)}
              onChange={(patch) => updatePackage(index, patch)}
              onRemove={() => removePackage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
