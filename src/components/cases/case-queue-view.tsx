"use client";

import { useMemo, useState } from "react";
import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { CaseQueueSearch } from "@/components/cases/case-queue-search";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import type { HelpRequest } from "@/lib/types";

export type CaseViewMode = "cards" | "table";

interface CaseQueueViewProps {
  cases: HelpRequest[];
  canClaim?: boolean;
  userEmail?: string;
  isAdmin?: boolean;
  initialView?: CaseViewMode;
  initialSort?: IntakeSortKey;
  showControls?: boolean;
}

export function CaseQueueView({
  cases,
  canClaim = false,
  userEmail = "",
  isAdmin = false,
  initialView = "cards",
  initialSort = "date_desc",
  showControls = true,
}: CaseQueueViewProps) {
  const [view, setView] = useState<CaseViewMode>(initialView);
  const [sort, setSort] = useState<IntakeSortKey>(initialSort);
  const [search, setSearch] = useState("");

  const visibleCases = useMemo(() => {
    const searched = filterCasesBySearch(cases, search);
    return sortIntakeCases(searched, sort);
  }, [cases, search, sort]);

  return (
    <div className="space-y-4">
      {showControls && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <CaseQueueSearch value={search} onChange={setSearch} className="w-full sm:max-w-sm" />
          <CaseQueueControls
            view={view}
            sort={sort}
            onViewChange={setView}
            onSortChange={setSort}
          />
        </div>
      )}

      {visibleCases.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {search.trim() ? "No cases match your search." : "No cases to show."}
        </p>
      ) : view === "table" ? (
        <IntakeCaseTable
          cases={visibleCases}
          canClaim={canClaim}
          userEmail={userEmail}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IntakeCaseGrid
            cases={visibleCases}
            canClaim={canClaim}
            userEmail={userEmail}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
