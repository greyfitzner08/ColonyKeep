"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { ClosedCasesList } from "@/components/trap-queue/closed-cases-list";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import { TrapQueueToolbar } from "@/components/trap-queue/trap-queue-toolbar";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { TrapQueueFocus, TrapQueueTeamScope } from "@/lib/cases/trap-queue-query";
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
  showWorkHistory?: boolean;
  defaultTeamScope?: TrapQueueTeamScope;
  hasMyClaims?: boolean;
  focus?: TrapQueueFocus;
  toolbarActions?: ReactNode;
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
  showWorkHistory = true,
  defaultTeamScope = "all",
  hasMyClaims = false,
  focus = "needs_claim",
  toolbarActions,
}: TrapQueueShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const layout = (searchParams.get("layout") === "table" ? "table" : "cards") as CaseViewMode;
  const sort = (searchParams.get("sort") ?? "date_asc") as IntakeSortKey;
  const searchQuery = searchParams.get("q") ?? "";
  const isClosedScope = searchParams.get("scope") === "closed";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/trap-queue?${params.toString()}`);
  }

  const visibleCases = useMemo(() => {
    const filtered = filterCasesBySearch(cases, searchQuery);
    if (isClosedScope) return filtered;
    return sortIntakeCases(filtered, sort);
  }, [cases, searchQuery, sort, isClosedScope]);

  return (
    <div className="space-y-4">
      <TrapQueueToolbar
        teams={teams}
        myTeamId={myTeamId}
        myTeamName={myTeamName}
        isTrapRole={isTrapRole}
        userRole={userRole}
        showWorkHistory={showWorkHistory}
        layout={layout}
        sort={sort}
        searchQuery={searchQuery}
        onLayoutChange={(nextLayout) => updateParam("layout", nextLayout === "cards" ? "" : nextLayout)}
        onSortChange={(nextSort) => updateParam("sort", nextSort === "date_asc" ? "" : nextSort)}
        onSearchChange={(query) => updateParam("q", query)}
        defaultTeamScope={defaultTeamScope}
        hasMyClaims={hasMyClaims}
        actions={toolbarActions}
      />

      {isClosedScope ? (
        <ClosedCasesList
          cases={visibleCases}
          emptyMessage={
            searchQuery.trim() ? "No cases match your search." : "No closed cases in this view."
          }
        />
      ) : visibleCases.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {searchQuery.trim()
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
        />
      ) : (
        <TrapQueueBoard
          cases={visibleCases}
          canClaim={canClaim}
          userEmail={userEmail}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
