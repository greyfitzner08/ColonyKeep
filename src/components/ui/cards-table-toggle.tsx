"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CardsTableViewMode = "cards" | "table";

interface CardsTableToggleProps {
  value: CardsTableViewMode;
  onChange: (value: CardsTableViewMode) => void;
  className?: string;
}

export function CardsTableToggle({ value, onChange, className }: CardsTableToggleProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-0.5 rounded-md border bg-background p-0.5",
        className
      )}
      role="group"
      aria-label="Display layout"
    >
      <Button
        type="button"
        size="sm"
        variant={value === "cards" ? "secondary" : "ghost"}
        className={cn("h-8 gap-1.5 px-2.5", value === "cards" && "shadow-none")}
        onClick={() => onChange("cards")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "table" ? "secondary" : "ghost"}
        className={cn("h-8 gap-1.5 px-2.5", value === "table" && "shadow-none")}
        onClick={() => onChange("table")}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </Button>
    </div>
  );
}
