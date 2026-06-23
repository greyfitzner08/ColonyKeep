"use client";

import { useMemo, useState } from "react";
import { getStatusLabel } from "@/lib/cases/statuses";
import { TRAP_KANBAN_STATUSES } from "@/lib/cases/trap-queue-query";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import type { HelpRequest } from "@/lib/types";

interface TrapQueueKanbanProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

export function TrapQueueKanban({ cases, canClaim, userEmail }: TrapQueueKanbanProps) {
  const [search, setSearch] = useState("");
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

  return (
    <div className="space-y-4">
      <CaseQueueSearch value={search} onChange={setSearch} className="w-full max-w-md" />

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          {search.trim() ? "No cases match your search." : "No cases in this view."}
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TRAP_KANBAN_STATUSES.map((status) => {
            const columnCases = byStatus[status];
            const label = getStatusLabel(status, "trap");

            return (
              <div key={status} className="w-72 shrink-0">
                <div className="mb-3 rounded-lg bg-muted p-3">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="text-xs text-muted-foreground">{columnCases.length} cases</span>
                </div>
                <div className="space-y-3">
                  {columnCases.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">No cases</p>
                  ) : (
                    <TrapQueueBoard cases={columnCases} canClaim={canClaim} userEmail={userEmail} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
