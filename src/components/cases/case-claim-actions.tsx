"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { canShowIntakeClaimActions } from "@/lib/cases/case-assignment";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequestStatus, UserRole } from "@/lib/types";

interface CaseClaimActionsProps {
  helpRequestId: string;
  status: HelpRequestStatus;
  claimedByEmail: string | null;
  userEmail: string;
  userRole: UserRole | null;
  isAdmin: boolean;
  canClaim: boolean;
}

export function CaseClaimActions({
  helpRequestId,
  status,
  claimedByEmail,
  userEmail,
  userRole,
  isAdmin,
  canClaim,
}: CaseClaimActionsProps) {
  const router = useRouter();
  const showClaimControls = canShowIntakeClaimActions(userRole, status);
  const isUnclaimed = !claimedByEmail;
  const isMine = claimedByEmail === userEmail;
  const canUnclaim = showClaimControls && Boolean(claimedByEmail && (isMine || isAdmin));
  const canShowClaim = showClaimControls && canClaim && isUnclaimed;

  async function mutate(action: "claim" | "unclaim") {
    const response = await postCaseClaim(helpRequestId, action);
    if (response.ok) {
      router.refresh();
    }
  }

  if (!canShowClaim && !canUnclaim) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canShowClaim && (
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
