import type { AdoptionApplicationAnswers } from "@/lib/adoption/application";

export type AdoptionApplicationRank = "good" | "caution" | "poor";

export interface AdoptionApplicationBadFlag {
  id: string;
  label: string;
}

export interface AdoptionApplicationRankResult {
  rank: AdoptionApplicationRank;
  badCount: number;
  flags: AdoptionApplicationBadFlag[];
}

const RANK_ORDER: Record<AdoptionApplicationRank, number> = {
  good: 0,
  caution: 1,
  poor: 2,
};

export const ADOPTION_APPLICATION_RANKS: {
  value: AdoptionApplicationRank;
  label: string;
  shortLabel: string;
}[] = [
  { value: "good", label: "No flags", shortLabel: "Clear screening" },
  { value: "caution", label: "Some flags", shortLabel: "Follow up" },
  { value: "poor", label: "Many flags", shortLabel: "More follow-up" },
];

export function adoptionApplicationRankLabel(rank: AdoptionApplicationRank): string {
  return ADOPTION_APPLICATION_RANKS.find((entry) => entry.value === rank)?.label ?? rank;
}

export function adoptionApplicationRankShortLabel(rank: AdoptionApplicationRank): string {
  return ADOPTION_APPLICATION_RANKS.find((entry) => entry.value === rank)?.shortLabel ?? rank;
}

export function collectAdoptionApplicationBadFlags(
  answers: AdoptionApplicationAnswers | null | undefined
): AdoptionApplicationBadFlag[] {
  if (!answers) return [];

  const flags: AdoptionApplicationBadFlag[] = [];

  if (answers.lifelong_commitment === "no") {
    flags.push({
      id: "lifelong_commitment",
      label: "Not aware adopting is a lifelong commitment",
    });
  }

  if (answers.rents === "yes" && answers.rent_cats_approved === "no") {
    flags.push({
      id: "rent_cats_approved",
      label: "Not approved to have cats while renting",
    });
  }

  if (answers.allergic_to_cats === "yes") {
    flags.push({
      id: "allergic_to_cats",
      label: "Someone in the home is allergic to cats",
    });
  }

  if (answers.living_plan && answers.living_plan !== "indoors_only") {
    flags.push({
      id: "living_plan",
      label: "Cat would not be kept indoors only",
    });
  }

  if (answers.plan_to_declaw === "yes") {
    flags.push({
      id: "plan_to_declaw",
      label: "Plans to declaw",
    });
  }

  const rehome = answers.rehome_circumstances ?? [];
  const onlyNoneAnticipated =
    rehome.length === 1 && rehome[0] === "none_anticipated";
  if (rehome.length > 0 && !onlyNoneAnticipated) {
    flags.push({
      id: "rehome_circumstances",
      label: "Listed circumstances that could lead to rehoming",
    });
  }

  if (answers.can_pay_vet_costs === "no" || answers.can_pay_vet_costs === "unsure") {
    flags.push({
      id: "can_pay_vet_costs",
      label: "Not willing/able (or unsure) to pay vet costs",
    });
  }

  if (answers.cat_is_family === "no") {
    flags.push({
      id: "cat_is_family",
      label: "Does not consider a cat part of the family",
    });
  }

  return flags;
}

/**
 * Ranking by flagged screening answers only — not a final adoption decision:
 * - 0–1 flags → no flags
 * - 2–3 flags → some flags
 * - 4+ flags → many flags
 */
export function rankAdoptionApplication(
  answers: AdoptionApplicationAnswers | null | undefined
): AdoptionApplicationRankResult {
  const flags = collectAdoptionApplicationBadFlags(answers);
  const badCount = flags.length;

  let rank: AdoptionApplicationRank = "good";
  if (badCount > 3) rank = "poor";
  else if (badCount > 1) rank = "caution";

  return { rank, badCount, flags };
}

export function adoptionApplicationRankSortValue(rank: AdoptionApplicationRank): number {
  return RANK_ORDER[rank];
}
