"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssignCaseDialog } from "@/components/cases/assign-case-dialog";
import { Button } from "@/components/ui/button";
import type { CaseAssigneeOption } from "@/lib/cases/case-assignees";
import { canShowIntakeClaimActions } from "@/lib/cases/case-assignment";
import { postCaseClaim } from "@/lib/cases/case-claim-api";
import type { HelpRequestStatus, UserRole } from "@/lib/types";

const CLOSED_STATUSES = new Set(["closed", "completed"]);

interface CaseClaimActionsProps {
  helpRequestId: string;
  status: HelpRequestStatus;
  claimedByEmail: string | null;
  userEmail: string;
  userRole: UserRole | null;
  isAdmin: boolean;
  canClaim: boolean;
  /** Make Claim the primary CTA when intake must claim before reviewing. */
  emphasizeClaim?: boolean;
  caseNumber?: string | null;
  assignedTeamId?: string | null;
  /** When provided (admins), show Assign to pick a TNVR user. */
  assignees?: CaseAssigneeOption[];
}

export function CaseClaimActions({
  helpRequestId,
  status,
  claimedByEmail,
  userEmail,
  userRole,
  isAdmin,
  canClaim,
  emphasizeClaim = false,
  caseNumber = null,
  assignedTeamId = null,
  assignees = [],
}: CaseClaimActionsProps) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const showClaimControls = canShowIntakeClaimActions(userRole, status);
  const isUnclaimed = !claimedByEmail;
  const isMine = claimedByEmail === userEmail;
  const canUnclaim = showClaimControls && Boolean(claimedByEmail && (isMine || isAdmin));
  const canShowClaim = showClaimControls && canClaim && isUnclaimed;
  const canAssign =
    isAdmin && assignees.length > 0 && !CLOSED_STATUSES.has(status);

  async function mutate(action: "claim" | "unclaim") {
    const response = await postCaseClaim(helpRequestId, action);
    if (response.ok) {
      router.refresh();
    }
  }

  if (!canShowClaim && !canUnclaim && !canAssign) {
    return null;
  }

  return (
    <>
      {canShowClaim && (
        <Button
          size="sm"
          variant={emphasizeClaim ? "default" : "outline"}
          onClick={() => mutate("claim")}
        >
          {emphasizeClaim ? "Claim to edit" : "Claim case"}
        </Button>
      )}
      {canAssign && (
        <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
          {claimedByEmail ? "Reassign" : "Assign"}
        </Button>
      )}
      {canUnclaim && (
        <Button size="sm" variant="outline" onClick={() => mutate("unclaim")}>
          {isMine ? "Unclaim" : "Release claim"}
        </Button>
      )}
      {canAssign ? (
        <AssignCaseDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          helpRequestId={helpRequestId}
          caseNumber={caseNumber}
          currentClaimedByEmail={claimedByEmail}
          assignees={assignees}
          preferredTeamId={assignedTeamId}
        />
      ) : null}
    </>
  );
}
