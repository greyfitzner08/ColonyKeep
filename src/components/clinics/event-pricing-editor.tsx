"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  defaultMatrixFromBasePrice,
  normalizePricingMatrix,
  normalizePricingMode,
} from "@/lib/clinics/event-pricing";
import { formatCurrency } from "@/lib/utils";
import type { ClinicEventPricingMode, ClinicEventPricingTier } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export interface EventPricingValue {
  pricing_mode: ClinicEventPricingMode;
  base_price: number;
  pricing_matrix: ClinicEventPricingTier[];
}

interface EventPricingEditorProps {
  value: EventPricingValue;
  onChange: (next: EventPricingValue) => void;
}

export function EventPricingEditor({ value, onChange }: EventPricingEditorProps) {
  const mode = normalizePricingMode(value.pricing_mode);
  const matrix = normalizePricingMatrix(value.pricing_matrix);

  function setMode(nextMode: ClinicEventPricingMode) {
    if (nextMode === "sponsored") {
      onChange({
        pricing_mode: "sponsored",
        base_price: 0,
        pricing_matrix: [],
      });
      return;
    }

    if (nextMode === "matrix") {
      onChange({
        pricing_mode: "matrix",
        base_price: value.base_price,
        pricing_matrix:
          matrix.length > 0 ? matrix : defaultMatrixFromBasePrice(value.base_price),
      });
      return;
    }

    onChange({
      pricing_mode: "flat",
      base_price: value.base_price,
      pricing_matrix: [],
    });
  }

  function updateTier(index: number, patch: Partial<ClinicEventPricingTier>) {
    const next = matrix.map((tier, i) => (i === index ? { ...tier, ...patch } : tier));
    onChange({
      ...value,
      pricing_mode: "matrix",
      pricing_matrix: normalizePricingMatrix(next),
    });
  }

  function addTier() {
    const nextCats = matrix.length > 0 ? matrix[matrix.length - 1].cats + 1 : 1;
    const lastTotal = matrix.length > 0 ? matrix[matrix.length - 1].total_price : value.base_price;
    const unit = matrix.length > 0 ? matrix[0].total_price : value.base_price;
    onChange({
      ...value,
      pricing_mode: "matrix",
      pricing_matrix: normalizePricingMatrix([
        ...matrix,
        { cats: nextCats, total_price: Math.max(0, lastTotal + unit) },
      ]),
    });
  }

  function removeTier(index: number) {
    onChange({
      ...value,
      pricing_mode: "matrix",
      pricing_matrix: matrix.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label>Pricing</Label>
        <Select value={mode} onValueChange={(next) => setMode(next as ClinicEventPricingMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">Flat price per cat</SelectItem>
            <SelectItem value="matrix">Price by number of cats</SelectItem>
            <SelectItem value="sponsored">Sponsored (free)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {mode === "sponsored"
            ? "Package price is $0 for every booking. Optional add-ons can still have prices."
            : mode === "matrix"
              ? "Set a total package price for each cat count (1 cat, 2 cats, …). Add-ons are extra."
              : "Same base price for every cat. Add-ons are extra."}
        </p>
      </div>

      {mode === "flat" && (
        <div className="space-y-1">
          <Label>Base price (per cat)</Label>
          <NumberInput
            step="0.01"
            min={0}
            value={value.base_price}
            onValueChange={(next) => {
              if (typeof next === "number") {
                onChange({ ...value, pricing_mode: "flat", base_price: next });
              }
            }}
          />
        </div>
      )}

      {mode === "matrix" && (
        <div className="space-y-2">
          <div className="grid grid-cols-[72px_1fr_40px] gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Cats</span>
            <span>Total price</span>
            <span className="sr-only">Remove</span>
          </div>
          {matrix.map((tier, index) => (
            <div key={`${tier.cats}-${index}`} className="grid grid-cols-[72px_1fr_40px] items-center gap-2">
              <NumberInput
                integer
                min={1}
                value={tier.cats}
                onValueChange={(next) => {
                  if (typeof next === "number") updateTier(index, { cats: next });
                }}
              />
              <NumberInput
                step="0.01"
                min={0}
                value={tier.total_price}
                onValueChange={(next) => {
                  if (typeof next === "number") updateTier(index, { total_price: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                disabled={matrix.length <= 1}
                onClick={() => removeTier(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTier}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add cat count
          </Button>
          {matrix.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Example: 1 cat {formatCurrency(matrix[0].total_price)}
              {matrix[1] ? ` · 2 cats ${formatCurrency(matrix[1].total_price)}` : ""}
              {matrix.length > 2 ? " · …" : ""}
            </p>
          )}
        </div>
      )}

      {mode === "sponsored" && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
          This event is marked sponsored — public booking will show appointments as free.
        </p>
      )}
    </div>
  );
}
