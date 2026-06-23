import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { IntakeFilters } from "@/components/cases/intake-filters";
import { IntakeCaseGrid } from "@/components/cases/intake-case-grid";
import { CaseImporter } from "@/components/cases/case-importer";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { INTAKE_QUEUE_STATUSES } from "@/lib/cases/statuses";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

interface IntakePageProps {
  searchParams: Promise<{ status?: string; team?: string; medical?: string }>;
}

export default async function IntakePage({ searchParams }: IntakePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase.from("help_requests").select("*").order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status as HelpRequestStatus);
  } else {
    query = query.in("status", INTAKE_QUEUE_STATUSES);
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

  filtered = sortCasesMedicalFirst(filtered);

  const canImport = profile?.role === "admin";
  const canClaim = profile?.role === "admin" || profile?.role === "inquiry_team";
  const canReviewMedical =
    profile?.role === "admin" || profile?.role === "inquiry_team";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intake Queue</h1>
        <p className="text-muted-foreground">{filtered.length} cases</p>
      </div>

      {canImport && <CaseImporter />}

      <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
        <IntakeFilters teams={teams ?? []} />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IntakeCaseGrid
          cases={filtered}
          canClaim={canClaim}
          canReviewMedical={canReviewMedical}
          userEmail={profile?.email ?? ""}
        />
      </div>
    </div>
  );
}
