import type { SupabaseClient } from "@supabase/supabase-js";
import type { VolunteerApplication, VolunteerApplicationStatus } from "@/lib/types";

const STATUS_PREFERENCE: Record<VolunteerApplicationStatus, number> = {
  approved: 0,
  needs_followup: 1,
  pending: 2,
  inactive: 3,
  rejected: 4,
};

/** Prefer an approved application over a newer pending duplicate for the same email. */
export function pickPreferredVolunteerApplication(
  rows: VolunteerApplication[]
): VolunteerApplication | null {
  if (rows.length === 0) return null;

  return (
    [...rows].sort((a, b) => {
      const byStatus =
        (STATUS_PREFERENCE[a.status] ?? 99) - (STATUS_PREFERENCE[b.status] ?? 99);
      if (byStatus !== 0) return byStatus;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })[0] ?? null
  );
}

/** Load the best matching volunteer application for a profile email (service role). */
export async function loadVolunteerApplicationForEmail(
  service: SupabaseClient,
  email: string | null | undefined
): Promise<VolunteerApplication | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await service
    .from("volunteer_applications")
    .select("*")
    .ilike("email", normalized)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return null;
  return pickPreferredVolunteerApplication(data as VolunteerApplication[]);
}
