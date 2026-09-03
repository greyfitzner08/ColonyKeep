export type DashboardSectionId =
  | "community-stats"
  | "overdue-followups"
  | "shifts"
  | "my-cases"
  | "my-trap-work"
  | "trap-team"
  | "appointments"
  | "admin-hint";

export const DEFAULT_SECTION_ORDER: DashboardSectionId[] = [
  "overdue-followups",
  "shifts",
  "my-cases",
  "my-trap-work",
  "trap-team",
  "community-stats",
  "appointments",
  "admin-hint",
];

export const SECTION_LABELS: Record<DashboardSectionId, string> = {
  "community-stats": "Community Stats",
  "overdue-followups": "Overdue Follow-ups",
  shifts: "My Upcoming Shifts",
  "my-cases": "My Cases",
  "my-trap-work": "My Trap Work",
  "trap-team": "Trap Team",
  appointments: "Clinic appointments",
  "admin-hint": "Admin Tips",
};

export function orderStorageKey(profileId: string) {
  return `dashboard-order-${profileId}`;
}

export function collapsedStorageKey(profileId: string) {
  return `dashboard-collapsed-${profileId}`;
}

export function trapTeamStorageKey(profileId: string) {
  return `dashboard-trap-team-${profileId}`;
}

export function mergeSectionOrder(
  visibleIds: DashboardSectionId[],
  savedOrder: DashboardSectionId[] | null
): DashboardSectionId[] {
  const visible = new Set(visibleIds);
  const ordered: DashboardSectionId[] = [];

  for (const id of savedOrder ?? DEFAULT_SECTION_ORDER) {
    if (visible.has(id) && !ordered.includes(id)) {
      ordered.push(id);
    }
  }

  for (const id of visibleIds) {
    if (!ordered.includes(id)) ordered.push(id);
  }

  return ordered;
}
