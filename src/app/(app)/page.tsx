import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupabaseConfigGate } from "@/components/layout/supabase-config-gate";
import { hasSupabaseServerConfig } from "@/lib/supabase/env";
import Link from "next/link";
import {
  Inbox,
  Cat,
  Calendar,
  Users,
  AlertTriangle,
  Plus,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  if (!hasSupabaseServerConfig()) {
    return <SupabaseConfigGate />;
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [
    { count: totalCases },
    { count: openCases },
    { count: totalCats },
    { count: pendingAppointments },
    { count: activeVolunteers },
    { data: overdueFollowUps },
    { data: upcomingShifts },
  ] = await Promise.all([
    supabase.from("help_requests").select("*", { count: "exact", head: true }),
    supabase.from("help_requests").select("*", { count: "exact", head: true }).not("status", "in", '("completed","closed")'),
    supabase.from("cats").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "reserved"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).not("role", "is", null),
    supabase.from("help_requests").select("id, case_number, follow_up_due_date").lt("follow_up_due_date", new Date().toISOString().split("T")[0]).not("status", "in", '("completed","closed")'),
    supabase.from("shifts").select("*").gte("date", new Date().toISOString().split("T")[0]).order("date").limit(3),
  ]);

  const stats = [
    { label: "Total Cases", value: totalCases ?? 0, icon: Inbox, href: "/intake" },
    { label: "Open Cases", value: openCases ?? 0, icon: Cat, href: "/intake" },
    { label: "Cats Helped", value: totalCats ?? 0, icon: Cat, href: "/reports" },
    { label: "Pending Appointments", value: pendingAppointments ?? 0, icon: Calendar, href: "/appointments" },
    { label: "Active Volunteers", value: activeVolunteers ?? 0, icon: Users, href: "/volunteers" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name ?? profile?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/intake"><Inbox className="h-4 w-4 mr-2" />Intake Queue</Link></Button>
          <Button asChild><Link href="/shift-board"><Plus className="h-4 w-4 mr-2" />View Shifts</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {overdueFollowUps && overdueFollowUps.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Overdue Follow-ups ({overdueFollowUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueFollowUps.slice(0, 5).map((hr) => (
                <Link key={hr.id} href={`/case/${hr.id}`} className="flex items-center justify-between text-sm hover:underline">
                  <span>{hr.case_number}</span>
                  <Badge variant="outline" className="text-orange-600">Due {formatDate(hr.follow_up_due_date!)}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {upcomingShifts && upcomingShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingShifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{shift.event_name}</p>
                    <p className="text-muted-foreground">{formatDate(shift.date)} · {shift.start_time} - {shift.end_time}</p>
                  </div>
                  <Badge variant="secondary">{shift.shift_type}</Badge>
                </div>
              ))}
            </div>
            <Button asChild variant="link" className="mt-2 px-0"><Link href="/shift-board">View all shifts</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
