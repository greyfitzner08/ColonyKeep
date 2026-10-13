import { createServiceClient } from "@/lib/supabase/server";
import { CommunityStatsDisplay, type CommunityStats } from "@/components/dashboard/community-stats-display";

const CLOSED_STATUSES = '("completed","closed")';

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ count: openCases }, { data: duplicateCases }, { data: nextClinic }] = await Promise.all([
    service
      .from("help_requests")
      .select("*", { count: "exact", head: true })
      .not("status", "in", CLOSED_STATUSES),
    service
      .from("help_requests")
      .select("id")
      .eq("status", "closed")
      .ilike("outcome", "duplicate"),
    service
      .from("public_clinic_events")
      .select("title, clinic_name, date, location")
      .eq("is_active", true)
      .gte("date", today)
      .order("date")
      .limit(1)
      .maybeSingle(),
  ]);

  const duplicateIds = (duplicateCases ?? []).map((row) => row.id as string);
  let catsFixedQuery = service
    .from("cats")
    .select("*", { count: "exact", head: true })
    .eq("appointment_status", "completed");
  if (duplicateIds.length > 0) {
    catsFixedQuery = catsFixedQuery.not(
      "help_request_id",
      "in",
      `(${duplicateIds.join(",")})`
    );
  }
  const { count: catsFixed } = await catsFixedQuery;

  return {
    openCases: openCases ?? 0,
    catsFixed: catsFixed ?? 0,
    nextClinic: nextClinic ?? null,
  };
}

export async function CommunityStatsCard() {
  const stats = await fetchCommunityStats();
  return <CommunityStatsDisplay stats={stats} />;
}
