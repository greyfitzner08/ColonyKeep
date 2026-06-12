import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { CaseCard } from "@/components/cases/case-card";
import { CASE_STATUSES } from "@/lib/constants";
import type { HelpRequest, HelpRequestStatus } from "@/lib/types";

const KANBAN_COLUMNS: HelpRequestStatus[] = [
  "routed_to_trap_team",
  "claimed",
  "appointment_needed",
  "appointment_reserved",
  "cat_trapped",
  "transported",
  "checked_in",
];

export default async function TrapQueuePage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("help_requests")
    .select("*")
    .in("status", KANBAN_COLUMNS)
    .order("created_at", { ascending: false });

  if (profile?.role === "trap_team_lead" || profile?.role === "volunteer") {
    if (profile.team_id) {
      query = query.eq("assigned_team_id", profile.team_id);
    }
  }

  const { data: helpRequests } = await query;
  const cases = (helpRequests ?? []) as HelpRequest[];

  const byStatus = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = cases.filter((c) => c.status === status);
      return acc;
    },
    {} as Record<HelpRequestStatus, HelpRequest[]>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trap Queue</h1>
        <p className="text-muted-foreground">Kanban board for active trapping cases</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => {
          const label = CASE_STATUSES.find((s) => s.value === status)?.label ?? status;
          return (
            <div key={status} className="flex-shrink-0 w-72">
              <div className="bg-muted rounded-lg p-3 mb-3">
                <h3 className="font-semibold text-sm">{label}</h3>
                <span className="text-xs text-muted-foreground">{byStatus[status].length} cases</span>
              </div>
              <div className="space-y-3">
                {byStatus[status].map((hr) => (
                  <CaseCard key={hr.id} helpRequest={hr} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
