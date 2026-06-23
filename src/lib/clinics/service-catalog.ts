import type { ClinicServiceOption } from "@/lib/types";

export const DEFAULT_INCLUDED_SERVICE_NAMES = [
  "Spay/Neuter Surgery",
  "Pain Med Injection",
  "Ear Tip",
  "Flea/Tick Med",
  "Deworm",
] as const;

export function defaultIncludedCatalog(): ClinicServiceOption[] {
  return DEFAULT_INCLUDED_SERVICE_NAMES.map((name) => ({
    name,
    price: 0,
    included_in_base: true,
  }));
}

export function normalizeServiceCatalog(
  catalog: ClinicServiceOption[] | null | undefined,
  legacyIncluded?: string[] | null,
  legacyAddons?: { name: string; price: number }[] | null
): ClinicServiceOption[] {
  if (catalog && catalog.length > 0) {
    return catalog;
  }

  const merged: ClinicServiceOption[] = [];
  for (const name of legacyIncluded ?? []) {
    if (name.trim()) {
      merged.push({ name: name.trim(), price: 0, included_in_base: true });
    }
  }
  for (const addon of legacyAddons ?? []) {
    if (addon.name.trim()) {
      merged.push({
        name: addon.name.trim(),
        price: addon.price ?? 0,
        included_in_base: false,
      });
    }
  }

  return merged.length > 0 ? merged : defaultIncludedCatalog();
}

export function getIncludedOptions(catalog: ClinicServiceOption[]): ClinicServiceOption[] {
  return catalog.filter((item) => item.included_in_base);
}

export function getAddonOptions(catalog: ClinicServiceOption[]): ClinicServiceOption[] {
  return catalog.filter((item) => !item.included_in_base);
}

export function catalogToLegacyFields(catalog: ClinicServiceOption[]) {
  return {
    included_services: getIncludedOptions(catalog).map((item) => item.name),
    addon_services: getAddonOptions(catalog).map((item) => ({
      name: item.name,
      price: item.price,
    })),
  };
}

export function calculateBookingTotal(
  basePrice: number,
  catalog: ClinicServiceOption[],
  selectedAddonNames: string[]
): number {
  const addons = getAddonOptions(catalog);
  let total = basePrice;
  for (const name of selectedAddonNames) {
    const addon = addons.find((item) => item.name === name);
    if (addon) total += addon.price;
  }
  return total;
}

export function buildInitialAddonPayments(
  selectedAddonNames: string[]
): Record<string, boolean> {
  return Object.fromEntries(selectedAddonNames.map((name) => [name, false]));
}
