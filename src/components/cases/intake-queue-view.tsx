"use client";

import { useMemo } from "react";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import { filterCasesBySearch } from "@/lib/cases/search-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import type { HelpRequest } from "@/lib/types";

interface IntakeQueueViewProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  claimBeforeReview?: boolean;
  view: CaseViewMode;
  sort: IntakeSortKey;
  searchQuery?: string;
}

export function IntakeQueueView({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  claimBeforeReview = false,
  view,
  sort,
  searchQuery = "",
}: IntakeQueueViewProps) {
  const visibleCases = useMemo(() => {
    const searched = filterCasesBySearch(cases, searchQuery);
    return sortIntakeCases(searched, sort);
  }, [cases, searchQuery, sort]);

  if (visibleCases.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        {searchQuery.trim() ? "No cases match your search." : "No cases in this queue."}
      </p>
    );
  }

  if (view === "table") {
    return (
      <IntakeCaseTable
        cases={visibleCases}
        canClaim={canClaim}
        userEmail={userEmail}
        isAdmin={isAdmin}
        claimBeforeReview={claimBeforeReview}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <IntakeCaseGrid
        cases={visibleCases}
        canClaim={canClaim}
        userEmail={userEmail}
        isAdmin={isAdmin}
        claimBeforeReview={claimBeforeReview}
      />
    </div>
  );
}

export type { CaseViewMode as IntakeViewMode };
