import { NextResponse } from "next/server";
import { isKnownUserRole } from "@/lib/constants";
import {
  canClaimShifts,
  canManageAppointments,
  canManageClinics,
  canManageTrapEquipment,
  isCaseWorker,
} from "@/lib/permissions";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

async function loadProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return data as Profile;
  }

  const service = await createServiceClient();
  const { data: serviceProfile } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return (serviceProfile as Profile | null) ?? null;
}

export async function getAuthenticatedProfile() {
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

  const profile = await loadProfile(user.id);
  const role = profile?.role?.trim();

  if (!isKnownUserRole(role)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile: { ...profile!, role } as Profile, response: null };
}

export async function requireApiRole(allowedRoles: UserRole[]) {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return { profile, response };

  const role = profile!.role as UserRole;
  if (!allowedRoles.includes(role)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function requireCaseWorker() {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return { profile, response };

  if (!isCaseWorker(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function requireAppointmentManager() {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return { profile, response };

  if (!canManageAppointments(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function requireClinicManager() {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return { profile, response };

  if (!canManageClinics(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function requireShiftAccess() {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return { profile, response };

  if (!canClaimShifts(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}

export async function requireTrapEquipmentAccess() {
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

  const profile = await loadProfile(user.id);
  if (!profile || !canManageTrapEquipment(profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { profile, response: null };
}
