import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";

export function sortCasesMedicalFirst(cases: HelpRequest[]): HelpRequest[] {
  return [...cases].sort((a, b) => {
    const aMedical = hasActiveMedicalFlag(
      a.medical_flags ?? [],
      a.medical_flag_dismissed,
      a.medical_flag_forced
    );
    const bMedical = hasActiveMedicalFlag(
      b.medical_flags ?? [],
      b.medical_flag_dismissed,
      b.medical_flag_forced
    );

    if (aMedical && !bMedical) return -1;
    if (!aMedical && bMedical) return 1;

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
