"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDate, parseDisplayDate, parseMonthDayYear, cn } from "@/lib/utils";

interface DisplayDateInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  /** Stored value as YYYY-MM-DD (or empty). */
  value: string;
  /** Called with YYYY-MM-DD when the typed date is valid, or "" when cleared or invalid. */
  onValueChange: (isoDate: string) => void;
  /** Only accept a real date written as Month Date, Year (September 4, 2026). */
  monthDayYear?: boolean;
}

/** Text date field. Default accepts several formats and displays as "September 4, 2026". */
export function DisplayDateInput({
  value,
  onValueChange,
  monthDayYear = false,
  className,
  id,
  placeholder,
  onBlur,
  ...props
}: DisplayDateInputProps) {
  const parse = monthDayYear ? parseMonthDayYear : parseDisplayDate;
  const resolvedPlaceholder = placeholder ?? (monthDayYear ? "September 4, 2026" : "MM/DD/YYYY");
  const [text, setText] = useState(() => (value ? formatDate(value) : ""));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText((current) => {
      if (monthDayYear && current.trim() && !value && parse(current) === null) {
        return current;
      }
      return value ? formatDate(value) : "";
    });
  }, [value, monthDayYear, parse]);

  function applyText(next: string, commit: boolean) {
    const trimmed = next.trim();
    if (!trimmed) {
      setText(commit ? "" : next);
      setInvalid(Boolean(monthDayYear && commit));
      onValueChange("");
      return;
    }

    const iso = parse(next);
    if (iso) {
      setInvalid(false);
      setText(commit ? formatDate(iso) : next);
      onValueChange(iso);
      return;
    }

    setText(next);
    if (!monthDayYear) return;
    setInvalid(commit);
    onValueChange("");
  }

  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className="space-y-1">
      <Input
        {...props}
        id={id}
        type="text"
        inputMode="text"
        placeholder={resolvedPlaceholder}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        aria-describedby={monthDayYear && invalid ? errorId : undefined}
        className={cn(className, invalid && "border-destructive focus-visible:ring-destructive")}
        value={text}
        onChange={(e) => applyText(e.target.value, false)}
        onBlur={(e) => {
          applyText(text, true);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            applyText(text, true);
          }
          props.onKeyDown?.(e);
        }}
      />
      {monthDayYear && invalid ? (
        <p id={errorId} className="text-sm text-destructive">
          Enter a valid date like September 4, 2026.
        </p>
      ) : null}
    </div>
  );
}
