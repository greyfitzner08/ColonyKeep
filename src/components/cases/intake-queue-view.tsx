"use client";

import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import {
  INTAKE_SORT_OPTIONS,
  sortIntakeCases,
  type IntakeSortKey,
} from "@/lib/cases/sort-intake-cases";
import type { HelpRequest } from "@/lib/types";

export type IntakeViewMode = "cards" | "table";

interface IntakeQueueViewProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  view: IntakeViewMode;
  sort: IntakeSortKey;
}

export function IntakeQueueView({
  cases,
  canClaim,
  userEmail,
  view,
  sort,
}: IntakeQueueViewProps) {
  const sortedCases = sortIntakeCases(cases, sort);

  if (view === "table") {
    return (
      <IntakeCaseTable cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <IntakeCaseGrid cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />
    </div>
  );
}

export { INTAKE_SORT_OPTIONS };
