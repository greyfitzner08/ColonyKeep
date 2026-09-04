import { cookies } from "next/headers";
import type { Profile } from "@/lib/types";
import {
  ROLE_PREVIEW_COOKIE,
  applyRolePreview,
  parseRolePreviewCookie,
} from "@/lib/admin/role-preview.shared";

export {
  PREVIEWABLE_PLATFORM_ROLES,
  ROLE_PREVIEW_COOKIE,
  applyRolePreview,
  isValidRolePreviewKey,
  parseRolePreviewCookie,
  rolePreviewLabel,
} from "@/lib/admin/role-preview.shared";

export async function getRolePreviewKey(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ROLE_PREVIEW_COOKIE)?.value;
  const parsed = parseRolePreviewCookie(value);
  if (!parsed) return null;
  // Legacy interest cookies map to volunteer platform access.
  if (value?.startsWith("v:")) return "volunteer";
  return value ?? null;
}

export async function getEffectiveProfile(profile: Profile | null): Promise<Profile | null> {
  if (!profile) return null;
  return applyRolePreview(profile, await getRolePreviewKey());
}
