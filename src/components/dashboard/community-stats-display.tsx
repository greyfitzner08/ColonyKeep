import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { BarChart3, Calendar, Cat } from "lucide-react";

export interface CommunityStats {
  openCases: number;
  catsFixed: number;
  nextClinic: {
    title: string;
    clinic_name: string;
    date: string;
    location: string;
  } | null;
}

export function CommunityStatsDisplay({ stats }: { stats: CommunityStats }) {
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
          <p className="text-2xl font-bold">{stats.openCases}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Cat className="h-4 w-4" />
            Cats fixed
          </p>
          <p className="text-2xl font-bold">{stats.catsFixed}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Next public clinic
          </p>
          {stats.nextClinic ? (
            <>
              <p className="font-semibold leading-tight">{stats.nextClinic.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(stats.nextClinic.date)} · {stats.nextClinic.clinic_name}
              </p>
              <Badge variant="secondary">{stats.nextClinic.location}</Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming clinics scheduled</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
