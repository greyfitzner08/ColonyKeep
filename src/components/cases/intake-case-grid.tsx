"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequest } from "@/lib/types";

interface IntakeCaseGridProps {
  cases: HelpRequest[];
  canClaim: boolean;
  userEmail: string;
  isAdmin?: boolean;
  claimBeforeReview?: boolean;
}

export function IntakeCaseGrid({
  cases,
  canClaim,
  userEmail,
  isAdmin = false,
  claimBeforeReview = false,
}: IntakeCaseGridProps) {
  const router = useRouter();

  async function mutateCaseClaim(caseId: string, action: "claim" | "unclaim") {
    const response = await postCaseClaim(caseId, action);
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
          claimBeforeReview={claimBeforeReview}
          claim={
            canClaim || isAdmin || helpRequest.claimed_by_email === userEmail
              ? {
                  canClaim,
                  onClaim: () => mutateCaseClaim(helpRequest.id, "claim"),
                  onUnclaim: () => mutateCaseClaim(helpRequest.id, "unclaim"),
                  userEmail,
                  isAdmin,
                }
              : undefined
          }
        />
      ))}
    </>
  );
}
