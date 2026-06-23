"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStatusOptionsForRole } from "@/lib/cases/statuses";
import { INTAKE_SORT_OPTIONS, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { IntakeViewMode } from "@/components/cases/intake-queue-view";
import { cn } from "@/lib/utils";

interface IntakeFiltersProps {
  teams: { id: string; name: string }[];
}

export function IntakeFilters({ teams }: IntakeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeStatuses = getStatusOptionsForRole("inquiry_team");
  const view = (searchParams.get("view") ?? "cards") as IntakeViewMode;
  const sort = (searchParams.get("sort") ?? "date_desc") as IntakeSortKey;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/intake?${params.toString()}`);
  }

  function setView(nextView: IntakeViewMode) {
    updateFilter("view", nextView);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intake Statuses</SelectItem>
            {intakeStatuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("team") ?? "all"} onValueChange={(v) => updateFilter("team", v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Team" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={searchParams.get("medical") ?? "all"} onValueChange={(v) => updateFilter("medical", v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Medical" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cases</SelectItem>
            <SelectItem value="true">Medical Flags Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => updateFilter("sort", v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            {INTAKE_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 w-fit rounded-lg border p-1">
        <Button
          type="button"
          size="sm"
          variant={view === "cards" ? "secondary" : "ghost"}
          className={cn("gap-2", view === "cards" && "shadow-none")}
          onClick={() => setView("cards")}
        >
          <LayoutGrid className="h-4 w-4" />
          Cards
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "table" ? "secondary" : "ghost"}
          className={cn("gap-2", view === "table" && "shadow-none")}
          onClick={() => setView("table")}
        >
          <Table2 className="h-4 w-4" />
          Table
        </Button>
      </div>
    </div>
  );
}
