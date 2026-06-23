"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import type { HelpRequest } from "@/lib/types";

interface IntakeCaseGridProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
}

export function IntakeCaseGrid({ cases, canClaim, userEmail }: IntakeCaseGridProps) {
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

  if (cases.length === 0) {
    return (
      <p className="col-span-full text-center text-muted-foreground py-12">
        No cases match your filters.
      </p>
    );
  }

  return (
    <>
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
    </>
  );
}
