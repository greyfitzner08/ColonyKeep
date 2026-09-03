"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
      className,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState<string | null>(null);
    const display = draft ?? (value === "" ? "" : String(value));
    const fallback = emptyValue ?? min ?? 0;
    const localRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => localRef.current as HTMLInputElement);

    React.useEffect(() => {
      const input = localRef.current;
      if (!input) return;
      const blockWheel = (event: WheelEvent) => {
        if (document.activeElement === input) event.preventDefault();
      };
      input.addEventListener("wheel", blockWheel, { passive: false });
      return () => input.removeEventListener("wheel", blockWheel);
    }, []);

    return (
      <Input
        {...props}
        ref={localRef}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        className={cn(
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className
        )}
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
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
          }
          props.onKeyDown?.(event);
        }}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";
