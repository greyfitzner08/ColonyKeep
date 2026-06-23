"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CaseQueueSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CaseQueueSearch({
  value,
  onChange,
  placeholder = "Search by case #, name, phone, email, address, or ZIP…",
  className,
}: CaseQueueSearchProps) {
  return (
    <div className={className ?? "relative w-full max-w-md"}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
