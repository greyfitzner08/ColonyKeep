import type { ClinicFix, HelpRequest } from "@/lib/types";

export interface CatCountSummary {
  reportedAdults: number;
  reportedKittens: number;
  fixedAdults: number;
  fixedKittens: number;
  fixedTotal: number;
  remainingAdults: number;
  remainingKittens: number;
  remainingTotal: number;
}

export function reportedAdults(hr: HelpRequest): number {
  return hr.reported_cats_over_8_weeks ?? hr.cats_over_8_weeks ?? 0;
}

export function reportedKittens(hr: HelpRequest): number {
  return hr.reported_kittens_under_8_weeks ?? hr.kittens_under_8_weeks ?? 0;
}

export function summarizeCatCounts(
  hr: Pick<
    HelpRequest,
    | "reported_cats_over_8_weeks"
    | "reported_kittens_under_8_weeks"
    | "cats_over_8_weeks"
    | "kittens_under_8_weeks"
  >,
  fixes: Pick<ClinicFix, "age_category">[] = []
): CatCountSummary {
  const fixedAdults = fixes.filter((fix) => fix.age_category === "adult").length;
  const fixedKittens = fixes.filter((fix) => fix.age_category === "kitten").length;
  const reportedAdultsCount =
    hr.reported_cats_over_8_weeks ?? (hr.cats_over_8_weeks ?? 0) + fixedAdults;
  const reportedKittensCount =
    hr.reported_kittens_under_8_weeks ?? (hr.kittens_under_8_weeks ?? 0) + fixedKittens;
  const remainingAdults = Math.max(0, reportedAdultsCount - fixedAdults);
  const remainingKittens = Math.max(0, reportedKittensCount - fixedKittens);

  return {
    reportedAdults: reportedAdultsCount,
    reportedKittens: reportedKittensCount,
    fixedAdults,
    fixedKittens,
    fixedTotal: fixedAdults + fixedKittens,
    remainingAdults,
    remainingKittens,
    remainingTotal: remainingAdults + remainingKittens,
  };
}

export function initialReportedCounts(input: {
  cats_over_8_weeks?: number | null;
  kittens_under_8_weeks?: number | null;
}) {
  const adults = input.cats_over_8_weeks ?? 0;
  const kittens = input.kittens_under_8_weeks ?? 0;
  return {
    reported_cats_over_8_weeks: adults,
    reported_kittens_under_8_weeks: kittens,
    cats_over_8_weeks: adults,
    kittens_under_8_weeks: kittens,
  };
}
