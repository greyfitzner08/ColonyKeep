import { NextResponse } from "next/server";
import { canIntakeReviewerWorkCase } from "@/lib/cases/intake-claim-gate";
import type { HelpRequestStatus, UserRole } from "@/lib/types";

/** Shared 403/409 when inquiry or TNVR tries to mutate without holding the claim. */
export function intakeClaimRequiredResponse(options: {
  role: UserRole | null | undefined;
  status?: HelpRequestStatus;
  claimedByEmail: string | null | undefined;
  actorEmail: string | null | undefined;
}): NextResponse | null {
  if (canIntakeReviewerWorkCase(options)) {
    return null;
  }

  const claimed = Boolean(options.claimedByEmail?.trim());
  return NextResponse.json(
    {
      error: claimed
        ? "This case is claimed by another volunteer. Ask them to unclaim it, or have an admin release the claim."
        : "Claim this case before reviewing or updating it.",
    },
    { status: claimed ? 409 : 403 }
  );
}
