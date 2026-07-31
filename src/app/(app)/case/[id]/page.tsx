import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import { getStatusLabel, getInquiryTeamStatusLabel } from "@/lib/cases/statuses";
import {
  canIntakeReviewerWorkCase,
  intakeCaseRequiresClaim,
  intakeClaimGateMessage,
} from "@/lib/cases/intake-claim-gate";
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

  const [{ data: cats }, { data: appointments }, { data: availableAppointments }, { data: clinicFixes }, { data: teams }] =
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
  const actorEmail = profile?.email ?? "";
  const requiresClaim = intakeCaseRequiresClaim(profile?.role, hr.status);
  const canWorkCase = canIntakeReviewerWorkCase({
    role: profile?.role,
    status: hr.status,
    claimedByEmail: hr.claimed_by_email,
    actorEmail,
  });
  const claimGate =
    requiresClaim && !canWorkCase
      ? intakeClaimGateMessage({
          claimedByEmail: hr.claimed_by_email,
          claimedByName: hr.claimed_by_name,
          actorEmail,
        })
      : null;

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
              userEmail={actorEmail}
              userRole={profile?.role ?? null}
              isAdmin={profile?.role === "admin"}
              canClaim={isCaseWorker(profile)}
              emphasizeClaim={Boolean(claimGate?.kind === "unclaimed")}
            />
            {canWorkCase && (
              <>
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
              </>
            )}
          </div>
          <div className="text-base text-muted-foreground">
            {hr.contact_name}
            {hr.colony_zip ? ` · ${hr.colony_zip}` : ""}
            {hr.assigned_team_name ? ` · ${hr.assigned_team_name}` : ""}
          </div>
        </div>
      </div>

      {claimGate && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50">
          <p className="font-medium">
            {claimGate.kind === "unclaimed" ? "Claim required before review" : "Case already claimed"}
          </p>
          <p className="mt-1">{claimGate.message}</p>
          {isInquiryViewer && (
            <p className="mt-2 text-xs opacity-90">
              Intake reviews details for completeness, then routes to a trap team. Intake does not close cases.
            </p>
          )}
        </div>
      )}

      <CaseDetailTabs
        helpRequest={hr}
        cats={(cats ?? []) as Cat[]}
        appointments={(appointments ?? []) as Appointment[]}
        availableAppointments={(availableAppointments ?? []) as Appointment[]}
        clinicFixes={(clinicFixes ?? []) as ClinicFix[]}
        teams={teams ?? []}
        userRole={profile?.role ?? null}
        canReviewMedical={
          (profile?.role === "admin" || profile?.role === "inquiry_team") && canWorkCase
        }
        canAddHistoryNote={canAddCaseHistoryNote(profile) && canWorkCase}
        canLogClinicFix={canManageAppointments(profile) && canWorkCase}
        userName={profile?.full_name ?? profile?.email ?? "Team member"}
        userEmail={actorEmail}
        readOnly={!canWorkCase && requiresClaim}
      />
    </div>
  );
}
