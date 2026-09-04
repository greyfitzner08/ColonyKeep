import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { fetchUserCaseWorkHistory } from "@/lib/cases/user-work-history";
import { isCaseWorker } from "@/lib/permissions";
import {
  buildTrapQueueQuery,
  trapQueueViewLabel,
  type TrapQueueView,
} from "@/lib/cases/trap-queue-query";
import { TrapQueueFilters } from "@/components/trap-queue/trap-queue-filters";
import { TrapQueueShell } from "@/components/trap-queue/trap-queue-shell";
import { CaseQueueView } from "@/components/cases/case-queue-view";
import type { HelpRequest } from "@/lib/types";

interface TrapQueuePageProps {
  searchParams: Promise<{ view?: string; scope?: string }>;
}

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const canWorkCases = isCaseWorker(profile);
  const isTrapRole =
    profile?.role === "admin" ||
    profile?.role === "trap_team_lead" ||
    profile?.role === "inquiry_team";

  const isHistoryScope = params.scope === "history";
  const defaultView: TrapQueueView = "all";
  const view = (params.view ?? defaultView) as TrapQueueView;

  const [{ data: teams }, { data: myTeam }] = await Promise.all([
    supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
    profile?.team_id
      ? supabase.from("trap_teams").select("name").eq("id", profile.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let cases: HelpRequest[] = [];

  if (isHistoryScope) {
    cases = await fetchUserCaseWorkHistory(supabase, profile?.email ?? "", { limit: 100 });
  } else {
    const query = buildTrapQueueQuery(supabase, {
      view,
      teamId: profile?.team_id ?? null,
      userEmail: profile?.email ?? "",
    });
    const { data: helpRequests } = await query;
    cases = sortCasesMedicalFirst((helpRequests ?? []) as HelpRequest[]);
  }

  const viewLabel = trapQueueViewLabel(view, teams ?? [], myTeam?.name);
  const viewDescription = isHistoryScope
    ? "Cases you have claimed, annotated, reserved appointments for, or logged clinic results on."
    : view === "mine"
      ? "Cases assigned to your trap team and cases you have personally claimed."
      : view === "unassigned"
        ? "Cases not yet assigned to a trap team."
        : view === "all"
          ? "All active trapping cases across every team."
          : `Cases assigned to ${viewLabel}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isHistoryScope ? "My work history" : "Trap Queue"}
          </h1>
          <p className="text-muted-foreground">{viewDescription}</p>
          <p className="text-sm text-muted-foreground">{cases.length} cases in this view</p>
        </div>
        <Suspense fallback={<div className="h-10 w-[260px] animate-pulse rounded-md bg-muted" />}>
          <TrapQueueFilters
            teams={teams ?? []}
            myTeamId={profile?.team_id ?? null}
            myTeamName={myTeam?.name ?? null}
            isTrapRole={isTrapRole}
            showWorkHistory
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        {isHistoryScope ? (
          <CaseQueueView
            cases={cases}
            canClaim={false}
            userEmail={profile?.email ?? ""}
            isAdmin={profile?.role === "admin"}
            showControls
          />
        ) : (
          <TrapQueueShell
            cases={cases}
            canClaim={isTrapRole}
            userEmail={profile?.email ?? ""}
            isAdmin={profile?.role === "admin"}
          />
        )}
      </Suspense>
    </div>
  );
}
