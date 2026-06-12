import { MEDICAL_KEYWORDS } from "@/lib/constants";
import type { MedicalFlag } from "@/lib/types";

export function detectMedicalKeywords(text: string): MedicalFlag[] {
  const lower = text.toLowerCase();
  const flags: MedicalFlag[] = [];
  const now = new Date().toISOString();

  for (const keyword of MEDICAL_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      flags.push({
        keyword,
        detected_at: now,
        source: "auto",
      });
    }
  }

  return flags;
}

export function hasActiveMedicalFlag(
  flags: MedicalFlag[],
  dismissed: boolean,
  forced: boolean
): boolean {
  if (forced) return true;
  if (dismissed) return false;
  return flags.length > 0;
}

export function mergeMedicalFlags(
  existing: MedicalFlag[],
  newFlags: MedicalFlag[]
): MedicalFlag[] {
  const existingKeywords = new Set(existing.map((f) => f.keyword));
  const merged = [...existing];
  for (const flag of newFlags) {
    if (!existingKeywords.has(flag.keyword)) {
      merged.push(flag);
    }
  }
  return merged;
}
