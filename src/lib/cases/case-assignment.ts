import { isIntakeQueueStatus } from "@/lib/cases/statuses";
import type { HelpRequest, HelpRequestStatus, UserRole } from "@/lib/types";

export function releaseIntakeAssignmentFields<T extends Partial<HelpRequest>>(record: T): T {
  return {
    ...record,
    claimed_by_email: null,
    claimed_by_name: null,
    assigned_to: null,
  };
}

/** Inquiry team only manages claims while a case is still in the inquiry queue. */
export function canShowIntakeClaimActions(
  role: UserRole | null | undefined,
  status: HelpRequestStatus
): boolean {
  if (role === "inquiry_team") {
    return isIntakeQueueStatus(status);
  }
  return true;
}
