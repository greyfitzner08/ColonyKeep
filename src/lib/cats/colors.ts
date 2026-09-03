/** Common community-cat colors and markings for booking / intake forms. */
export const CAT_COLOR_MARKINGS = [
  "Black",
  "White",
  "Orange tabby",
  "Brown tabby",
  "Gray tabby",
  "Black and white",
  "Orange and white",
  "Gray and white",
  "Calico",
  "Tortoiseshell",
  "Dilute calico",
  "Dilute tortoiseshell",
  "Cream / buff",
  "Solid gray (blue)",
  "Pointed / Siamese-type",
  "Unknown",
  "Other",
] as const;

export type CatColorMarking = (typeof CAT_COLOR_MARKINGS)[number];

export const CAT_COLOR_OTHER = "Other" as const;

const KNOWN_WITHOUT_OTHER: readonly string[] = CAT_COLOR_MARKINGS.filter(
  (value) => value !== CAT_COLOR_OTHER
);

export function isKnownCatColorMarking(value: string): boolean {
  return KNOWN_WITHOUT_OTHER.includes(value);
}

/** Select value for a stored colors string (maps free-text to Other). */
export function catColorSelectValue(stored: string): string | undefined {
  if (!stored.trim()) return undefined;
  if (isKnownCatColorMarking(stored) || stored === CAT_COLOR_OTHER) return stored;
  return CAT_COLOR_OTHER;
}

/** Free-text shown when Other is selected. */
export function catColorOtherText(stored: string): string {
  if (!stored.trim() || stored === CAT_COLOR_OTHER || isKnownCatColorMarking(stored)) {
    return "";
  }
  return stored;
}
