import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import { getStatusLabel, getInquiryTeamStatusLabel } from "@/lib/cases/statuses";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAddCaseHistoryNote } from "@/lib/cases/case-permissions";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { isCaseWorker, canManageAppointments } from "@/lib/permissions";
import { CaseClaimActions } from "@/components/cases/case-claim-actions";
import { CaseRouteToTrapAction } from "@/components/cases/case-route-to-trap-action";
import { CaseNeedsMoreInfoAction } from "@/components/cases/case-needs-more-info-action";
import type { HelpRequest, Cat, Appointment, ClinicFix } from "@/lib/types";

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getAppProfile();

  const { data: helpRequest } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!helpRequest) notFound();

  const [{ data: cats }, { data: appointments }, { data: availableAppointments }, { data: clinicFixes }, { data: teams }, { data: clinics }] =
    await Promise.all([
      supabase.from("cats").select("*").eq("help_request_id", id),
      supabase.from("appointments").select("*").eq("help_request_id", id),
      supabase
        .from("appointments")
        .select("*")
        .eq("status", "available")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date"),
      supabase
        .from("clinic_fixes")
        .select("*")
        .eq("help_request_id", id)
        .order("fix_date", { ascending: false }),
      supabase.from("trap_teams").select("id, name, zip_codes").eq("is_active", true),
      supabase.from("clinics").select("id, name").eq("is_active", true),
    ]);

  const hr = {
    ...(helpRequest as HelpRequest),
    history_log: normalizeHistoryLog(helpRequest.history_log),
  };
  const medical = hasActiveMedicalFlag(
    hr.medical_flags ?? [],
    hr.medical_flag_dismissed,
    hr.medical_flag_forced
  );

  const isInquiryViewer = profile?.role === "inquiry_team";
  const statusLabel = isInquiryViewer ? getInquiryTeamStatusLabel(hr) : getStatusLabel(hr.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{hr.case_number}</h1>
          <Badge className={cn("text-sm", STATUS_COLORS[hr.status])}>
            {statusLabel}
          </Badge>
          {medical && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Medical
            </Badge>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <CaseClaimActions
              helpRequestId={hr.id}
              status={hr.status}
              claimedByEmail={hr.claimed_by_email}
              userEmail={profile?.email ?? ""}
              userRole={profile?.role ?? null}
              isAdmin={profile?.role === "admin"}
              canClaim={isCaseWorker(profile)}
            />
            <CaseRouteToTrapAction
              helpRequestId={hr.id}
              status={hr.status}
              colonyZip={hr.colony_zip}
              userRole={profile?.role ?? null}
            />
            <CaseNeedsMoreInfoAction
              helpRequestId={hr.id}
              status={hr.status}
              userRole={profile?.role ?? null}
            />
          </div>
          <div className="text-base text-muted-foreground">
            {hr.contact_name}
            {hr.colony_zip ? ` · ${hr.colony_zip}` : ""}
            {hr.assigned_team_name ? ` · ${hr.assigned_team_name}` : ""}
          </div>
        </div>
      </div>

      <CaseDetailTabs
        helpRequest={hr}
        cats={(cats ?? []) as Cat[]}
        appointments={(appointments ?? []) as Appointment[]}
        availableAppointments={(availableAppointments ?? []) as Appointment[]}
        clinicFixes={(clinicFixes ?? []) as ClinicFix[]}
        teams={teams ?? []}
        clinics={clinics ?? []}
        userRole={profile?.role ?? null}
        canReviewMedical={profile?.role === "admin" || profile?.role === "inquiry_team"}
        canAddHistoryNote={canAddCaseHistoryNote(profile)}
        canLogClinicFix={canManageAppointments(profile)}
        userName={profile?.full_name ?? profile?.email ?? "Team member"}
        userEmail={profile?.email ?? ""}
      />
    </div>
  );
}
