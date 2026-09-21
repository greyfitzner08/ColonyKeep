"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import { TrapQueueToolbar } from "@/components/trap-queue/trap-queue-toolbar";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { HelpRequest } from "@/lib/types";
import type { TrapQueueView } from "@/lib/cases/trap-queue-query";

interface TrapQueueShellProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  teams: { id: string; name: string }[];
  myTeamId: string | null;
  myTeamName?: string | null;
  isTrapRole: boolean;
  showWorkHistory?: boolean;
  defaultView?: TrapQueueView;
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
  showWorkHistory = true,
  defaultView = "all",
  toolbarActions,
}: TrapQueueShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const layout = (searchParams.get("layout") === "table" ? "table" : "cards") as CaseViewMode;
  const sort = (searchParams.get("sort") ?? "date_desc") as IntakeSortKey;
  const searchQuery = searchParams.get("q") ?? "";

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
    return sortIntakeCases(filtered, sort);
  }, [cases, searchQuery, sort]);

  return (
    <div className="space-y-4">
      <TrapQueueToolbar
        teams={teams}
        myTeamId={myTeamId}
        myTeamName={myTeamName}
        isTrapRole={isTrapRole}
        showWorkHistory={showWorkHistory}
        layout={layout}
        sort={sort}
        searchQuery={searchQuery}
        onLayoutChange={(nextLayout) => updateParam("layout", nextLayout === "cards" ? "" : nextLayout)}
        onSortChange={(nextSort) => updateParam("sort", nextSort === "date_desc" ? "" : nextSort)}
        onSearchChange={(query) => updateParam("q", query)}
        defaultView={defaultView}
        actions={toolbarActions}
      />

      {visibleCases.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {searchQuery.trim() ? "No cases match your search." : "No cases in this view."}
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
