/** Base hold time for clinic booking forms. Extra minute per cat after 4. */
export const CLINIC_HOLD_BASE_MINUTES = 10;
export const CLINIC_HOLD_EXTRA_AFTER_CATS = 4;
export const CLINIC_HOLD_EXTENSION_MINUTES = 5;
export const CLINIC_HOLD_MAX_EXTENSIONS = 3;

export const HOLD_EXTENSION_NOTES_PREFIX = "HOLD_EXT:";

export function clinicHoldMinutes(spotCount: number): number {
  const cats = Number.isFinite(spotCount) ? Math.max(1, Math.floor(spotCount)) : 1;
  return CLINIC_HOLD_BASE_MINUTES + Math.max(0, cats - CLINIC_HOLD_EXTRA_AFTER_CATS);
}

export function clinicHoldDurationMs(spotCount: number): number {
  return clinicHoldMinutes(spotCount) * 60 * 1000;
}

export function clinicHoldExtensionMs(): number {
  return CLINIC_HOLD_EXTENSION_MINUTES * 60 * 1000;
}

export function parseHoldExtensions(notes: string | null | undefined): number {
  if (!notes?.startsWith(HOLD_EXTENSION_NOTES_PREFIX)) return 0;
  const parsed = Number.parseInt(notes.slice(HOLD_EXTENSION_NOTES_PREFIX.length), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function holdExtensionNotes(count: number): string {
  return `${HOLD_EXTENSION_NOTES_PREFIX}${count}`;
}
