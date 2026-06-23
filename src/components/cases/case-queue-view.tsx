"use client";

import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { IntakeCaseTable } from "@/components/cases/intake-case-table";
import { CaseQueueControls } from "@/components/cases/case-queue-controls";
import { sortIntakeCases, type IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { HelpRequest } from "@/lib/types";
import { useState } from "react";

export type CaseViewMode = "cards" | "table";

interface CaseQueueViewProps {
  cases: HelpRequest[];
  canClaim?: boolean;
  userEmail?: string;
  initialView?: CaseViewMode;
  initialSort?: IntakeSortKey;
  showControls?: boolean;
}

export function CaseQueueView({
  cases,
  canClaim = false,
  userEmail = "",
  initialView = "cards",
  initialSort = "date_desc",
  showControls = true,
}: CaseQueueViewProps) {
  const [view, setView] = useState<CaseViewMode>(initialView);
  const [sort, setSort] = useState<IntakeSortKey>(initialSort);
  const sortedCases = sortIntakeCases(cases, sort);

  return (
    <div className="space-y-4">
      {showControls && (
        <CaseQueueControls
          view={view}
          sort={sort}
          onViewChange={setView}
          onSortChange={setSort}
        />
      )}

      {view === "table" ? (
        <IntakeCaseTable cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IntakeCaseGrid cases={sortedCases} canClaim={canClaim} userEmail={userEmail} />
        </div>
      )}
    </div>
  );
}
