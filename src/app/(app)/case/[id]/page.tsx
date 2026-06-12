import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
      supabase.from("trap_teams").select("id, name").eq("is_active", true),
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

      <CaseDetailTabs
        helpRequest={hr}
        cats={(cats ?? []) as Cat[]}
        appointments={(appointments ?? []) as Appointment[]}
        teams={teams ?? []}
        clinics={clinics ?? []}
      />
    </div>
  );
}
