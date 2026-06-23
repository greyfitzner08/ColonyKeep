import { createClient } from "@/lib/supabase/server";
import { getRolePermissions, isKnownUserRole } from "@/lib/constants";
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

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!isKnownUserRole(profile?.role) || !allowedRoles.includes(profile.role)) {
    return null;
  }
  return profile;
}

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  const permissions = getRolePermissions(role);
  if (!permissions) return false;
  return permissions.routes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function isApprovedVolunteer(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role !== null && profile?.role !== undefined;
}
