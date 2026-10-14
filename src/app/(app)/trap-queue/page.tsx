import { Suspense } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
  userHasActiveTrapClaims,
} from "@/lib/cases/trap-queue-query";
import { fetchCaseAssignees } from "@/lib/cases/case-assignees";
import { fetchIdleClaimFollowUps } from "@/lib/cases/idle-claim-follow-up";
import { TrapQueueShell } from "@/components/trap-queue/trap-queue-shell";
import { IdleClaimFollowUpBanner } from "@/components/trap-queue/idle-claim-follow-up-banner";
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
    q?: string;
  }>;
}

export default async function TrapQueuePage({ searchParams }: TrapQueuePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isTrapRole = profile?.role === "admin" || profile?.role === "trap_team_lead";
  const isAdmin = profile?.role === "admin";
  const actorEmail = profile?.email ?? "";

  const isHistoryScope = params.scope === "history";
  const isClosedScope = params.scope === "closed";
  const trapSchoolOnly = !isHistoryScope && params.trapSchool === "only";
  const isSearching = Boolean(params.q?.trim());
  const defaultTeamScope = defaultTrapQueueTeamScope({
    role: profile?.role,
    teamId: profile?.team_id,
  });

  const [{ data: teams }, { data: myTeam }, hasMyClaims, idleClaimFollowUps, assignees] =
    await Promise.all([
      supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name"),
      profile?.team_id
        ? supabase.from("trap_teams").select("name").eq("id", profile.team_id).maybeSingle()
        : Promise.resolve({ data: null }),
      // Only needed for the active queue default; skip on history/closed.
      !isHistoryScope && !isClosedScope
        ? userHasActiveTrapClaims(supabase, actorEmail)
        : Promise.resolve(false),
      actorEmail ? fetchIdleClaimFollowUps(supabase, actorEmail) : Promise.resolve([]),
      isAdmin && !isHistoryScope && !isClosedScope
        ? createServiceClient().then((service) => fetchCaseAssignees(service))
        : Promise.resolve([]),
    ]);

  const { focus, teamScope, showOthersClaimed } = resolveTrapQueueNavigation({
    focusParam: params.focus,
    teamParam: params.team,
    viewParam: params.view,
    claimedParam: params.claimed,
    role: profile?.role,
    teamId: profile?.team_id,
    hasMyClaims,
  });

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
  } else if (focus === "mine" && !isSearching) {
    const { data: helpRequests } = await buildMyClaimsQuery(supabase, actorEmail);
    cases = (helpRequests ?? []) as HelpRequest[];
    if (trapSchoolOnly) {
      cases = cases.filter((helpRequest) => Boolean(helpRequest.trap_school_eligible));
    }
  } else {
    // All Cases — or My Cases while searching (so search can find any active case).
    const query = buildTrapQueueQuery(supabase, {
      teamScope,
      teamId: profile?.team_id ?? null,
      userEmail: actorEmail,
    });
    const { data: helpRequests } = await query;
    cases = (helpRequests ?? []) as HelpRequest[];

    // While searching, include claimed cases so a case # lookup isn't hidden by
    // "others' claims" being off (or by being on My Cases).
    if (!isSearching) {
      const emailLower = actorEmail.trim().toLowerCase();
      if (showOthersClaimed) {
        // Unclaimed + others' claims (your claims live under My Cases).
        cases = cases.filter((helpRequest) => {
          if (!isClaimedTrapCase(helpRequest)) return true;
          return (helpRequest.claimed_by_email ?? "").trim().toLowerCase() !== emailLower;
        });
      } else {
        cases = cases.filter((helpRequest) => !isClaimedTrapCase(helpRequest));
      }
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
          ? `Open cases and others' claims for ${teamLabel}, oldest first.`
          : `Open cases for ${teamLabel}, oldest first — ready to claim.`;

  const canImport = isAdmin;
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

      {!isHistoryScope ? <IdleClaimFollowUpBanner alerts={idleClaimFollowUps} /> : null}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
        <TrapQueueShell
          cases={cases}
          canClaim={!isHistoryScope && !isClosedScope && isTrapRole}
          userEmail={actorEmail}
          isAdmin={isAdmin}
          teams={teams ?? []}
          myTeamId={profile?.team_id ?? null}
          myTeamName={myTeam?.name ?? null}
          isTrapRole={isTrapRole}
          userRole={profile?.role ?? null}
          showWorkHistory
          defaultTeamScope={defaultTeamScope}
          hasMyClaims={hasMyClaims}
          focus={focus}
          assignees={assignees}
        />
      </Suspense>
    </div>
  );
}
