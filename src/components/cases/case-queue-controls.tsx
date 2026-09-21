"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INTAKE_SORT_OPTIONS, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import { cn } from "@/lib/utils";

interface CaseQueueControlsProps {
  view: CaseViewMode;
  sort: IntakeSortKey;
  onViewChange: (view: CaseViewMode) => void;
  onSortChange: (sort: IntakeSortKey) => void;
}

export function CaseQueueControls({
  view,
  sort,
  onViewChange,
  onSortChange,
}: CaseQueueControlsProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-1 rounded-lg border bg-background p-1 sm:w-fit">
        <Button
          type="button"
          size="sm"
          variant={view === "cards" ? "secondary" : "ghost"}
          className={cn("flex-1 gap-2 sm:flex-none", view === "cards" && "shadow-none")}
          onClick={() => onViewChange("cards")}
        >
          <LayoutGrid className="h-4 w-4" />
          Cards
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "table" ? "secondary" : "ghost"}
          className={cn("flex-1 gap-2 sm:flex-none", view === "table" && "shadow-none")}
          onClick={() => onViewChange("table")}
        >
          <Table2 className="h-4 w-4" />
          Table
        </Button>
      </div>

      <Select value={sort} onValueChange={(value) => onSortChange(value as IntakeSortKey)}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {INTAKE_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
