import type { UserRole } from "@/lib/types";

export function canCloseCase(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "trap_team_lead";
}

export function canAddCaseHistoryNote(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "inquiry_team" || role === "trap_team_lead";
}
