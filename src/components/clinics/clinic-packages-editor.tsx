"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import type { ClinicPackage } from "@/lib/types";
import { Plus, X } from "lucide-react";

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

export function ClinicPackagesEditor({ packages, onChange }: ClinicPackagesEditorProps) {
  function updatePackage(index: number, patch: Partial<ClinicPackage>) {
    onChange(packages.map((pkg, i) => (i === index ? { ...pkg, ...patch } : pkg)));
  }

  function removePackage(index: number) {
    onChange(packages.filter((_, i) => i !== index));
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...packages, emptyPackage()])}
        >
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => onChange([emptyPackage()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Create first package
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className={cn(
                "space-y-4 rounded-md border bg-muted/15 p-4",
                !pkg.name.trim() && "border-dashed"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Package {index + 1}
                  {pkg.name.trim() ? (
                    <span className="text-foreground"> · {pkg.name.trim()}</span>
                  ) : null}
                  {pkg.price > 0 ? (
                    <span className="font-normal"> · {formatCurrency(pkg.price)}</span>
                  ) : null}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => removePackage(index)}
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <div className="space-y-2">
                  <Label htmlFor={`clinic-package-name-${index}`}>Name</Label>
                  <Input
                    id={`clinic-package-name-${index}`}
                    placeholder="e.g. Standard TNVR package"
                    value={pkg.name}
                    onChange={(e) => updatePackage(index, { name: e.target.value })}
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
                      if (typeof value === "number") updatePackage(index, { price: value });
                    }}
                  />
                </div>
              </div>

              <PackageServiceChips
                services={pkg.services}
                onChange={(services) => updatePackage(index, { services })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
