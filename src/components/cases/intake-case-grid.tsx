"use client";

import { useRouter } from "next/navigation";
import { CaseCard } from "@/components/cases/case-card";
import { MedicalReviewActions } from "@/components/cases/medical-review-actions";
import { Button } from "@/components/ui/button";
import { needsMedicalReview } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";

interface IntakeCaseGridProps {
  cases: HelpRequest[];
  canClaim: boolean;
  canReviewMedical: boolean;
  userEmail: string;
}

export function IntakeCaseGrid({ cases, canClaim, canReviewMedical, userEmail }: IntakeCaseGridProps) {
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
      {cases.map((helpRequest) => {
        const isMine = helpRequest.claimed_by_email === userEmail;
        const isUnclaimed = !helpRequest.claimed_by_email;

        return (
          <div key={helpRequest.id} className="space-y-2">
            <CaseCard helpRequest={helpRequest} />
            {canReviewMedical && needsMedicalReview(helpRequest) && (
              <MedicalReviewActions helpRequest={helpRequest} compact />
            )}
            {canClaim && isUnclaimed && (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => claimCase(helpRequest.id)}>
                Claim case
              </Button>
            )}
            {helpRequest.claimed_by_email && !isMine && (
              <p className="text-xs text-muted-foreground px-1">
                Assigned to {helpRequest.claimed_by_name ?? helpRequest.claimed_by_email}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
