import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";

export type TrapQueueFlagFilter = "all" | "medical" | "trapSchool" | "clinicDate";

export function resolveTrapQueueFlagFilter(params: {
  flag?: string | null;
  trapSchool?: string | null;
  needsClinicDate?: string | null;
}): TrapQueueFlagFilter {
  const flag = params.flag?.trim().toLowerCase() ?? "";
  if (flag === "medical" || flag === "trapschool" || flag === "clinicdate") {
    if (flag === "trapschool") return "trapSchool";
    if (flag === "clinicdate") return "clinicDate";
    return "medical";
  }

  // Legacy single-purpose query params.
  if (params.trapSchool === "only") return "trapSchool";
  if (params.needsClinicDate === "only") return "clinicDate";
  return "all";
}

export function caseMatchesTrapQueueFlag(
  helpRequest: HelpRequest,
  flag: TrapQueueFlagFilter
): boolean {
  if (flag === "all") return true;
  if (flag === "trapSchool") return Boolean(helpRequest.trap_school_eligible);
  if (flag === "clinicDate") return Boolean(helpRequest.needs_clinic_date);
  return hasActiveMedicalFlag(
    helpRequest.medical_flags ?? [],
    helpRequest.medical_flag_dismissed,
    helpRequest.medical_flag_forced
  );
}

export function filterCasesByTrapQueueFlag(
  cases: HelpRequest[],
  flag: TrapQueueFlagFilter
): HelpRequest[] {
  if (flag === "all") return cases;
  return cases.filter((helpRequest) => caseMatchesTrapQueueFlag(helpRequest, flag));
}
