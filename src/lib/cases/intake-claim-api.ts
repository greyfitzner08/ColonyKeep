import { NextResponse } from "next/server";
import { canIntakeReviewerWorkCase } from "@/lib/cases/intake-claim-gate";
import { isIntakeQueueStatus } from "@/lib/cases/statuses";
import type { HelpRequestStatus, UserRole } from "@/lib/types";

/** Shared 403/409 response when inquiry tries to mutate without holding the claim. */
export function intakeClaimRequiredResponse(options: {
  role: UserRole | null | undefined;
  status: HelpRequestStatus;
  claimedByEmail: string | null | undefined;
  actorEmail: string | null | undefined;
}): NextResponse | null {
  if (canIntakeReviewerWorkCase(options)) {
    return null;
  }

  if (!isIntakeQueueStatus(options.status)) {
    return null;
  }

  const claimed = Boolean(options.claimedByEmail?.trim());
  return NextResponse.json(
    {
      error: claimed
        ? "This case is claimed by another intake volunteer. Ask them to unclaim it, or have an admin release the claim."
        : "Claim this case before reviewing or updating it.",
    },
    { status: claimed ? 409 : 403 }
  );
}
