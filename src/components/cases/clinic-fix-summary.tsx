import {
  clinicFixLoggedByForDisplay,
  clinicFixNotesForDisplay,
} from "@/lib/cases/tracked-cat-fix";
import {
  clinicResultAgeLabel,
  clinicResultGenderLabel,
} from "@/lib/appointments/clinic-result";
import { formatFosterFacilitySummary } from "@/lib/cases/foster-facility";
import { formatDate } from "@/lib/utils";
import type { ClinicFix } from "@/lib/types";

export function ClinicFixSummary({ fix }: { fix: ClinicFix }) {
  const loggedBy = clinicFixLoggedByForDisplay(fix);
  const notes = clinicFixNotesForDisplay(fix);
  const agePart =
    fix.age_category === "adult" || fix.age_category === "kitten"
      ? clinicResultAgeLabel(fix.age_category)
      : null;
  const genderPart =
    fix.gender === "male" || fix.gender === "female"
      ? clinicResultGenderLabel(fix.gender)
      : null;
  const identity = [agePart, genderPart].filter(Boolean).join(" · ") || "Cat";

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <p className="font-medium">
        {identity} fixed
        {fix.appointment_id ? " (appointment)" : ""}
      </p>
      <p className="text-muted-foreground">
        {fix.clinic_name ? `${fix.clinic_name} · ` : ""}
        {formatDate(fix.fix_date)}
        {loggedBy ? ` · ${loggedBy}` : ""}
      </p>
      <p className="text-muted-foreground">
        {formatFosterFacilitySummary(
          fix.went_to_foster_facility ?? false,
          fix.foster_facility,
          fix.foster_facility_other
        )}
      </p>
      {notes && <p className="mt-1 whitespace-pre-wrap">{notes}</p>}
    </div>
  );
}
