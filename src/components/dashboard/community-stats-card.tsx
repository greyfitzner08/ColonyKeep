import { createServiceClient } from "@/lib/supabase/server";
import { CommunityStatsDisplay, type CommunityStats } from "@/components/dashboard/community-stats-display";
import { isDuplicateClosedCase } from "@/lib/cases/duplicate-closed";
import { caseFixedCount } from "@/lib/reports/aggregations";

const CLOSED_STATUSES = '("completed","closed")';

export async function fetchCommunityStats(): Promise<CommunityStats> {
  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ count: openCases }, { data: caseFixRows }, { data: clinicFixes }, { data: nextClinic }] =
    await Promise.all([
      service
        .from("help_requests")
        .select("*", { count: "exact", head: true })
        .not("status", "in", CLOSED_STATUSES),
      service.from("help_requests").select("id, status, outcome, outcome_tnvr_count"),
      service.from("clinic_fixes").select("help_request_id"),
      service
        .from("public_clinic_events")
        .select("title, clinic_name, date, location")
        .eq("is_active", true)
        .gte("date", today)
        .order("date")
        .limit(1)
        .maybeSingle(),
    ]);

  const clinicCountByCase = new Map<string, number>();
  for (const row of clinicFixes ?? []) {
    const id = row.help_request_id as string;
    if (!id) continue;
    clinicCountByCase.set(id, (clinicCountByCase.get(id) ?? 0) + 1);
  }

  const catsFixed = (caseFixRows ?? []).reduce((sum, row) => {
    if (isDuplicateClosedCase(row)) return sum;
    return sum + caseFixedCount(row, clinicCountByCase.get(row.id as string) ?? 0);
  }, 0);

  return {
    openCases: openCases ?? 0,
    catsFixed,
    nextClinic: nextClinic ?? null,
  };
}

export async function CommunityStatsCard() {
  const stats = await fetchCommunityStats();
  return <CommunityStatsDisplay stats={stats} />;
}
