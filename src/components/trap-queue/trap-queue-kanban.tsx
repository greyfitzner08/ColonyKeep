"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { getStatusLabel, matchesTrapQueueNavStatus } from "@/lib/cases/statuses";
import { TRAP_KANBAN_STATUSES } from "@/lib/cases/trap-queue-query";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import { cn } from "@/lib/utils";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

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

type TrapStatusFilter = "all" | (typeof TRAP_KANBAN_STATUSES)[number];

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
  const [activeStatus, setActiveStatus] = useState<TrapStatusFilter>("all");

  const filtered = useMemo(
    () => filterCasesBySearch(cases, searchQuery),
    [cases, searchQuery]
  );

  const byStatus = useMemo(
    () =>
      TRAP_KANBAN_STATUSES.reduce(
        (acc, status) => {
          acc[status] = filtered.filter((hr) => matchesTrapQueueNavStatus(hr, status));
          return acc;
        },
        {} as Record<(typeof TRAP_KANBAN_STATUSES)[number], HelpRequest[]>
      ),
    [filtered]
  );

  const statusFiltered =
    activeStatus === "all" ? filtered : byStatus[activeStatus as HelpRequestStatus];

  const visibleCases = useMemo(
    () => sortIntakeCases(statusFiltered, sort),
    [sort, statusFiltered]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
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

        <div className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
          <Button
            type="button"
            size="sm"
            variant={activeStatus === "all" ? "secondary" : "ghost"}
            className={cn("shadow-none", activeStatus === "all" && "shadow-none")}
            onClick={() => setActiveStatus("all")}
          >
            All ({filtered.length})
          </Button>
          {TRAP_KANBAN_STATUSES.map((status) => {
            const count = byStatus[status].length;
            const label = getStatusLabel(status, "trap");

            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={activeStatus === status ? "secondary" : "ghost"}
                className={cn("shadow-none", activeStatus === status && "shadow-none")}
                onClick={() => setActiveStatus(status)}
              >
                {label} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {searchQuery.trim() ? "No cases match your search." : "No cases in this view."}
        </p>
      ) : visibleCases.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No cases in this status.</p>
      ) : layout === "table" ? (
        <IntakeCaseTable
          cases={visibleCases}
          canClaim={canClaim}
          userEmail={userEmail}
          isAdmin={isAdmin}
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
