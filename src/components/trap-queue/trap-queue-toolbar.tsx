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
import { isTrapSchoolTeamName } from "@/lib/cases/assign-case-team";
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
  const scopeParam = searchParams.get("scope");
  const scope = scopeParam === "history" ? "history" : scopeParam === "closed" ? "closed" : "queue";
  const rawView = searchParams.get("view") ?? defaultView;
  // "My team" only applies when the user has a trap team; otherwise treat as claimed-by-me.
  const currentView = rawView === "mine" && !myTeamId ? "my_claims" : rawView;
  const hideOthersClaimed =
    scope === "queue" && currentView !== "my_claims" && searchParams.get("claimed") !== "show";
  const trapSchoolOnly = scope !== "history" && searchParams.get("trapSchool") === "only";
  const geographicTeams = sortTrapTeams(teams).filter((team) => !isTrapSchoolTeamName(team.name));
  const showMyTeamOption = Boolean(isTrapRole && myTeamId);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/trap-queue?${params.toString()}`);
  }

  const activeFilterCount =
    (showWorkHistory && scope !== "queue" ? 1 : 0) +
    (scope === "queue" && currentView !== "my_claims" && !hideOthersClaimed ? 1 : 0) +
    (trapSchoolOnly ? 1 : 0) +
    (scope !== "closed" && layout !== "cards" ? 1 : 0) +
    (scope !== "closed" && sort !== "date_asc" ? 1 : 0);

  const queueSelect =
    scope !== "history" ? (
      <div className="w-full min-w-[12rem] sm:w-[220px]">
        <Label htmlFor="trap-queue-team" className="sr-only">
          Whose cases
        </Label>
        <Select
          value={currentView}
          onValueChange={(view) =>
            updateParams((params) => {
              if (view === defaultView || (view === "my_claims" && defaultView === "mine" && !myTeamId)) {
                params.delete("view");
              } else {
                params.set("view", view);
              }
            })
          }
        >
          <SelectTrigger id="trap-queue-team" className="h-9 w-full">
            <SelectValue placeholder="Whose cases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="my_claims">Claimed by me</SelectItem>
            {showMyTeamOption ? (
              <SelectItem value="mine">
                {myTeamName ? `My team · ${myTeamName}` : "My team"}
              </SelectItem>
            ) : null}
            <SelectItem value="unassigned">No team</SelectItem>
            <SelectItem value="all">All teams</SelectItem>
            {geographicTeams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.id === myTeamId ? `${team.name} (my team)` : team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  return (
    <PageControlBar
      aria-label="Queue controls"
      activeFilterCount={activeFilterCount}
      filterCollapse="all"
      filtersLabel="Filters"
      search={
        <CaseQueueSearch
          id="trap-queue-search"
          value={searchQuery}
          onChange={onSearchChange}
        />
      }
      actions={
        <>
          {queueSelect}
          {actions}
        </>
      }
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
                    } else if (value === "closed") {
                      params.set("scope", "closed");
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
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="history">My work history</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scope === "queue" && currentView !== "my_claims" ? (
            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="trap-queue-claim-visibility"
                className="text-xs font-medium text-muted-foreground"
              >
                Claim visibility
              </Label>
              <Select
                value={hideOthersClaimed ? "hide_others" : "show_all"}
                onValueChange={(value) =>
                  updateParams((params) => {
                    if (value === "show_all") {
                      params.set("claimed", "show");
                    } else {
                      params.delete("claimed");
                    }
                  })
                }
              >
                <SelectTrigger id="trap-queue-claim-visibility" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hide_others">Hide others&apos; claims</SelectItem>
                  <SelectItem value="show_all">Show all claims</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scope === "queue" || scope === "closed" ? (
            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="trap-queue-trap-school"
                className="text-xs font-medium text-muted-foreground"
              >
                Trap School
              </Label>
              <Select
                value={trapSchoolOnly ? "only" : "all"}
                onValueChange={(value) =>
                  updateParams((params) => {
                    if (value === "only") {
                      params.set("trapSchool", "only");
                    } else {
                      params.delete("trapSchool");
                    }
                  })
                }
              >
                <SelectTrigger id="trap-queue-trap-school" className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All colonies</SelectItem>
                  <SelectItem value="only">Trap School only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {scope === "closed" ? null : (
            <div className="space-y-1.5 min-w-0 sm:col-span-2 xl:min-w-[280px] xl:flex-1">
              <p className="text-xs font-medium text-muted-foreground">Layout & sort</p>
              <CaseQueueControls
                view={layout}
                sort={sort}
                onViewChange={onLayoutChange}
                onSortChange={onSortChange}
              />
            </div>
          )}

          {scope !== "history" ? (
            <p className="text-xs text-muted-foreground sm:col-span-2 xl:basis-full">
              Claimed by me = your personal list
              {showMyTeamOption ? " · My team = your team’s open queue" : ""}.
            </p>
          ) : null}
        </>
      }
    />
  );
}
