"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CaseQueueSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Search input with an immediate local draft so typing stays responsive.
 * Parent updates are debounced; external `value` syncs back when it changes.
 */
export function CaseQueueSearch({
  value,
  onChange,
  placeholder = "Search by case #, name, phone, email, address, or ZIP…",
  className,
  id,
}: CaseQueueSearchProps) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(draft);
  onChangeRef.current = onChange;
  draftRef.current = draft;

  useEffect(() => {
    // Only mirror external value when it differs from what the user is typing.
    if (value !== draftRef.current) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const handle = window.setTimeout(() => {
      onChangeRef.current(draft);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [draft, value]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
