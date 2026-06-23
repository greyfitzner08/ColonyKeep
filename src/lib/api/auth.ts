import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { isKnownUserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
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

  const profile = await getCurrentProfile();

  if (!isKnownUserRole(profile?.role) || !allowedRoles.includes(profile.role)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile: profile as Profile, response: null };
}
