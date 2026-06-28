import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";

export interface CatCountSummary {
  reportedAdults: number;
  reportedKittens: number;
  fixedAdults: number;
  fixedKittens: number;
  fixedTotal: number;
  fosterAdults: number;
  fosterKittens: number;
  fosterTotal: number;
  /** Cats not yet fixed at clinic (reported minus fixed). */
  unfixedAdults: number;
  unfixedKittens: number;
  unfixedTotal: number;
}

type FosterFix = Pick<ClinicFix, "age_category" | "went_to_foster_facility" | "cat_id">;
type FosterCat = Pick<Cat, "id" | "age_category" | "went_to_foster_facility">;

export function reportedAdults(hr: HelpRequest): number {
  return hr.reported_cats_over_8_weeks ?? hr.cats_over_8_weeks ?? 0;
}

export function reportedKittens(hr: HelpRequest): number {
  return hr.reported_kittens_under_8_weeks ?? hr.kittens_under_8_weeks ?? 0;
}

function fosterCountsFromFixes(fixes: FosterFix[]) {
  const fosterFixes = fixes.filter((fix) => fix.went_to_foster_facility);
  return {
    fosterAdults: fosterFixes.filter((fix) => fix.age_category === "adult").length,
    fosterKittens: fosterFixes.filter((fix) => fix.age_category === "kitten").length,
    fixCatIds: new Set(
      fosterFixes.map((fix) => fix.cat_id).filter((id): id is string => Boolean(id))
    ),
  };
}

function fosterCountsFromTrackedCats(cats: FosterCat[], linkedCatIds: Set<string>) {
  const fosterCats = cats.filter(
    (cat) => cat.went_to_foster_facility === true && !linkedCatIds.has(cat.id)
  );

  return {
    fosterAdults: fosterCats.filter((cat) => (cat.age_category ?? "adult") === "adult").length,
    fosterKittens: fosterCats.filter((cat) => cat.age_category === "kitten").length,
  };
}

export function summarizeCatCounts(
  hr: Pick<
    HelpRequest,
    | "reported_cats_over_8_weeks"
    | "reported_kittens_under_8_weeks"
    | "cats_over_8_weeks"
    | "kittens_under_8_weeks"
  >,
  fixes: FosterFix[] = [],
  cats: FosterCat[] = []
): CatCountSummary {
  const fixedAdults = fixes.filter((fix) => fix.age_category === "adult").length;
  const fixedKittens = fixes.filter((fix) => fix.age_category === "kitten").length;
  const reportedAdultsCount =
    hr.reported_cats_over_8_weeks ?? (hr.cats_over_8_weeks ?? 0) + fixedAdults;
  const reportedKittensCount =
    hr.reported_kittens_under_8_weeks ?? (hr.kittens_under_8_weeks ?? 0) + fixedKittens;

  const fosterFromFixes = fosterCountsFromFixes(fixes);
  const fosterFromCats = fosterCountsFromTrackedCats(cats, fosterFromFixes.fixCatIds);
  const fosterAdults = fosterFromFixes.fosterAdults + fosterFromCats.fosterAdults;
  const fosterKittens = fosterFromFixes.fosterKittens + fosterFromCats.fosterKittens;

  const unfixedAdults = Math.max(0, reportedAdultsCount - fixedAdults);
  const unfixedKittens = Math.max(0, reportedKittensCount - fixedKittens);

  return {
    reportedAdults: reportedAdultsCount,
    reportedKittens: reportedKittensCount,
    fixedAdults,
    fixedKittens,
    fixedTotal: fixedAdults + fixedKittens,
    fosterAdults,
    fosterKittens,
    fosterTotal: fosterAdults + fosterKittens,
    unfixedAdults,
    unfixedKittens,
    unfixedTotal: unfixedAdults + unfixedKittens,
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
