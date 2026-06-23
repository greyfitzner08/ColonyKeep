import { hasActiveMedicalFlag } from "@/lib/medical-flags";
import type { HelpRequest } from "@/lib/types";

export type IntakeSortKey =
  | "date_desc"
  | "date_asc"
  | "case_number_asc"
  | "case_number_desc"
  | "worker_asc"
  | "worker_desc"
  | "medical_first";

export const INTAKE_SORT_OPTIONS: { value: IntakeSortKey; label: string }[] = [
  { value: "date_desc", label: "Date (newest)" },
  { value: "date_asc", label: "Date (oldest)" },
  { value: "case_number_asc", label: "Case # (A–Z)" },
  { value: "case_number_desc", label: "Case # (Z–A)" },
  { value: "worker_asc", label: "Working (A–Z)" },
  { value: "worker_desc", label: "Working (Z–A)" },
  { value: "medical_first", label: "Medical first" },
];

function caseNumberSortValue(caseNumber: string): number {
  const match = caseNumber.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function workerSortValue(helpRequest: HelpRequest): string {
  return (
    helpRequest.claimed_by_name ??
    helpRequest.claimed_by_email ??
    helpRequest.assigned_to ??
    ""
  )
    .trim()
    .toLowerCase();
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function sortIntakeCases(cases: HelpRequest[], sortKey: IntakeSortKey): HelpRequest[] {
  const sorted = [...cases];

  sorted.sort((a, b) => {
    switch (sortKey) {
      case "date_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "date_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "case_number_asc":
        return (
          caseNumberSortValue(a.case_number) - caseNumberSortValue(b.case_number) ||
          compareText(a.case_number, b.case_number)
        );
      case "case_number_desc":
        return (
          caseNumberSortValue(b.case_number) - caseNumberSortValue(a.case_number) ||
          compareText(b.case_number, a.case_number)
        );
      case "worker_asc": {
        const aWorker = workerSortValue(a);
        const bWorker = workerSortValue(b);
        if (!aWorker && bWorker) return 1;
        if (aWorker && !bWorker) return -1;
        return compareText(aWorker, bWorker);
      }
      case "worker_desc": {
        const aWorker = workerSortValue(a);
        const bWorker = workerSortValue(b);
        if (!aWorker && bWorker) return 1;
        if (aWorker && !bWorker) return -1;
        return compareText(bWorker, aWorker);
      }
      case "medical_first": {
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      default:
        return 0;
    }
  });

  return sorted;
}
