import { isIntakeQueueStatus } from "@/lib/cases/statuses";
import type { HelpRequestStatus, UserRole } from "@/lib/types";

/** Platform roles that review intake cases and must claim before working them. */
export function isIntakeReviewRole(role: UserRole | null | undefined): boolean {
  return role === "inquiry_team";
}

export function intakeCaseRequiresClaim(
  role: UserRole | null | undefined,
  status: HelpRequestStatus
): boolean {
  return isIntakeReviewRole(role) && isIntakeQueueStatus(status);
}

/**
 * Whether an intake reviewer may edit / route / annotate this case.
 * Admins are never blocked. Inquiry team must hold the claim while the case
 * is still in the inquiry queue.
 */
export function canIntakeReviewerWorkCase(options: {
  role: UserRole | null | undefined;
  status: HelpRequestStatus;
  claimedByEmail: string | null | undefined;
  actorEmail: string | null | undefined;
}): boolean {
  const { role, status, claimedByEmail, actorEmail } = options;
  if (role === "admin") return true;
  if (!intakeCaseRequiresClaim(role, status)) return true;
  if (!actorEmail?.trim()) return false;
  return (claimedByEmail ?? "").trim().toLowerCase() === actorEmail.trim().toLowerCase();
}

export function intakeClaimGateMessage(options: {
  claimedByEmail: string | null | undefined;
  claimedByName: string | null | undefined;
  actorEmail: string | null | undefined;
}): { kind: "unclaimed" | "other"; message: string } {
  const claimed = Boolean(options.claimedByEmail?.trim());
  if (!claimed) {
    return {
      kind: "unclaimed",
      message:
        "Claim this case before reviewing details. Claiming locks it to you so another intake volunteer doesn’t work it at the same time.",
    };
  }
  const who = options.claimedByName?.trim() || options.claimedByEmail?.trim() || "another volunteer";
  return {
    kind: "other",
    message: `This case is claimed by ${who}. Only they can review and route it right now.`,
  };
}
