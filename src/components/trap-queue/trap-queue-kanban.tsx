"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getStatusLabel } from "@/lib/cases/statuses";
import { TRAP_KANBAN_STATUSES } from "@/lib/cases/trap-queue-query";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import { cn } from "@/lib/utils";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

interface TrapQueueKanbanProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

type TrapStatusFilter = "all" | (typeof TRAP_KANBAN_STATUSES)[number];

export function TrapQueueKanban({ cases, canClaim, userEmail }: TrapQueueKanbanProps) {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<TrapStatusFilter>("all");

  const filtered = useMemo(() => filterCasesBySearch(cases, search), [cases, search]);

  const byStatus = useMemo(
    () =>
      TRAP_KANBAN_STATUSES.reduce(
        (acc, status) => {
          acc[status] = filtered.filter((hr) => hr.status === status);
          return acc;
        },
        {} as Record<(typeof TRAP_KANBAN_STATUSES)[number], HelpRequest[]>
      ),
    [filtered]
  );

  const visibleCases =
    activeStatus === "all" ? filtered : byStatus[activeStatus as HelpRequestStatus];

  return (
    <div className="space-y-4">
      <CaseQueueSearch value={search} onChange={setSearch} className="w-full max-w-md" />

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

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {search.trim() ? "No cases match your search." : "No cases in this view."}
        </p>
      ) : visibleCases.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No cases in this status.</p>
      ) : (
        <TrapQueueBoard cases={visibleCases} canClaim={canClaim} userEmail={userEmail} />
      )}
    </div>
  );
}
