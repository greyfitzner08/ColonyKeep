import type { HelpRequestStatus, UserRole } from "@/lib/types";

/** Roles that must hold a case claim before editing. Admins are exempt. */
export function isClaimRestrictedRole(role: UserRole | null | undefined): boolean {
  return role === "inquiry_team" || role === "trap_team_lead" || role === "volunteer";
}

/** @deprecated Prefer isClaimRestrictedRole — inquiry was the original claim-gated role. */
export function isIntakeReviewRole(role: UserRole | null | undefined): boolean {
  return role === "inquiry_team";
}

/**
 * Whether this role must claim before editing the case.
 * Status is unused (kept for call-site compatibility).
 */
export function intakeCaseRequiresClaim(
  role: UserRole | null | undefined,
  _status?: HelpRequestStatus
): boolean {
  return isClaimRestrictedRole(role);
}

/**
 * Whether the actor may edit / route / annotate this case.
 * Admins are never blocked. Inquiry and TNVR roles must hold the claim.
 */
export function canIntakeReviewerWorkCase(options: {
  role: UserRole | null | undefined;
  status?: HelpRequestStatus;
  claimedByEmail: string | null | undefined;
  actorEmail: string | null | undefined;
}): boolean {
  const { role, claimedByEmail, actorEmail } = options;
  if (role === "admin") return true;
  if (!isClaimRestrictedRole(role)) return true;
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
        "Claim this case before making edits. Claiming locks it to you so another volunteer doesn’t work it at the same time.",
    };
  }
  const who = options.claimedByName?.trim() || options.claimedByEmail?.trim() || "another volunteer";
  return {
    kind: "other",
    message: `This case is claimed by ${who}. Only they can edit it right now.`,
  };
}
