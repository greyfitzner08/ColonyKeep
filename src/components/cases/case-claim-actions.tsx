"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postCaseClaim } from "@/lib/cases/case-claim-api";

interface CaseClaimActionsProps {
  helpRequestId: string;
  claimedByEmail: string | null;
  userEmail: string;
  isAdmin: boolean;
  canClaim: boolean;
}

export function CaseClaimActions({
  helpRequestId,
  claimedByEmail,
  userEmail,
  isAdmin,
  canClaim,
}: CaseClaimActionsProps) {
  const router = useRouter();
  const isUnclaimed = !claimedByEmail;
  const isMine = claimedByEmail === userEmail;
  const canUnclaim = Boolean(claimedByEmail && (isMine || isAdmin));

  async function mutate(action: "claim" | "unclaim") {
    const response = await postCaseClaim(helpRequestId, action);
    if (response.ok) {
      router.refresh();
    }
  }

  if (!canClaim && !canUnclaim) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canClaim && isUnclaimed && (
        <Button size="sm" onClick={() => mutate("claim")}>
          Claim case
        </Button>
      )}
      {canUnclaim && (
        <Button size="sm" variant="outline" onClick={() => mutate("unclaim")}>
          {isMine ? "Unclaim" : "Release claim"}
        </Button>
      )}
    </div>
  );
}
