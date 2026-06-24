"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  COUNTY_SELECT_OTHER,
  SERVICE_COUNTIES,
  canonicalServiceCounty,
  normalizeCountyName,
} from "@/lib/counties";

interface CountySelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function selectValueForCounty(value: string): string {
  const canonical = canonicalServiceCounty(value);
  if (canonical) return canonical;
  if (normalizeCountyName(value)) return COUNTY_SELECT_OTHER;
  return "";
}

export function CountySelect({
  id,
  label = "County",
  value,
  onChange,
  required = false,
}: CountySelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const selectValue = selectValueForCounty(value);
  const showCustomInput = selectValue === COUNTY_SELECT_OTHER;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <select
        id={fieldId}
        required={required && !showCustomInput}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value;
          if (next === COUNTY_SELECT_OTHER) {
            onChange(canonicalServiceCounty(value) ? "" : value);
            return;
          }
          onChange(next);
        }}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <option value="">Select county...</option>
        {SERVICE_COUNTIES.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
        <option value={COUNTY_SELECT_OTHER}>Other county...</option>
      </select>

      {showCustomInput && (
        <Input
          value={canonicalServiceCounty(value) ? "" : value}
          onChange={(event) => onChange(normalizeCountyName(event.target.value))}
          placeholder="Enter county name"
          required={required}
          aria-label={`${label} (other)`}
        />
      )}
    </div>
  );
}
