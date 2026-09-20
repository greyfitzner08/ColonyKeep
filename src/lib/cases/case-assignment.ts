import type { HelpRequest, HelpRequestStatus, UserRole } from "@/lib/types";

export function releaseIntakeAssignmentFields<T extends Partial<HelpRequest>>(record: T): T {
  return {
    ...record,
    claimed_by_email: null,
    claimed_by_name: null,
    assigned_to: null,
  };
}

/** Claim actions are available to case workers on active trap cases. */
export function canShowIntakeClaimActions(
  role: UserRole | null | undefined,
  _status: HelpRequestStatus
): boolean {
  return role === "admin" || role === "trap_team_lead";
}
