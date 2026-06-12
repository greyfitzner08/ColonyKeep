import { createClient } from "@/lib/supabase/server";
import { CaseCard } from "@/components/cases/case-card";
import { IntakeFilters } from "@/components/cases/intake-filters";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

interface IntakePageProps {
  searchParams: Promise<{ status?: string; team?: string; medical?: string }>;
}

export default async function IntakePage({ searchParams }: IntakePageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("help_requests").select("*").order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status as HelpRequestStatus);
  }
  if (params.team) {
    query = query.eq("assigned_team_id", params.team);
  }

  const { data: helpRequests } = await query;
  const { data: teams } = await supabase.from("trap_teams").select("id, name").eq("is_active", true);

  let filtered = (helpRequests ?? []) as HelpRequest[];
  if (params.medical === "true") {
    filtered = filtered.filter(
      (hr) =>
        hr.medical_flag_forced ||
        (!hr.medical_flag_dismissed && (hr.medical_flags?.length ?? 0) > 0)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intake Queue</h1>
        <p className="text-muted-foreground">{filtered.length} cases</p>
      </div>

      <IntakeFilters teams={teams ?? []} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((hr) => (
          <CaseCard key={hr.id} helpRequest={hr} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">No cases match your filters.</p>
        )}
      </div>
    </div>
  );
}
