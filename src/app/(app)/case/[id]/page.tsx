import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/constants";
import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HelpRequest, Cat, Appointment } from "@/lib/types";

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default async function CasePage({ params }: CasePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: helpRequest } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!helpRequest) notFound();

  const [{ data: cats }, { data: appointments }, { data: teams }, { data: clinics }] =
    await Promise.all([
      supabase.from("cats").select("*").eq("help_request_id", id),
      supabase.from("appointments").select("*").eq("help_request_id", id),
      supabase.from("trap_teams").select("id, name, zip_codes").eq("is_active", true),
      supabase.from("clinics").select("id, name").eq("is_active", true),
    ]);

  const hr = helpRequest as HelpRequest;
  const medical = hasActiveMedicalFlag(
    hr.medical_flags ?? [],
    hr.medical_flag_dismissed,
    hr.medical_flag_forced
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-3xl font-bold">{hr.case_number}</h1>
          <Badge className={cn("text-sm", STATUS_COLORS[hr.status])}>
            {hr.status.replace(/_/g, " ")}
          </Badge>
          {medical && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Medical Alert
            </Badge>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4 space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Contact</p>
            <p className="text-base font-semibold">{hr.contact_name || "—"}</p>
            <p className="text-base">{hr.contact_email || "—"}</p>
            <p className="text-base">{hr.contact_phone || "—"}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Colony Location</p>
            <p className="text-base font-semibold">{hr.colony_address || "—"}</p>
            <p className="text-base">
              {[hr.colony_city, hr.colony_state, hr.colony_zip].filter(Boolean).join(", ") || "—"}
            </p>
            {hr.colony_county && (
              <p className="text-base text-muted-foreground">{hr.colony_county} County</p>
            )}
          </div>
          <div className="rounded-lg border p-4 space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">Colony Cats</p>
            <p className="text-base">
              {hr.cats_over_8_weeks} adult{hr.cats_over_8_weeks !== 1 ? "s" : ""},{" "}
              {hr.kittens_under_8_weeks} kitten{hr.kittens_under_8_weeks !== 1 ? "s" : ""}
              {hr.pregnant_count > 0 ? `, ${hr.pregnant_count} suspected pregnant` : ""}
            </p>
            {hr.assigned_team_name && (
              <p className="text-base text-muted-foreground">Team: {hr.assigned_team_name}</p>
            )}
          </div>
        </div>
      </div>

      <CaseDetailTabs
        helpRequest={hr}
        cats={(cats ?? []) as Cat[]}
        appointments={(appointments ?? []) as Appointment[]}
        teams={teams ?? []}
        clinics={clinics ?? []}
        userRole={profile?.role ?? null}
        canReviewMedical={profile?.role === "admin" || profile?.role === "inquiry_team"}
      />
    </div>
  );
}
