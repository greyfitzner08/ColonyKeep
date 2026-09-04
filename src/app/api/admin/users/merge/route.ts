import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { mergeVolunteerProfiles } from "@/lib/admin/merge-profiles";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const keepProfileId =
    typeof body.keepProfileId === "string" ? body.keepProfileId.trim() : "";
  const mergeProfileId =
    typeof body.mergeProfileId === "string" ? body.mergeProfileId.trim() : "";

  if (!keepProfileId || !mergeProfileId) {
    return NextResponse.json(
      { error: "Choose which account to keep and which to merge." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { result, error } = await mergeVolunteerProfiles(service, {
    keepProfileId,
    mergeProfileId,
    actorUserId: profile!.id,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, result });
}
