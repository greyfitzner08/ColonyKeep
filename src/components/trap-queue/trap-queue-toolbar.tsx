"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { PageControlBar } from "@/components/layout/page-control-bar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { TrapQueueView } from "@/lib/cases/trap-queue-query";
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
  defaultView?: TrapQueueView;
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
  defaultView = "all",
  onLayoutChange,
  onSortChange,
  onSearchChange,
  actions,
}: TrapQueueToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "history" ? "history" : "queue";
  const currentView = searchParams.get("view") ?? defaultView;

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/trap-queue?${params.toString()}`);
  }

  const activeFilterCount =
    (showWorkHistory && scope !== "queue" ? 1 : 0) +
    (scope !== "history" && currentView !== defaultView ? 1 : 0);

  return (
    <PageControlBar
      aria-label="Queue controls"
      activeFilterCount={activeFilterCount}
      search={
        <CaseQueueSearch
          id="trap-queue-search"
          value={searchQuery}
          onChange={onSearchChange}
        />
      }
      actions={actions}
      filters={
        <>
          {showWorkHistory ? (
            <div className="space-y-1.5 min-w-0">
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
          ) : null}

          {scope !== "history" ? (
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="trap-queue-team" className="text-xs font-medium text-muted-foreground">
                Team queue
              </Label>
              <Select
                value={currentView}
                onValueChange={(view) =>
                  updateParams((params) => {
                    if (view === defaultView) {
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
          ) : null}

          <div className="space-y-1.5 min-w-0 sm:col-span-2 xl:min-w-[280px] xl:flex-1">
            <p className="text-xs font-medium text-muted-foreground">Layout & sort</p>
            <CaseQueueControls
              view={layout}
              sort={sort}
              onViewChange={onLayoutChange}
              onSortChange={onSortChange}
            />
          </div>
        </>
      }
    />
  );
}
