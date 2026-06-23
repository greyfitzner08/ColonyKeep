import { NextResponse } from "next/server";
import { isKnownUserRole } from "@/lib/constants";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function requireApiRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let profile: Profile | null = null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    profile = data as Profile;
  } else {
    const service = await createServiceClient();
    const { data: serviceProfile } = await service
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = (serviceProfile as Profile | null) ?? null;
  }

  const role = profile?.role?.trim();

  if (!isKnownUserRole(role) || !allowedRoles.includes(role)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile: { ...profile, role } as Profile, response: null };
}
