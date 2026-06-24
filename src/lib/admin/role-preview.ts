import { cookies } from "next/headers";
import type { Profile, UserRole } from "@/lib/types";
import {
  ROLE_PREVIEW_COOKIE,
  applyRolePreview,
  parsePreviewRole,
} from "@/lib/admin/role-preview.shared";

export {
  PREVIEWABLE_PLATFORM_ROLES,
  ROLE_PREVIEW_COOKIE,
  applyRolePreview,
  parsePreviewRole,
} from "@/lib/admin/role-preview.shared";

export async function getRolePreviewRole(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  return parsePreviewRole(cookieStore.get(ROLE_PREVIEW_COOKIE)?.value);
}

export async function getEffectiveProfile(profile: Profile | null): Promise<Profile | null> {
  if (!profile) return null;
  return applyRolePreview(profile, await getRolePreviewRole());
}
