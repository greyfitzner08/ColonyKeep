import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { hasSupabaseServerConfig, hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { ConfigurableDashboard } from "@/components/dashboard/configurable-dashboard";
import { PublicPortalHome } from "@/components/public/public-portal-home";
import { fetchCommunityStats } from "@/components/dashboard/community-stats-card";
import { fetchTrapTeamDashboardData } from "@/lib/dashboard/trap-team-data";
import { fetchPendingClinicResults } from "@/lib/appointments/pending-clinic-results";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { fetchUserCaseWorkHistory } from "@/lib/cases/user-work-history";
import { INTAKE_QUEUE_STATUSES } from "@/lib/cases/statuses";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import {
  canClaimShifts,
  canManageAppointments,
  canViewTrapTeamSection,
  getProfilePermissions,
  isCaseWorker,
  isTrapQueueAssignedOnly,
} from "@/lib/permissions";
import {
  fetchVolunteerApplicationQueueSummary,
  type VolunteerApplicationQueueSummary,
} from "@/lib/volunteers/activity";
import { APPOINTMENTS_UI_ENABLED, SHIFT_SIGNUPS_UI_ENABLED } from "@/lib/features";
import type { HelpRequest, Shift } from "@/lib/types";

const CLOSED_STATUSES = '("completed","closed")';

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export default async function DashboardPage() {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const supabase = await createClient();
  const profile = await getAppProfile();

  if (!profile?.id) {
    return <PublicPortalHome />;
  }

  const service = hasSupabaseAdminConfig() ? await createServiceClient() : null;

  const email = profile.email ?? "";
  const today = todayIsoDate();
  const caseWorker = isCaseWorker(profile);
  const trapWorker = profile.role === "admin" || profile.role === "trap_team_lead";
  const assignedOnly = isTrapQueueAssignedOnly(profile);
  const intakeWorker = false;
  const showShifts = SHIFT_SIGNUPS_UI_ENABLED && canClaimShifts(profile);
  const showAppointments = APPOINTMENTS_UI_ENABLED && canManageAppointments(profile);
  const showProgramAppointments = profile.role === "admin";
  const showTrapTeam = canViewTrapTeamSection(profile);

  const { data: myShiftsRaw } = showShifts
    ? await supabase
        .from("shifts")
        .select("*")
        .contains("signed_up_emails", [email])
        .gte("date", today)
        .order("date")
        .order("start_time")
    : { data: [] };

  const myShifts = (myShiftsRaw ?? []) as Shift[];

  let myCases: HelpRequest[] = [];
  let workHistory: HelpRequest[] = [];
  let teamCases: HelpRequest[] = [];
  let overdueFollowUps: { id: string; case_number: string; follow_up_due_date: string }[] = [];
  let pendingAppointments = 0;
  let pendingClinicResults: Awaited<ReturnType<typeof fetchPendingClinicResults>> = [];

  const workHistoryPromise = email
    ? fetchUserCaseWorkHistory(supabase, email, { limit: 12 })
    : Promise.resolve([] as HelpRequest[]);

  if (intakeWorker) {
    const [{ data: claimedCases }, { data: overdue }, history] = await Promise.all([
      supabase
        .from("help_requests")
        .select("*")
        .eq("claimed_by_email", email)
        .in("status", INTAKE_QUEUE_STATUSES)
        .order("updated_at", { ascending: false }),
      supabase
        .from("help_requests")
        .select("id, case_number, follow_up_due_date")
        .eq("claimed_by_email", email)
        .in("status", INTAKE_QUEUE_STATUSES)
        .lt("follow_up_due_date", today),
      workHistoryPromise,
    ]);

    myCases = sortCasesMedicalFirst((claimedCases ?? []) as HelpRequest[]);
    workHistory = history;
    overdueFollowUps = overdue ?? [];
  } else {
    workHistory = await workHistoryPromise;
  }

  if (trapWorker) {
    let teamCasesQuery = supabase
      .from("help_requests")
      .select("*")
      .not("status", "in", CLOSED_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(12);

    // Assigned-only users only see cases claimed/assigned to them — never the full team board.
    if (assignedOnly || !profile.team_id) {
      teamCasesQuery = teamCasesQuery.eq("claimed_by_email", email);
    } else {
      teamCasesQuery = teamCasesQuery.or(
        `assigned_team_id.eq.${profile.team_id},claimed_by_email.eq.${email}`
      );
    }

    const { data: teamCasesRaw } = await teamCasesQuery;
    teamCases = sortCasesMedicalFirst((teamCasesRaw ?? []) as HelpRequest[]);
  }

  if (showAppointments || trapWorker) {
    if (showAppointments) {
      let reservedQuery = supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "reserved");

      if (!showProgramAppointments && email) {
        reservedQuery = reservedQuery.eq("reserved_by", email);
      }

      const { count } = await reservedQuery;
      pendingAppointments = count ?? 0;
    }

    if (trapWorker || showAppointments) {
      try {
        pendingClinicResults = await fetchPendingClinicResults(supabase, email);
      } catch {
        pendingClinicResults = [];
      }
    }
  }

  const { data: trapTeamsRaw } = showTrapTeam
    ? await supabase.from("trap_teams").select("id, name").eq("is_active", true).order("name")
    : { data: [] };

  const trapTeams = sortTrapTeams(trapTeamsRaw ?? []);
  const initialTrapTeamId = profile.team_id ?? trapTeams[0]?.id ?? null;

  let trapTeamData = null;
  if (showTrapTeam && initialTrapTeamId && service) {
    try {
      trapTeamData = await fetchTrapTeamDashboardData(service, supabase, initialTrapTeamId);
    } catch {
      trapTeamData = null;
    }
  }

  let communityStats = null;
  if (!caseWorker && hasSupabaseAdminConfig()) {
    try {
      communityStats = await fetchCommunityStats();
    } catch {
      communityStats = null;
    }
  }

  let volunteerApplicationQueue: VolunteerApplicationQueueSummary | null = null;
  if (getProfilePermissions(profile)?.canManageVolunteers) {
    try {
      volunteerApplicationQueue = await fetchVolunteerApplicationQueueSummary(service ?? supabase);
    } catch {
      volunteerApplicationQueue = null;
    }
  }

  const trapTeamDescription = assignedOnly
    ? "Only cases assigned to you. An admin assigns work — you cannot browse other open team cases."
    : profile.team_id
      ? "Field cases for trapping and transport: assigned to your trap team or personally claimed by you."
      : "Trap and transport cases you personally claimed. Join a trap team to also see team-assigned cases.";

  const quickLinks = {
    trap: Boolean(trapWorker),
    appointments: Boolean(showAppointments),
  };

  return (
    <ConfigurableDashboard
      profileId={profile.id}
      userName={profile.full_name ?? profile.email}
      quickLinks={quickLinks}
      isAdmin={profile.role === "admin"}
      sections={{
        communityStats: !caseWorker,
        overdueFollowUps: intakeWorker && overdueFollowUps.length > 0,
        shifts: showShifts,
        myCases: intakeWorker,
        workHistory: Boolean(email),
        myTrapWork: trapWorker,
        trapTeam: showTrapTeam && trapTeams.length > 0,
        appointments: showAppointments,
        adminHint: caseWorker && profile.role === "admin" && myCases.length === 0,
      }}
      overdueFollowUps={overdueFollowUps}
      myShifts={myShifts}
      myCases={myCases}
      workHistory={workHistory}
      teamCases={teamCases}
      userEmail={email}
      intakeWorker={intakeWorker}
      trapWorker={trapWorker}
      canClaimTrapCases={trapWorker && !assignedOnly}
      trapTeamDescription={trapTeamDescription}
      trapTeams={trapTeams}
      trapTeamData={trapTeamData}
      initialTrapTeamId={initialTrapTeamId}
      pendingAppointments={pendingAppointments}
      appointmentsScope={showProgramAppointments ? "program" : "mine"}
      pendingClinicResults={pendingClinicResults}
      communityStats={communityStats}
      volunteerApplicationQueue={volunteerApplicationQueue}
    />
  );
}
