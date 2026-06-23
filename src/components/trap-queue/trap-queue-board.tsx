"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import { Button } from "@/components/ui/button";
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
    <>
      {cases.map((helpRequest) => {
        const isMine = helpRequest.claimed_by_email === userEmail;
        const isUnclaimed = !helpRequest.claimed_by_email;

        return (
          <div key={helpRequest.id} className="space-y-2">
            <CaseCard helpRequest={helpRequest} />
            {canClaim && isUnclaimed && (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => claimCase(helpRequest.id)}>
                Claim case
              </Button>
            )}
            {helpRequest.claimed_by_email && !isMine && (
              <p className="text-xs text-muted-foreground px-1">
                Working: {helpRequest.claimed_by_name ?? helpRequest.claimed_by_email}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
