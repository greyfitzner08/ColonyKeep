import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isKnownUserRole } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userIds, role } = body as { userIds?: string[]; role?: UserRole };

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "Select at least one user" }, { status: 400 });
  }

  if (!role || !isKnownUserRole(role)) {
    return NextResponse.json({ error: "A valid platform role is required" }, { status: 400 });
  }

  const uniqueIds = [...new Set(userIds.filter((id) => typeof id === "string" && id.length > 0))];
  const targetIds = uniqueIds.filter((id) => id !== profile.id);

  if (targetIds.length === 0) {
    return NextResponse.json({ error: "No eligible users to update" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existingProfiles, error: loadError } = await service
    .from("profiles")
    .select("id")
    .in("id", targetIds);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }

  const foundIds = new Set((existingProfiles ?? []).map((entry) => entry.id));
  const missingIds = targetIds.filter((id) => !foundIds.has(id));

  const { error: updateError } = await service
    .from("profiles")
    .update({ role })
    .in("id", [...foundIds]);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    updated: foundIds.size,
    skippedSelf: uniqueIds.length - targetIds.length,
    notFound: missingIds,
  });
}
