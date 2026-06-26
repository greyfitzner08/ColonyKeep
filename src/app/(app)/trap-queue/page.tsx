import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { isCaseWorker } from "@/lib/permissions";
import {
  buildTrapQueueQuery,
  trapQueueViewLabel,
  type TrapQueueView,
} from "@/lib/cases/trap-queue-query";
import { TrapQueueFilters } from "@/components/trap-queue/trap-queue-filters";
import { TrapQueueShell } from "@/components/trap-queue/trap-queue-shell";
import type { HelpRequest } from "@/lib/types";

interface TrapQueuePageProps {
  searchParams: Promise<{ view?: string }>;
}

const TRAP_ROLES = new Set(["trap_team_lead", "volunteer", "admin"]);

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const canWorkCases = isCaseWorker(profile);
  const isTrapRole =
    canWorkCases &&
    (profile?.role === "admin" ||
      profile?.role === "trap_team_lead" ||
      profile?.role === "inquiry_team" ||
      TRAP_ROLES.has(profile?.role ?? "") ||
      (profile?.volunteer_roles ?? []).some((role) =>
        ["trapper", "trap_loaner", "transporter", "recovery", "intake_representative"].includes(role)
      ));

  const defaultView: TrapQueueView = isTrapRole ? "mine" : "all";
  const view = (params.view ?? defaultView) as TrapQueueView;

  const [{ data: teams }, { data: myTeam }] = await Promise.all([
    supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
    profile?.team_id
      ? supabase.from("trap_teams").select("name").eq("id", profile.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const query = buildTrapQueueQuery(supabase, {
    view,
    teamId: profile?.team_id ?? null,
    userEmail: profile?.email ?? "",
  });

  const { data: helpRequests } = await query;
  const cases = sortCasesMedicalFirst((helpRequests ?? []) as HelpRequest[]);

  const viewLabel = trapQueueViewLabel(view, teams ?? [], myTeam?.name);
  const viewDescription =
    view === "mine"
      ? "Cases assigned to your trap team and cases you have personally claimed."
      : view === "unassigned"
        ? "Cases waiting for a trap team assignment."
        : view === "all"
          ? "All active trapping cases across every team."
          : `Cases assigned to ${viewLabel}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trap Queue</h1>
          <p className="text-muted-foreground">{viewDescription}</p>
          <p className="text-sm text-muted-foreground">{cases.length} cases in this view</p>
        </div>
        <Suspense fallback={<div className="h-10 w-[260px] animate-pulse rounded-md bg-muted" />}>
          <TrapQueueFilters
            teams={teams ?? []}
            myTeamId={profile?.team_id ?? null}
            myTeamName={myTeam?.name ?? null}
            isTrapRole={isTrapRole}
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <TrapQueueShell
          cases={cases}
          canClaim={isTrapRole}
          userEmail={profile?.email ?? ""}
        />
      </Suspense>
    </div>
  );
}
