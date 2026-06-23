"use client";

import { useMemo } from "react";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import type { HelpRequest } from "@/lib/types";

interface IntakeQueueViewProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  view: CaseViewMode;
  sort: IntakeSortKey;
}

/** URL-driven case list for the intake page (controls live in IntakeFilters). */
export function IntakeQueueView({
  cases,
  canClaim,
  userEmail,
  view,
  sort,
}: IntakeQueueViewProps) {
  const sortedCases = useMemo(() => sortIntakeCases(cases, sort), [cases, sort]);

  if (view === "table") {
    return <IntakeCaseTable cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <IntakeCaseGrid cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />
    </div>
  );
}

export type { CaseViewMode as IntakeViewMode };
