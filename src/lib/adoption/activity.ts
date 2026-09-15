import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdoptionApplicationsActivity {
  latestApplicationAt: string | null;
}

export async function fetchAdoptionApplicationsActivity(
  service: SupabaseClient
): Promise<AdoptionApplicationsActivity> {
  const { data } = await service
    .from("adoption_applications")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0] as { created_at: string } | undefined;
  return {
    latestApplicationAt: row?.created_at ?? null,
  };
}

export function shouldShowAdoptionApplicationsIndicator(
  activity: AdoptionApplicationsActivity | null,
  lastSeenAt: string | null,
  isOnApplicationsPage: boolean
): boolean {
  if (isOnApplicationsPage || !activity?.latestApplicationAt) return false;

  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  return new Date(activity.latestApplicationAt).getTime() > lastSeenMs;
}
