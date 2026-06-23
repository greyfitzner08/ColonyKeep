import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { BarChart3, Calendar, Cat } from "lucide-react";

const CLOSED_STATUSES = '("completed","closed")';

export async function CommunityStatsCard() {
  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const [{ count: openCases }, { count: catsFixed }, { data: nextClinic }] = await Promise.all([
    service
      .from("help_requests")
      .select("*", { count: "exact", head: true })
      .not("status", "in", CLOSED_STATUSES),
    service
      .from("cats")
      .select("*", { count: "exact", head: true })
      .eq("appointment_status", "completed"),
    service
      .from("public_clinic_events")
      .select("title, clinic_name, date, location")
      .eq("is_active", true)
      .gte("date", today)
      .order("date")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Organization snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Open cases</p>
          <p className="text-2xl font-bold">{openCases ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Cat className="h-4 w-4" />
            Cats fixed
          </p>
          <p className="text-2xl font-bold">{catsFixed ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Next public clinic
          </p>
          {nextClinic ? (
            <>
              <p className="font-semibold leading-tight">{nextClinic.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(nextClinic.date)} · {nextClinic.clinic_name}
              </p>
              <Badge variant="secondary">{nextClinic.location}</Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming clinics scheduled</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
