import type { SupabaseClient } from "@supabase/supabase-js";

export const VOLUNTEER_APPLICATION_QUEUE_STATUSES = ["pending", "needs_followup"] as const;
export const STALE_VOLUNTEER_APPLICATION_DAYS = 5;

export interface VolunteerApplicationsActivity {
  latestApplicationAt: string | null;
}

export interface VolunteerApplicationQueueSummary {
  queuedCount: number;
  staleCount: number;
  oldestWaitingDays: number;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function volunteerApplicationWaitingDays(createdAt: string, asOf = new Date()): number {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const ms = startOfDay(asOf).getTime() - startOfDay(created).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function staleVolunteerApplicationCutoffIso(
  asOf = new Date(),
  days = STALE_VOLUNTEER_APPLICATION_DAYS
): string {
  return new Date(asOf.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function fetchVolunteerApplicationsActivity(
  service: SupabaseClient
): Promise<VolunteerApplicationsActivity> {
  const { data } = await service
    .from("volunteer_applications")
    .select("created_at")
    .in("status", [...VOLUNTEER_APPLICATION_QUEUE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0] as { created_at: string } | undefined;
  return {
    latestApplicationAt: row?.created_at ?? null,
  };
}

export async function fetchVolunteerApplicationQueueSummary(
  service: SupabaseClient,
  asOf = new Date()
): Promise<VolunteerApplicationQueueSummary> {
  const { data } = await service
    .from("volunteer_applications")
    .select("created_at")
    .in("status", [...VOLUNTEER_APPLICATION_QUEUE_STATUSES]);

  const rows = (data ?? []) as { created_at: string }[];
  let staleCount = 0;
  let oldestWaitingDays = 0;

  for (const row of rows) {
    const waiting = volunteerApplicationWaitingDays(row.created_at, asOf);
    if (waiting >= STALE_VOLUNTEER_APPLICATION_DAYS) staleCount += 1;
    if (waiting > oldestWaitingDays) oldestWaitingDays = waiting;
  }

  return {
    queuedCount: rows.length,
    staleCount,
    oldestWaitingDays,
  };
}

export function shouldShowVolunteerApplicationsIndicator(
  activity: VolunteerApplicationsActivity | null,
  lastSeenAt: string | null,
  isOnVolunteersPage: boolean
): boolean {
  if (isOnVolunteersPage || !activity?.latestApplicationAt) return false;

  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  return new Date(activity.latestApplicationAt).getTime() > lastSeenMs;
}
