import { getAddonOptions } from "@/lib/clinics/service-catalog";
import type {
  ClinicEventPricingMode,
  ClinicEventPricingTier,
  ClinicServiceOption,
  PublicClinicEvent,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type EventPricingSource = Pick<
  PublicClinicEvent,
  "pricing_mode" | "pricing_matrix" | "base_price"
>;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizePricingMode(
  mode: ClinicEventPricingMode | string | null | undefined
): ClinicEventPricingMode {
  if (mode === "matrix" || mode === "sponsored" || mode === "flat") return mode;
  return "flat";
}

export function normalizePricingMatrix(
  matrix: ClinicEventPricingTier[] | null | undefined
): ClinicEventPricingTier[] {
  if (!Array.isArray(matrix)) return [];

  const byCats = new Map<number, number>();
  for (const entry of matrix) {
    const cats = Math.max(1, Math.floor(Number(entry?.cats) || 0));
    if (!Number.isFinite(cats) || cats < 1) continue;
    const total = Number(entry?.total_price);
    byCats.set(cats, Number.isFinite(total) && total >= 0 ? roundMoney(total) : 0);
  }

  return [...byCats.entries()]
    .map(([cats, total_price]) => ({ cats, total_price }))
    .sort((a, b) => a.cats - b.cats);
}

/** Package price for bringing `catCount` cats (before optional add-ons). */
export function resolvePackagePrice(event: EventPricingSource, catCount: number): number {
  const count = Math.max(0, Math.floor(catCount));
  if (count < 1) return 0;

  const mode = normalizePricingMode(event.pricing_mode);
  if (mode === "sponsored") return 0;

  if (mode === "flat") {
    return roundMoney((Number(event.base_price) || 0) * count);
  }

  const tiers = normalizePricingMatrix(event.pricing_matrix);
  if (tiers.length === 0) {
    return roundMoney((Number(event.base_price) || 0) * count);
  }

  const exact = tiers.find((tier) => tier.cats === count);
  if (exact) return exact.total_price;

  const covering = tiers.find((tier) => tier.cats >= count);
  if (covering) return covering.total_price;

  const last = tiers[tiers.length - 1];
  const perCat = last.cats > 0 ? last.total_price / last.cats : 0;
  return roundMoney(last.total_price + (count - last.cats) * perCat);
}

export function addonTotalForSelection(
  catalog: ClinicServiceOption[],
  selectedAddonNames: string[]
): number {
  const addons = getAddonOptions(catalog);
  let total = 0;
  for (const name of selectedAddonNames) {
    const addon = addons.find((item) => item.name === name);
    if (addon) total += addon.price;
  }
  return roundMoney(total);
}

/** Split package price across spots so row totals sum to the package. */
export function allocatePackageShares(packageTotal: number, spotCount: number): number[] {
  const n = Math.max(0, Math.floor(spotCount));
  if (n < 1) return [];
  if (n === 1) return [roundMoney(packageTotal)];

  const baseShare = Math.floor((packageTotal * 100) / n) / 100;
  const shares = Array.from({ length: n }, () => baseShare);
  const allocated = roundMoney(baseShare * n);
  const remainder = roundMoney(packageTotal - allocated);
  shares[0] = roundMoney(shares[0] + remainder);
  return shares;
}

export function calculateSpotTotals(
  event: EventPricingSource,
  catalog: ClinicServiceOption[],
  selectedAddonsPerSpot: string[][]
): number[] {
  const packagePrice = resolvePackagePrice(event, selectedAddonsPerSpot.length);
  const shares = allocatePackageShares(packagePrice, selectedAddonsPerSpot.length);
  return selectedAddonsPerSpot.map((selected, index) =>
    roundMoney(shares[index] + addonTotalForSelection(catalog, selected))
  );
}

export function calculateBookingGrandTotal(
  event: EventPricingSource,
  catalog: ClinicServiceOption[],
  selectedAddonsPerSpot: string[][]
): number {
  return roundMoney(
    calculateSpotTotals(event, catalog, selectedAddonsPerSpot).reduce((sum, value) => sum + value, 0)
  );
}

export function pricingSummaryLabel(event: EventPricingSource): string {
  const mode = normalizePricingMode(event.pricing_mode);
  if (mode === "sponsored") return "Sponsored — free";
  if (mode === "flat") {
    return `${formatCurrency(Number(event.base_price) || 0)} per cat`;
  }
  const tiers = normalizePricingMatrix(event.pricing_matrix);
  if (tiers.length === 0) return "Custom pricing";
  if (tiers.length === 1) {
    return `${tiers[0].cats} cat${tiers[0].cats === 1 ? "" : "s"}: ${formatCurrency(tiers[0].total_price)}`;
  }
  const first = tiers[0];
  const last = tiers[tiers.length - 1];
  return `${formatCurrency(first.total_price)}–${formatCurrency(last.total_price)} by cat count`;
}

export function defaultMatrixFromBasePrice(basePrice: number): ClinicEventPricingTier[] {
  const unit = Math.max(0, Number(basePrice) || 0);
  return [
    { cats: 1, total_price: roundMoney(unit) },
    { cats: 2, total_price: roundMoney(unit * 2) },
    { cats: 3, total_price: roundMoney(unit * 3) },
  ];
}
