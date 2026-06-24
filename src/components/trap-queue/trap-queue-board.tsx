"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import type { HelpRequest } from "@/lib/types";

interface TrapQueueBoardProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

export function TrapQueueBoard({ cases, canClaim, userEmail }: TrapQueueBoardProps) {
  const router = useRouter();

  async function claimCase(caseId: string) {
    const response = await fetch("/api/help-requests/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpRequestId: caseId }),
    });

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
            canClaim
              ? {
                  canClaim: true,
                  onClaim: () => claimCase(helpRequest.id),
                  userEmail,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
