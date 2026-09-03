"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value: number | "";
  onValueChange: (value: number | "") => void;
  integer?: boolean;
  min?: number;
  max?: number;
  /** Applied on blur when the field is empty. Defaults to `min` if set, otherwise 0. */
  emptyValue?: number;
};

function parseRaw(raw: string, integer: boolean): number | null {
  const parsed = integer ? parseInt(raw, 10) : parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function clamp(value: number, min?: number, max?: number) {
  let next = value;
  if (min != null) next = Math.max(min, next);
  if (max != null) next = Math.min(max, next);
  return next;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      integer = false,
      min,
      max,
      emptyValue,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState<string | null>(null);
    const display = draft ?? (value === "" ? "" : String(value));
    const fallback = emptyValue ?? min ?? 0;

    return (
      <Input
        {...props}
        ref={ref}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        value={display}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === "") {
            onValueChange("");
            return;
          }
          const parsed = parseRaw(raw, integer);
          if (parsed == null) return;
          onValueChange(parsed);
        }}
        onBlur={(event) => {
          const raw = draft ?? event.target.value;
          const parsed = raw === "" ? null : parseRaw(raw, integer);
          onValueChange(clamp(parsed ?? fallback, min, max));
          setDraft(null);
          onBlur?.(event);
        }}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
