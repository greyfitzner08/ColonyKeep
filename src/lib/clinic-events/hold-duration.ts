/** Base hold time for clinic booking forms. Extra minute per cat after 4. */
export const CLINIC_HOLD_BASE_MINUTES = 10;
export const CLINIC_HOLD_EXTRA_AFTER_CATS = 4;

export function clinicHoldMinutes(spotCount: number): number {
  const cats = Number.isFinite(spotCount) ? Math.max(1, Math.floor(spotCount)) : 1;
  return CLINIC_HOLD_BASE_MINUTES + Math.max(0, cats - CLINIC_HOLD_EXTRA_AFTER_CATS);
}

export function clinicHoldDurationMs(spotCount: number): number {
  return clinicHoldMinutes(spotCount) * 60 * 1000;
}
