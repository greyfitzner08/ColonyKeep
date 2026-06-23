import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";
import { MyShiftsCard } from "@/components/dashboard/my-shifts-card";
import { MyCasesSection } from "@/components/dashboard/my-cases-section";
import { sortCasesMedicalFirst } from "@/lib/cases/sort-cases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AlertTriangle, Calendar, Inbox, Kanban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { HelpRequest, Shift, UserRole } from "@/lib/types";

const CLOSED_STATUSES = '("completed","closed")';
const INTAKE_ROLES = new Set<UserRole>(["admin", "inquiry_team"]);
const TRAP_ROLES = new Set<UserRole>(["trap_team_lead", "volunteer"]);

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export default async function DashboardPage() {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const role = profile?.role ?? null;
  const email = profile?.email ?? "";
  const today = todayIsoDate();

  const { data: myShiftsRaw } = await supabase
    .from("shifts")
    .select("*")
    .contains("signed_up_emails", [email])
    .gte("date", today)
    .order("date")
    .order("start_time");

  const myShifts = (myShiftsRaw ?? []) as Shift[];

  let myCases: HelpRequest[] = [];
  let teamCases: HelpRequest[] = [];
  let overdueFollowUps: { id: string; case_number: string; follow_up_due_date: string }[] = [];
  let pendingAppointments = 0;

  if (role && INTAKE_ROLES.has(role)) {
    const [{ data: claimedCases }, { data: overdue }] = await Promise.all([
      supabase
        .from("help_requests")
        .select("*")
        .eq("claimed_by_email", email)
        .not("status", "in", CLOSED_STATUSES)
        .order("updated_at", { ascending: false }),
      supabase
        .from("help_requests")
        .select("id, case_number, follow_up_due_date")
        .eq("claimed_by_email", email)
        .lt("follow_up_due_date", today)
        .not("status", "in", CLOSED_STATUSES),
    ]);

    myCases = sortCasesMedicalFirst((claimedCases ?? []) as HelpRequest[]);
    overdueFollowUps = overdue ?? [];
  }

  if (role && TRAP_ROLES.has(role)) {
    let teamCasesQuery = supabase
      .from("help_requests")
      .select("*")
      .not("status", "in", CLOSED_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(12);

    if (profile?.team_id) {
      teamCasesQuery = teamCasesQuery.or(
        `assigned_team_id.eq.${profile.team_id},claimed_by_email.eq.${email}`
      );
    } else {
      teamCasesQuery = teamCasesQuery.eq("claimed_by_email", email);
    }

    const { data: teamCasesRaw } = await teamCasesQuery;
    teamCases = sortCasesMedicalFirst((teamCasesRaw ?? []) as HelpRequest[]);
  }

  if (role === "clinic_coordination") {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "reserved");
    pendingAppointments = count ?? 0;
  }

  const quickLinks = [
    INTAKE_ROLES.has(role!) && { href: "/intake", label: "Intake Queue", icon: Inbox },
    TRAP_ROLES.has(role!) && { href: "/trap-queue", label: "Trap Queue", icon: Kanban },
    role === "clinic_coordination" && {
      href: "/appointments",
      label: "Appointments",
      icon: Calendar,
    },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Inbox }[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name ?? profile?.email}
          </p>
        </div>
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button key={link.href} asChild variant="outline">
                  <Link href={link.href}>
                    <Icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <MyShiftsCard shifts={myShifts} />

      {role && INTAKE_ROLES.has(role) && (
        <>
          {overdueFollowUps.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  Your Overdue Follow-ups ({overdueFollowUps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueFollowUps.slice(0, 5).map((hr) => (
                    <Link
                      key={hr.id}
                      href={`/case/${hr.id}`}
                      className="flex items-center justify-between text-sm hover:underline"
                    >
                      <span>{hr.case_number}</span>
                      <Badge variant="outline" className="text-orange-600">
                        Due {formatDate(hr.follow_up_due_date)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <MyCasesSection
            title="My Cases"
            description="Cases you are working on. Possible injury or illness cases are pinned to the top."
            cases={myCases}
            emptyMessage="You have not claimed any open cases yet."
            showClaimHint
            canClaim
            userEmail={email}
          />
        </>
      )}

      {role && TRAP_ROLES.has(role) && (
        <MyCasesSection
          title="My Trap Work"
          description={
            profile?.team_id
              ? "Cases assigned to your trap team or personally claimed by you. Medical cases appear first."
              : "Cases you have personally claimed. Join a trap team to also see team-assigned cases."
          }
          cases={teamCases}
          emptyMessage="No team or personal trap cases right now."
          showClaimHint
          hintHref="/trap-queue"
          hintLabel="Open trap queue"
          canClaim={TRAP_ROLES.has(role!)}
          userEmail={email}
        />
      )}

      {role === "clinic_coordination" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Clinic Coordination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">{pendingAppointments}</p>
            <p className="text-sm text-muted-foreground">Reserved appointments awaiting action</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/appointments">Open appointments</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {role === "admin" && myCases.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Claim cases from the intake queue to track them here, or use import on the intake page
            to bulk-add cases.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
