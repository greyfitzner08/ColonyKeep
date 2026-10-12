"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { PageControlBar } from "@/components/layout/page-control-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { isTrapSchoolTeamName } from "@/lib/cases/assign-case-team";
import {
  defaultTrapQueueFocus,
  resolveTrapQueueNavigation,
  type TrapQueueFocus,
  type TrapQueueTeamScope,
} from "@/lib/cases/trap-queue-query";
import type { UserRole } from "@/lib/types";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import { cn } from "@/lib/utils";

interface TrapQueueToolbarProps {
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
  userRole?: UserRole | null;
  showWorkHistory?: boolean;
  layout: CaseViewMode;
  sort: IntakeSortKey;
  searchQuery: string;
  defaultTeamScope?: TrapQueueTeamScope;
  hasMyClaims?: boolean;
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
  userRole = null,
  showWorkHistory = false,
  layout,
  sort,
  searchQuery,
  defaultTeamScope = "all",
  hasMyClaims = false,
  onLayoutChange,
  onSortChange,
  onSearchChange,
  actions,
}: TrapQueueToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopeParam = searchParams.get("scope");
  const scope = scopeParam === "history" ? "history" : scopeParam === "closed" ? "closed" : "queue";
  const defaultFocus = defaultTrapQueueFocus({ hasMyClaims });

  const { focus, teamScope, showOthersClaimed } = resolveTrapQueueNavigation({
    focusParam: searchParams.get("focus"),
    teamParam: searchParams.get("team"),
    viewParam: searchParams.get("view"),
    claimedParam: searchParams.get("claimed"),
    role: userRole,
    teamId: myTeamId,
    hasMyClaims,
  });

  const trapSchoolOnly = scope !== "history" && searchParams.get("trapSchool") === "only";
  const geographicTeams = sortTrapTeams(teams).filter((team) => !isTrapSchoolTeamName(team.name));
  const showMyTeamOption = Boolean(isTrapRole && myTeamId);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    // Drop legacy view= once focus/team are in use.
    if (params.has("focus") || params.has("team")) {
      params.delete("view");
    }
    router.push(`/trap-queue?${params.toString()}`);
  }

  function setFocus(next: TrapQueueFocus) {
    updateParams((params) => {
      if (next === defaultFocus) {
        params.delete("focus");
      } else {
        params.set("focus", next);
      }
      if (next === "mine") {
        params.delete("claimed");
      }
    });
  }

  const activeFilterCount =
    (showWorkHistory && scope !== "queue" ? 1 : 0) +
    (scope !== "history" && teamScope !== defaultTeamScope ? 1 : 0) +
    (scope === "queue" && focus === "needs_claim" && showOthersClaimed ? 1 : 0) +
    (trapSchoolOnly ? 1 : 0) +
    (scope !== "closed" && layout !== "cards" ? 1 : 0) +
    (scope !== "closed" && sort !== "date_asc" ? 1 : 0);

  const focusToggle =
    scope === "queue" ? (
      <div
        className="flex h-9 w-full items-center gap-0.5 rounded-md border bg-background p-0.5 sm:w-auto"
        role="group"
        aria-label="Trap queue focus"
      >
        <Button
          type="button"
          size="sm"
          variant={focus === "needs_claim" ? "secondary" : "ghost"}
          className={cn(
            "h-8 flex-1 gap-1.5 px-3 sm:flex-none",
            focus === "needs_claim" && "shadow-none"
          )}
          onClick={() => setFocus("needs_claim")}
        >
          Unclaimed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={focus === "mine" ? "secondary" : "ghost"}
          className={cn("h-8 flex-1 gap-1.5 px-3 sm:flex-none", focus === "mine" && "shadow-none")}
          onClick={() => setFocus("mine")}
        >
          My claims
        </Button>
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
          {focusToggle}
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
                      params.delete("focus");
                      params.delete("team");
                      params.delete("view");
                    } else if (value === "closed") {
                      params.set("scope", "closed");
                      params.delete("focus");
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

          {scope !== "history" && !(scope === "queue" && focus === "mine") ? (
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="trap-queue-team" className="text-xs font-medium text-muted-foreground">
                Team
              </Label>
              <Select
                value={teamScope}
                onValueChange={(value) =>
                  updateParams((params) => {
                    if (value === defaultTeamScope) {
                      params.delete("team");
                    } else {
                      params.set("team", value);
                    }
                  })
                }
              >
                <SelectTrigger id="trap-queue-team" className="h-9 w-full">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
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
          ) : null}

          {scope === "queue" && focus === "needs_claim" ? (
            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="trap-queue-claim-visibility"
                className="text-xs font-medium text-muted-foreground"
              >
                Others&apos; claims
              </Label>
              <Select
                value={showOthersClaimed ? "show" : "hide"}
                onValueChange={(value) =>
                  updateParams((params) => {
                    if (value === "show") {
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
                  <SelectItem value="hide">Hide (default)</SelectItem>
                  <SelectItem value="show">Show others&apos; claimed cases</SelectItem>
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
        </>
      }
    />
  );
}
