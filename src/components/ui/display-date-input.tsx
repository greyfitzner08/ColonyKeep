"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDate, parseDisplayDate, cn } from "@/lib/utils";

interface DisplayDateInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  /** Stored value as YYYY-MM-DD (or empty). */
  value: string;
  /** Called with YYYY-MM-DD when the typed date is valid, or "" when cleared. */
  onValueChange: (isoDate: string) => void;
}

/** Text date field that displays and accepts DD-MM-YYYY. */
export function DisplayDateInput({
  value,
  onValueChange,
  className,
  id,
  ...props
}: DisplayDateInputProps) {
  const [text, setText] = useState(() => (value ? formatDate(value) : ""));

  useEffect(() => {
    setText(value ? formatDate(value) : "");
  }, [value]);

  return (
    <Input
      {...props}
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="DD-MM-YYYY"
      autoComplete="off"
      className={cn(className)}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (!next.trim()) {
          onValueChange("");
          return;
        }
        const iso = parseDisplayDate(next);
        if (iso) onValueChange(iso);
      }}
    />
  );
}
