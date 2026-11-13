"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { ClosedCasesList } from "@/components/trap-queue/closed-cases-list";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import { TrapQueueToolbar } from "@/components/trap-queue/trap-queue-toolbar";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { CaseAssigneeOption } from "@/lib/cases/case-assignees";
import {
  resolveTrapQueueNavigation,
  type TrapQueueFocus,
  type TrapQueueTeamScope,
} from "@/lib/cases/trap-queue-query";
import {
  readTrapQueueSavedView,
  trapQueueParamsToSavedView,
  trapQueueSavedViewToSearchParams,
  trapQueueUrlHasViewParams,
  writeTrapQueueSavedView,
} from "@/lib/cases/trap-queue-view-storage";
import type { HelpRequest, UserRole } from "@/lib/types";

interface TrapQueueShellProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
  userRole?: UserRole | null;
  profileId?: string | null;
  showWorkHistory?: boolean;
  defaultTeamScope?: TrapQueueTeamScope;
  hasMyClaims?: boolean;
  focus?: TrapQueueFocus;
  assignedOnly?: boolean;
  toolbarActions?: ReactNode;
  assignees?: CaseAssigneeOption[];
}

function buildTrapQueueHref(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `/trap-queue?${query}` : "/trap-queue";
}

export function TrapQueueShell({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  teams,
  myTeamId,
  myTeamName = null,
  isTrapRole,
  userRole = null,
  profileId = null,
  showWorkHistory = true,
  defaultTeamScope = "all",
  hasMyClaims = false,
  focus = "needs_claim",
  assignedOnly = false,
  toolbarActions,
  assignees = [],
}: TrapQueueShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const restoredViewRef = useRef(false);

  const layout = (searchParams.get("layout") === "table" ? "table" : "cards") as CaseViewMode;
  const sort = (searchParams.get("sort") ?? "date_asc") as IntakeSortKey;
  const urlSearchQuery = searchParams.get("q") ?? "";
  const isClosedScope = searchParams.get("scope") === "closed";

  // Keep typing local so each keystroke doesn't hit the App Router / server page.
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    setSearchQuery(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    if (!profileId || restoredViewRef.current) return;
    restoredViewRef.current = true;

    const liveParams = new URLSearchParams(window.location.search);
    if (trapQueueUrlHasViewParams(liveParams)) {
      const resolved = resolveTrapQueueNavigation({
        focusParam: liveParams.get("focus"),
        teamParam: liveParams.get("team"),
        viewParam: liveParams.get("view"),
        claimedParam: liveParams.get("claimed"),
        role: userRole,
        teamId: myTeamId,
        hasMyClaims,
        assignedOnly,
      });
      writeTrapQueueSavedView(
        profileId,
        trapQueueParamsToSavedView({
          params: liveParams,
          focus: resolved.focus,
          teamScope: resolved.teamScope,
          showOthersClaimed: resolved.showOthersClaimed,
        })
      );
      return;
    }

    const saved = readTrapQueueSavedView(profileId);
    if (!saved) return;

    // Assigned-only users can keep layout/sort/scope, but not All Cases browse params.
    const restoredParams = trapQueueSavedViewToSearchParams(
      assignedOnly
        ? {
            ...saved,
            focus: "mine",
            team: undefined,
            claimed: undefined,
          }
        : saved
    );
    const existingQuery = liveParams.get("q");
    if (existingQuery?.trim()) {
      restoredParams.set("q", existingQuery);
    }

    const href = buildTrapQueueHref(restoredParams);
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href === currentHref) return;
    router.replace(href, { scroll: false });
  }, [profileId, router, userRole, myTeamId, hasMyClaims, assignedOnly]);

  function currentParams(): URLSearchParams {
    // Prefer the live URL so soft-synced `q` survives other filter updates.
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams.toString());
  }

  function persistView(params: URLSearchParams) {
    if (!profileId) return;
    const resolved = resolveTrapQueueNavigation({
      focusParam: params.get("focus"),
      teamParam: params.get("team"),
      viewParam: params.get("view"),
      claimedParam: params.get("claimed"),
      role: userRole,
      teamId: myTeamId,
      hasMyClaims,
      assignedOnly,
    });
    writeTrapQueueSavedView(
      profileId,
      trapQueueParamsToSavedView({
        params,
        focus: resolved.focus,
        teamScope: resolved.teamScope,
        showOthersClaimed: resolved.showOthersClaimed,
      })
    );
  }

  function softSyncSearchToUrl(query: string) {
    const params = currentParams();
    if (query.trim()) params.set("q", query);
    else params.delete("q");
    window.history.replaceState(window.history.state, "", buildTrapQueueHref(params));
  }

  function navigateWithParams(mutate: (params: URLSearchParams) => void) {
    const params = currentParams();
    // Preserve in-progress search that may only exist in local state / soft URL sync.
    if (searchQueryRef.current.trim()) {
      params.set("q", searchQueryRef.current);
    } else {
      params.delete("q");
    }
    mutate(params);
    persistView(params);
    router.replace(buildTrapQueueHref(params), { scroll: false });
  }

  function updateParam(key: string, value: string) {
    navigateWithParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query);

    const wasSearching = Boolean(urlSearchQuery.trim());
    const willSearch = Boolean(query.trim());
    // My Cases loads a smaller server set; searching expands to the open queue once.
    const needsServerDatasetChange =
      !assignedOnly && focus === "mine" && wasSearching !== willSearch;

    if (needsServerDatasetChange) {
      startTransition(() => {
        navigateWithParams((params) => {
          if (willSearch) params.set("q", query);
          else params.delete("q");
        });
      });
      return;
    }

    softSyncSearchToUrl(query);
  }

  const visibleCases = useMemo(() => {
    const filtered = filterCasesBySearch(cases, deferredSearchQuery);
    if (isClosedScope) return filtered;
    return sortIntakeCases(filtered, sort);
  }, [cases, deferredSearchQuery, sort, isClosedScope]);

  return (
    <div className="space-y-4">
      <TrapQueueToolbar
        teams={teams}
        myTeamId={myTeamId}
        myTeamName={myTeamName}
        isTrapRole={isTrapRole}
        userRole={userRole}
        profileId={profileId}
        showWorkHistory={showWorkHistory}
        layout={layout}
        sort={sort}
        searchQuery={searchQuery}
        onLayoutChange={(nextLayout) => updateParam("layout", nextLayout === "cards" ? "" : nextLayout)}
        onSortChange={(nextSort) => updateParam("sort", nextSort === "date_asc" ? "" : nextSort)}
        onSearchChange={handleSearchChange}
        defaultTeamScope={defaultTeamScope}
        hasMyClaims={hasMyClaims}
        assignedOnly={assignedOnly}
        actions={toolbarActions}
      />

      {isClosedScope ? (
        <ClosedCasesList
          cases={visibleCases}
          emptyMessage={
            deferredSearchQuery.trim()
              ? "No cases match your search."
              : "No closed cases in this view."
          }
        />
      ) : visibleCases.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {deferredSearchQuery.trim()
            ? "No cases match your search."
            : focus === "mine"
              ? "You have not claimed any active cases."
              : "No unclaimed cases in this queue right now."}
        </p>
      ) : layout === "table" ? (
        <IntakeCaseTable
          cases={visibleCases}
          canClaim={canClaim}
          userEmail={userEmail}
          isAdmin={isAdmin}
          statusLabelContext="trap"
          assignees={assignees}
        />
      ) : (
        <TrapQueueBoard
          cases={visibleCases}
          canClaim={canClaim}
          userEmail={userEmail}
          isAdmin={isAdmin}
          assignees={assignees}
        />
      )}
    </div>
  );
}
