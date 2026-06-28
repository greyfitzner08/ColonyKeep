"use client";

import { useMemo } from "react";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { HelpRequest } from "@/lib/types";

interface TrapQueueKanbanProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  layout: CaseViewMode;
  sort: IntakeSortKey;
  searchQuery: string;
  onLayoutChange: (layout: CaseViewMode) => void;
  onSortChange: (sort: IntakeSortKey) => void;
  onSearchChange: (query: string) => void;
}

export function TrapQueueKanban({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  layout,
  sort,
  searchQuery,
  onLayoutChange,
  onSortChange,
  onSearchChange,
}: TrapQueueKanbanProps) {
  const visibleCases = useMemo(() => {
    const filtered = filterCasesBySearch(cases, searchQuery);
    return sortIntakeCases(filtered, sort);
  }, [cases, searchQuery, sort]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <CaseQueueSearch
            value={searchQuery}
            onChange={onSearchChange}
            className="w-full lg:max-w-md"
          />
          <CaseQueueControls
            view={layout}
            sort={sort}
            onViewChange={onLayoutChange}
            onSortChange={onSortChange}
          />
        </div>
      </div>

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
