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
}

/** Search input that updates immediately while debouncing the parent filter. */
export function CaseQueueSearch({
  value,
  onChange,
  placeholder = "Search by case #, name, phone, email, address, or ZIP…",
  className,
}: CaseQueueSearchProps) {
  const [draft, setDraft] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const handle = window.setTimeout(() => {
      onChangeRef.current(draft);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [draft, value]);

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
