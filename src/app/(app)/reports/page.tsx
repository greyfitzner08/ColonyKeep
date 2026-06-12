import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CASE_STATUSES } from "@/lib/constants";
import { Download } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: helpRequests },
    { data: cats },
    { data: hours },
    { data: teams },
  ] = await Promise.all([
    supabase.from("help_requests").select("status, colony_county, assigned_team_name, created_at"),
    supabase.from("cats").select("created_at"),
    supabase.from("volunteer_hours").select("volunteer_email, volunteer_name, hours, hour_type, team_name"),
    supabase.from("trap_teams").select("name, region"),
  ]);

  const byStatus = CASE_STATUSES.map((s) => ({
    status: s.label,
    count: (helpRequests ?? []).filter((hr) => hr.status === s.value).length,
  }));

  const byRegion = Object.entries(
    (helpRequests ?? []).reduce(
      (acc, hr) => {
        const region = hr.colony_county || "Unknown";
        acc[region] = (acc[region] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).sort(([, a], [, b]) => b - a);

  const hoursSummary = Object.entries(
    (hours ?? []).reduce(
      (acc, h) => {
        const key = h.volunteer_name ?? h.volunteer_email;
        acc[key] = (acc[key] ?? 0) + Number(h.hours);
        return acc;
      },
      {} as Record<string, number>
    )
  ).sort(([, a], [, b]) => b - a);

  const catsByMonth = Object.entries(
    (cats ?? []).reduce(
      (acc, cat) => {
        const month = cat.created_at.slice(0, 7);
        acc[month] = (acc[month] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Organization metrics and exports</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Cases by Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byStatus.filter((s) => s.count > 0).map((s) => (
                <div key={s.status} className="flex justify-between text-sm">
                  <span>{s.status}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cases by Region</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byRegion.slice(0, 10).map(([region, count]) => (
                <div key={region} className="flex justify-between text-sm">
                  <span>{region}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cats Helped Over Time</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {catsByMonth.map(([month, count]) => (
                <div key={month} className="flex justify-between text-sm">
                  <span>{month}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {catsByMonth.length === 0 && <p className="text-muted-foreground text-sm">No data yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Volunteer Hours Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hoursSummary.slice(0, 15).map(([name, hrs]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{hrs.toFixed(1)} hrs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
