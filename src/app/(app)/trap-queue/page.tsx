import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { CASE_STATUSES } from "@/lib/constants";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import {
  buildTrapQueueQuery,
  TRAP_KANBAN_STATUSES,
  trapQueueViewLabel,
  type TrapQueueView,
} from "@/lib/cases/trap-queue-query";
import { TrapQueueFilters } from "@/components/trap-queue/trap-queue-filters";
import { TrapQueueBoard } from "@/components/trap-queue/trap-queue-board";
import type { HelpRequest, UserRole } from "@/lib/types";

interface TrapQueuePageProps {
  searchParams: Promise<{ view?: string }>;
}

const TRAP_ROLES = new Set<UserRole>(["trap_team_lead", "volunteer", "admin"]);

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const role = profile?.role ?? null;
  const isTrapRole = role != null && TRAP_ROLES.has(role);

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

  const byStatus = TRAP_KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = cases.filter((helpRequest) => helpRequest.status === status);
      return acc;
    },
    {} as Record<(typeof TRAP_KANBAN_STATUSES)[number], HelpRequest[]>
  );

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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {TRAP_KANBAN_STATUSES.map((status) => {
          const label = CASE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
          const columnCases = byStatus[status];

          return (
            <div key={status} className="w-72 shrink-0">
              <div className="mb-3 rounded-lg bg-muted p-3">
                <h3 className="text-sm font-semibold">{label}</h3>
                <span className="text-xs text-muted-foreground">{columnCases.length} cases</span>
              </div>
              <div className="space-y-3">
                {columnCases.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">No cases</p>
                ) : (
                  <TrapQueueBoard
                    cases={columnCases}
                    canClaim={isTrapRole}
                    userEmail={profile?.email ?? ""}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
