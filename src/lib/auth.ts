import { createClient } from "@/lib/supabase/server";
import { isKnownUserRole } from "@/lib/constants";
import { getEffectiveProfile, getRolePreviewRole } from "@/lib/admin/role-preview";
import { canAccessRoute as profileCanAccessRoute } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

/** Profile with admin role preview applied (for UI and route access). */
export async function getAppProfile(): Promise<Profile | null> {
  return getEffectiveProfile(await getCurrentProfile());
}

export async function getSessionProfiles(): Promise<{
  actualProfile: Profile | null;
  effectiveProfile: Profile | null;
  previewRole: UserRole | null;
}> {
  const actualProfile = await getCurrentProfile();
  const previewRole =
    actualProfile?.role === "admin" ? await getRolePreviewRole() : null;
  const effectiveProfile = await getEffectiveProfile(actualProfile);
  return { actualProfile, effectiveProfile, previewRole };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getAppProfile();
  if (!isKnownUserRole(profile?.role) || !allowedRoles.includes(profile.role)) {
    return null;
  }
  return profile;
}

export function canAccessRoute(profile: Profile | null, pathname: string): boolean {
  return profileCanAccessRoute(profile, pathname);
}

export async function isApprovedVolunteer(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role !== null && profile?.role !== undefined;
}
