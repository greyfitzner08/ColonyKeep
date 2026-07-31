import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { IntakeFilters } from "@/components/cases/intake-filters";
import { IntakeQueueView, type IntakeViewMode } from "@/components/cases/intake-queue-view";
import { InquiryAdminMenu } from "@/components/cases/inquiry-admin-menu";
import { ShareRequestFormLink } from "@/components/cases/share-request-form-link";
import { INTAKE_QUEUE_STATUSES } from "@/lib/cases/statuses";
import { getServerAppUrl } from "@/lib/app-url";
import { isCaseWorker } from "@/lib/permissions";
import type { IntakeSortKey } from "@/lib/cases/sort-intake-cases";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

interface IntakePageProps {
  searchParams: Promise<{
    status?: string;
    team?: string;
    medical?: string;
    view?: string;
    sort?: string;
    q?: string;
  }>;
}

export default async function IntakePage({ searchParams }: IntakePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();

  let query = supabase.from("help_requests").select("*").order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status as HelpRequestStatus);
  } else {
    query = query.in("status", INTAKE_QUEUE_STATUSES);
  }
  if (params.team === "none") {
    query = query.is("assigned_team_id", null);
  } else if (params.team) {
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

  const view = (params.view === "table" ? "table" : "cards") as IntakeViewMode;
  const sort = (params.sort ?? "date_desc") as IntakeSortKey;

  const canImport = profile?.role === "admin";
  const canClaim = isCaseWorker(profile);
  const requestFormUrl = `${await getServerAppUrl()}/request`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inquiry Queue</h1>
          <p className="text-muted-foreground">{filtered.length} cases</p>
          {profile?.role === "inquiry_team" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Claim a case before reviewing details, confirm information is complete, then route it
              to a trap team. Inquiry reviews cases and does not close them.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ShareRequestFormLink requestFormUrl={requestFormUrl} />
            <span className="text-sm text-muted-foreground">
              Share with community members — the link works even while you are logged in
            </span>
          </div>
        </div>
        {canImport && <InquiryAdminMenu />}
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
        <IntakeFilters teams={teams ?? []} />
      </Suspense>

      <IntakeQueueView
        cases={filtered}
        canClaim={canClaim}
        userEmail={profile?.email ?? ""}
        isAdmin={profile?.role === "admin"}
        claimBeforeReview={profile?.role === "inquiry_team"}
        view={view}
        sort={sort}
        searchQuery={params.q ?? ""}
      />
    </div>
  );
}
