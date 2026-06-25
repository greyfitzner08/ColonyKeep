import { isCaseWorker } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/types";

export function canCloseCase(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "trap_team_lead";
}

export function canAddCaseHistoryNote(profile: Profile | null | undefined): boolean {
  return isCaseWorker(profile ?? null);
}
