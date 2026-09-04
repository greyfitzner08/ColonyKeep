import type { SupabaseClient } from "@supabase/supabase-js";
import type { VolunteerApplicationStatus } from "@/lib/types";

/** Applications that must not retain an active platform session. */
export function isVolunteerLoginBlockedStatus(
  status: VolunteerApplicationStatus | string | null | undefined
): boolean {
  return status === "inactive";
}

export async function getVolunteerApplicationStatusByEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, any, any>,
  email: string
): Promise<VolunteerApplicationStatus | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data } = await client
    .from("volunteer_applications")
    .select("status")
    .ilike("email", normalized)
    .maybeSingle();

  return (data?.status as VolunteerApplicationStatus | undefined) ?? null;
}
