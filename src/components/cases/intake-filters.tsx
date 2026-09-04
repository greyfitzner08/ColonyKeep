"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { getStatusOptionsForRole } from "@/lib/cases/statuses";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";

interface IntakeFiltersProps {
  teams: { id: string; name: string }[];
  /** When true, show the My work history scope option (inquiry volunteers). */
  showWorkHistory?: boolean;
}

export function IntakeFilters({ teams, showWorkHistory = false }: IntakeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeStatuses = getStatusOptionsForRole("inquiry_team");
  const view = (searchParams.get("view") ?? "cards") as CaseViewMode;
  const sort = (searchParams.get("sort") ?? "date_desc") as IntakeSortKey;
  const search = searchParams.get("q") ?? "";
  const scope = searchParams.get("scope") === "history" ? "history" : "queue";
  const isHistory = scope === "history";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key === "scope" && value !== "history") {
      params.delete("scope");
    }
    if (key === "scope" && value === "history") {
      params.delete("status");
      params.delete("team");
      params.delete("medical");
    }
    router.push(`/intake?${params.toString()}`);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <CaseQueueSearch value={search} onChange={(q) => updateFilter("q", q)} className="w-full lg:max-w-md" />
        <CaseQueueControls
          view={view}
          sort={sort}
          onViewChange={(nextView) => updateFilter("view", nextView)}
          onSortChange={(nextSort) => updateFilter("sort", nextSort)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {showWorkHistory && (
          <Select value={scope} onValueChange={(v) => updateFilter("scope", v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="queue">Inquiry queue</SelectItem>
              <SelectItem value="history">My work history</SelectItem>
            </SelectContent>
          </Select>
        )}

        {!isHistory && (
          <>
            <Select
              value={searchParams.get("status") ?? "all"}
              onValueChange={(v) => updateFilter("status", v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inquiry Statuses</SelectItem>
                {intakeStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("team") ?? "all"} onValueChange={(v) => updateFilter("team", v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="none">No team</SelectItem>
                {sortTrapTeams(teams).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={searchParams.get("medical") ?? "all"}
              onValueChange={(v) => updateFilter("medical", v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Medical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                <SelectItem value="true">Medical Flags Only</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  );
}
