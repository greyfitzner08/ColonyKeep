import {
  clinicResultAgeLabel,
  clinicResultGenderLabel,
} from "@/lib/appointments/clinic-result";
import { formatFosterFacilitySummary } from "@/lib/cases/foster-facility";
import { formatDate } from "@/lib/utils";
import type { ClinicFix } from "@/lib/types";

export function ClinicFixSummary({ fix }: { fix: ClinicFix }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <p className="font-medium">
        {clinicResultAgeLabel(fix.age_category)} · {clinicResultGenderLabel(fix.gender)} fixed
        {fix.appointment_id ? " (appointment)" : ""}
      </p>
      <p className="text-muted-foreground">
        {fix.clinic_name ? `${fix.clinic_name} · ` : ""}
        {formatDate(fix.fix_date)}
        {fix.logged_by_name ? ` · ${fix.logged_by_name}` : ""}
      </p>
      <p className="text-muted-foreground">
        {formatFosterFacilitySummary(
          fix.went_to_foster_facility ?? false,
          fix.foster_facility,
          fix.foster_facility_other
        )}
      </p>
      {fix.notes && <p className="mt-1 whitespace-pre-wrap">{fix.notes}</p>}
    </div>
  );
}
