"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";

interface TrapQueueToolbarProps {
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
  showWorkHistory?: boolean;
  layout: CaseViewMode;
  sort: IntakeSortKey;
  searchQuery: string;
  onLayoutChange: (layout: CaseViewMode) => void;
  onSortChange: (sort: IntakeSortKey) => void;
  onSearchChange: (query: string) => void;
  actions?: ReactNode;
}

export function TrapQueueToolbar({
  teams,
  myTeamId,
  myTeamName,
  isTrapRole,
  showWorkHistory = false,
  layout,
  sort,
  searchQuery,
  onLayoutChange,
  onSortChange,
  onSearchChange,
  actions,
}: TrapQueueToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "history" ? "history" : "queue";
  const currentView = searchParams.get("view") ?? "all";

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/trap-queue?${params.toString()}`);
  }

  return (
    <section aria-label="Queue controls" className="rounded-lg border bg-muted/20 p-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="trap-queue-search" className="text-xs font-medium text-muted-foreground">
          Search
        </Label>
        <CaseQueueSearch
          id="trap-queue-search"
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full max-w-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showWorkHistory && (
          <div className="space-y-1.5">
            <Label htmlFor="trap-queue-scope" className="text-xs font-medium text-muted-foreground">
              Workspace
            </Label>
            <Select
              value={scope}
              onValueChange={(value) =>
                updateParams((params) => {
                  if (value === "history") {
                    params.set("scope", "history");
                    params.delete("view");
                  } else {
                    params.delete("scope");
                  }
                })
              }
            >
              <SelectTrigger id="trap-queue-scope" className="h-9 w-full">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="queue">Trap queue</SelectItem>
                <SelectItem value="history">My work history</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {scope !== "history" && (
          <div className="space-y-1.5">
            <Label htmlFor="trap-queue-team" className="text-xs font-medium text-muted-foreground">
              Team queue
            </Label>
            <Select
              value={currentView}
              onValueChange={(view) =>
                updateParams((params) => {
                  if (view === "all") {
                    params.delete("view");
                  } else {
                    params.set("view", view);
                  }
                })
              }
            >
              <SelectTrigger id="trap-queue-team" className="h-9 w-full">
                <SelectValue placeholder="Select queue" />
              </SelectTrigger>
              <SelectContent>
                {isTrapRole && (
                  <SelectItem value="mine">
                    {myTeamName ? `My Team (${myTeamName})` : "My Work"}
                  </SelectItem>
                )}
                <SelectItem value="unassigned">No team</SelectItem>
                <SelectItem value="all">All Teams</SelectItem>
                {sortTrapTeams(teams).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.id === myTeamId ? `${team.name} (my team)` : team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">Layout & sort</p>
          <CaseQueueControls
            view={layout}
            sort={sort}
            onViewChange={onLayoutChange}
            onSortChange={onSortChange}
          />
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
