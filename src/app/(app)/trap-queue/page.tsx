import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { fetchUserCaseWorkHistory } from "@/lib/cases/user-work-history";
import {
  buildClosedCasesQuery,
  buildMyClaimsQuery,
  buildTrapQueueQuery,
  defaultTrapQueueTeamScope,
  resolveTrapQueueNavigation,
  trapQueueFocusLabel,
  trapQueueTeamScopeLabel,
} from "@/lib/cases/trap-queue-query";
import { TrapQueueShell } from "@/components/trap-queue/trap-queue-shell";
import { InquiryAdminMenu } from "@/components/cases/inquiry-admin-menu";
import { ShareRequestFormLink } from "@/components/cases/share-request-form-link";
import { PageHeader } from "@/components/layout/page-header";
import { getServerAppUrl } from "@/lib/app-url";
import { isClaimedTrapCase } from "@/lib/cases/statuses";
import type { HelpRequest } from "@/lib/types";

interface TrapQueuePageProps {
  searchParams: Promise<{
    view?: string;
    focus?: string;
    team?: string;
    scope?: string;
    claimed?: string;
    trapSchool?: string;
  }>;
}

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isTrapRole = profile?.role === "admin" || profile?.role === "trap_team_lead";
  const actorEmail = profile?.email ?? "";

  const isHistoryScope = params.scope === "history";
  const isClosedScope = params.scope === "closed";
  const { focus, teamScope, showOthersClaimed } = resolveTrapQueueNavigation({
    focusParam: params.focus,
    teamParam: params.team,
    viewParam: params.view,
    claimedParam: params.claimed,
    role: profile?.role,
    teamId: profile?.team_id,
  });
  const trapSchoolOnly = !isHistoryScope && params.trapSchool === "only";
  const defaultTeamScope = defaultTrapQueueTeamScope({
    role: profile?.role,
    teamId: profile?.team_id,
  });

  const [{ data: teams }, { data: myTeam }] = await Promise.all([
    supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
    profile?.team_id
      ? supabase.from("trap_teams").select("name").eq("id", profile.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let cases: HelpRequest[] = [];

  if (isHistoryScope) {
    cases = await fetchUserCaseWorkHistory(supabase, actorEmail, { limit: 100 });
  } else if (isClosedScope) {
    const query = buildClosedCasesQuery(supabase, {
      teamScope,
      teamId: profile?.team_id ?? null,
      userEmail: actorEmail,
    });
    const { data: helpRequests } = await query;
    cases = (helpRequests ?? []) as HelpRequest[];
    if (trapSchoolOnly) {
      cases = cases.filter((helpRequest) => Boolean(helpRequest.trap_school_eligible));
    }
  } else if (focus === "mine") {
    const { data: helpRequests } = await buildMyClaimsQuery(supabase, actorEmail);
    cases = (helpRequests ?? []) as HelpRequest[];
    if (trapSchoolOnly) {
      cases = cases.filter((helpRequest) => Boolean(helpRequest.trap_school_eligible));
    }
  } else {
    const query = buildTrapQueueQuery(supabase, {
      teamScope,
      teamId: profile?.team_id ?? null,
      userEmail: actorEmail,
    });
    const { data: helpRequests } = await query;
    cases = (helpRequests ?? []) as HelpRequest[];

    const emailLower = actorEmail.trim().toLowerCase();
    if (showOthersClaimed) {
      // Unclaimed + others' claims (your claims live under My claims).
      cases = cases.filter((helpRequest) => {
        if (!isClaimedTrapCase(helpRequest)) return true;
        return (helpRequest.claimed_by_email ?? "").trim().toLowerCase() !== emailLower;
      });
    } else {
      cases = cases.filter((helpRequest) => !isClaimedTrapCase(helpRequest));
    }

    if (trapSchoolOnly) {
      cases = cases.filter((helpRequest) => Boolean(helpRequest.trap_school_eligible));
    }
  }

  const teamLabel = trapQueueTeamScopeLabel(teamScope, teams ?? [], myTeam?.name);
  const viewDescription = isHistoryScope
    ? "Cases you have claimed, annotated, reserved appointments for, or logged clinic results on."
    : isClosedScope
      ? `Closed and completed cases for ${teamLabel}.`
      : focus === "mine"
        ? "Cases you personally claimed and are working on."
        : showOthersClaimed
          ? `Unclaimed cases and others' claims for ${teamLabel}, oldest first.`
          : `Unclaimed cases for ${teamLabel}, oldest first — ready to claim.`;

  const canImport = profile?.role === "admin";
  const requestFormUrl = `${await getServerAppUrl()}/request`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isHistoryScope ? "My work history" : "Trap Queue"}
        description={viewDescription}
        meta={
          <p className="text-sm font-medium text-foreground/80">
            {!isHistoryScope && !isClosedScope ? (
              <>
                {trapQueueFocusLabel(focus)}
                {focus === "needs_claim" ? ` · ${teamLabel}` : ""}
                {" · "}
              </>
            ) : null}
            {cases.length} {cases.length === 1 ? "case" : "cases"}
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
          canClaim={!isHistoryScope && !isClosedScope && isTrapRole}
          userEmail={actorEmail}
          isAdmin={profile?.role === "admin"}
          teams={teams ?? []}
          myTeamId={profile?.team_id ?? null}
          myTeamName={myTeam?.name ?? null}
          isTrapRole={isTrapRole}
          userRole={profile?.role ?? null}
          showWorkHistory
          defaultTeamScope={defaultTeamScope}
        />
      </Suspense>
    </div>
  );
}
