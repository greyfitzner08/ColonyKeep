import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { fetchUserCaseWorkHistory } from "@/lib/cases/user-work-history";
import {
  buildTrapQueueQuery,
  trapQueueViewLabel,
  type TrapQueueView,
} from "@/lib/cases/trap-queue-query";
import { TrapQueueShell } from "@/components/trap-queue/trap-queue-shell";
import { InquiryAdminMenu } from "@/components/cases/inquiry-admin-menu";
import { ShareRequestFormLink } from "@/components/cases/share-request-form-link";
import { PageHeader } from "@/components/layout/page-header";
import { getServerAppUrl } from "@/lib/app-url";
import type { HelpRequest } from "@/lib/types";

interface TrapQueuePageProps {
  searchParams: Promise<{ view?: string; scope?: string }>;
}

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isTrapRole = profile?.role === "admin" || profile?.role === "trap_team_lead";

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
          ? "All active trapping cases across every team. New requests auto-assign by ZIP, or to Trap School when 5 or fewer cats/kittens are reported."
          : `Cases assigned to ${viewLabel}.`;

  const canImport = profile?.role === "admin";
  const requestFormUrl = `${await getServerAppUrl()}/request`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isHistoryScope ? "My work history" : "Trap Queue"}
        description={viewDescription}
        meta={
          <p className="text-sm font-medium text-foreground/80">
            {cases.length} {cases.length === 1 ? "case" : "cases"} in this view
          </p>
        }
        actions={
          !isHistoryScope ? (
            <>
              <ShareRequestFormLink requestFormUrl={requestFormUrl} />
              {canImport ? (
                <InquiryAdminMenu
                  submitterEmails={cases.map((helpRequest) => helpRequest.contact_email)}
                />
              ) : null}
            </>
          ) : null
        }
      />

      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <TrapQueueShell
          cases={cases}
          canClaim={!isHistoryScope && isTrapRole}
          userEmail={profile?.email ?? ""}
          isAdmin={profile?.role === "admin"}
          teams={teams ?? []}
          myTeamId={profile?.team_id ?? null}
          myTeamName={myTeam?.name ?? null}
          isTrapRole={isTrapRole}
          showWorkHistory
        />
      </Suspense>
    </div>
  );
}
