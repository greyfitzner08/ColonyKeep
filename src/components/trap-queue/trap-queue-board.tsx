"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import type { CaseAssigneeOption } from "@/lib/cases/case-assignees";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequest } from "@/lib/types";

interface TrapQueueBoardProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  assignees?: CaseAssigneeOption[];
}

export function TrapQueueBoard({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  assignees = [],
}: TrapQueueBoardProps) {
  const router = useRouter();

  async function mutateCaseClaim(caseId: string, action: "claim" | "unclaim") {
    const response = await postCaseClaim(caseId, action);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cases.map((helpRequest) => (
        <CaseCard
          key={helpRequest.id}
          helpRequest={helpRequest}
          claim={
            canClaim || isAdmin || helpRequest.claimed_by_email === userEmail
              ? {
                  canClaim,
                  onClaim: () => mutateCaseClaim(helpRequest.id, "claim"),
                  onUnclaim: () => mutateCaseClaim(helpRequest.id, "unclaim"),
                  userEmail,
                  isAdmin,
                  assignees: isAdmin ? assignees : undefined,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
