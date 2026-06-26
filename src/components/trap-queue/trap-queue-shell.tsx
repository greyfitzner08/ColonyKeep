"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TrapQueueKanban } from "@/components/trap-queue/trap-queue-kanban";
import type { CaseViewMode } from "@/components/cases/case-queue-view";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { HelpRequest } from "@/lib/types";

interface TrapQueueShellProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

export function TrapQueueShell({ cases, canClaim, userEmail }: TrapQueueShellProps) {
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

  return (
    <TrapQueueKanban
      cases={cases}
      canClaim={canClaim}
      userEmail={userEmail}
      layout={layout}
      sort={sort}
      searchQuery={searchQuery}
      onLayoutChange={(nextLayout) => updateParam("layout", nextLayout === "cards" ? "" : nextLayout)}
      onSortChange={(nextSort) => updateParam("sort", nextSort === "date_desc" ? "" : nextSort)}
      onSearchChange={(query) => updateParam("q", query)}
    />
  );
}
