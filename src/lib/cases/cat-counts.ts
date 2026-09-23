import type { Cat, ClinicFix, HelpRequest } from "@/lib/types";

export interface CatCountSummary {
  reportedAdults: number;
  reportedKittens: number;
  /** Clinic-logged fixes only. */
  clinicFixedAdults: number;
  clinicFixedKittens: number;
  clinicFixedTotal: number;
  /**
   * All TNR / fixed counts for display (clinic fixes plus public or manual
   * outcome_tnvr beyond clinic logs).
   */
  fixedAdults: number;
  fixedKittens: number;
  fixedTotal: number;
  fosterAdults: number;
  fosterKittens: number;
  fosterTotal: number;
  outcomeAcc: number;
  outcomeOther: number;
  /** Cats not yet fixed / removed (still need trapping or TNR). */
  unfixedAdults: number;
  unfixedKittens: number;
  unfixedTotal: number;
}

type FosterFix = Pick<ClinicFix, "age_category" | "went_to_foster_facility" | "cat_id">;
type FosterCat = Pick<Cat, "id" | "age_category" | "went_to_foster_facility">;

type CountHelpRequest = Pick<
  HelpRequest,
  | "reported_cats_over_8_weeks"
  | "reported_kittens_under_8_weeks"
  | "cats_over_8_weeks"
  | "kittens_under_8_weeks"
  | "outcome_tnvr_count"
  | "outcome_acc_count"
  | "outcome_foster_count"
  | "outcome_other_count"
>;

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

function subtractFromBuckets(
  adults: number,
  kittens: number,
  amount: number
): { adults: number; kittens: number } {
  let nextAdults = adults;
  let nextKittens = kittens;
  let remaining = Math.max(0, amount);
  const fromAdults = Math.min(nextAdults, remaining);
  nextAdults -= fromAdults;
  remaining -= fromAdults;
  nextKittens = Math.max(0, nextKittens - remaining);
  return { adults: nextAdults, kittens: nextKittens };
}

export function summarizeCatCounts(
  hr: CountHelpRequest,
  fixes: FosterFix[] = [],
  cats: FosterCat[] = []
): CatCountSummary {
  const clinicFixedAdults = fixes.filter((fix) => fix.age_category === "adult").length;
  const clinicFixedKittens = fixes.filter((fix) => fix.age_category === "kitten").length;
  const clinicFixedTotal = clinicFixedAdults + clinicFixedKittens;

  const reportedAdultsCount =
    hr.reported_cats_over_8_weeks ?? (hr.cats_over_8_weeks ?? 0) + clinicFixedAdults;
  const reportedKittensCount =
    hr.reported_kittens_under_8_weeks ?? (hr.kittens_under_8_weeks ?? 0) + clinicFixedKittens;

  const fosterFromFixes = fosterCountsFromFixes(fixes);
  const fosterFromCats = fosterCountsFromTrackedCats(cats, fosterFromFixes.fixCatIds);
  const fosterAdults = fosterFromFixes.fosterAdults + fosterFromCats.fosterAdults;
  const fosterKittens = fosterFromFixes.fosterKittens + fosterFromCats.fosterKittens;
  const fosterTotal = fosterAdults + fosterKittens;

  const outcomeTnvr = Math.max(0, hr.outcome_tnvr_count ?? 0);
  const outcomeAcc = Math.max(0, hr.outcome_acc_count ?? 0);
  const outcomeFoster = Math.max(0, hr.outcome_foster_count ?? 0);
  const outcomeOther = Math.max(0, hr.outcome_other_count ?? 0);

  // Public/manual TNR beyond what clinic_fixes already represent.
  const publicTnvrExtra = Math.max(0, outcomeTnvr - clinicFixedTotal);
  // Foster already counted from clinic/tracked cats should not double-subtract.
  const extraFoster = Math.max(0, outcomeFoster - fosterTotal);
  const nonClinicRemovals = publicTnvrExtra + outcomeAcc + extraFoster + outcomeOther;

  const clinicUnfixedAdults = Math.max(0, reportedAdultsCount - clinicFixedAdults);
  const clinicUnfixedKittens = Math.max(0, reportedKittensCount - clinicFixedKittens);

  const reduced = subtractFromBuckets(
    clinicUnfixedAdults,
    clinicUnfixedKittens,
    nonClinicRemovals
  );
  const unfixedAdults = reduced.adults;
  const unfixedKittens = reduced.kittens;

  // Attribute public TNR extras to adult/kitten for the Fixed row.
  const adultsRemovedOutsideClinic = Math.max(0, clinicUnfixedAdults - unfixedAdults);
  const kittensRemovedOutsideClinic = Math.max(0, clinicUnfixedKittens - unfixedKittens);
  const publicTnvrAdults = Math.min(publicTnvrExtra, adultsRemovedOutsideClinic);
  const publicTnvrKittens = Math.min(
    Math.max(0, publicTnvrExtra - publicTnvrAdults),
    kittensRemovedOutsideClinic
  );

  const fixedAdults = clinicFixedAdults + publicTnvrAdults;
  const fixedKittens = clinicFixedKittens + publicTnvrKittens;
  const fixedTotal = Math.max(clinicFixedTotal + publicTnvrExtra, outcomeTnvr);

  return {
    reportedAdults: reportedAdultsCount,
    reportedKittens: reportedKittensCount,
    clinicFixedAdults,
    clinicFixedKittens,
    clinicFixedTotal,
    fixedAdults,
    fixedKittens,
    fixedTotal,
    fosterAdults,
    fosterKittens,
    fosterTotal: Math.max(fosterTotal, outcomeFoster),
    outcomeAcc,
    outcomeOther,
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
