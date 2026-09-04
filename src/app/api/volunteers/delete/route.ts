import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  applyVolunteerAssignmentDecisions,
  defaultAssignmentDecisions,
  previewVolunteerAssignments,
  removeVolunteerUser,
  scrubVolunteerFromApp,
} from "@/lib/admin/volunteer-assignments";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId } = body as { applicationId?: string };

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application, error: loadError } = await service
    .from("volunteer_applications")
    .select("id, email, full_name")
    .eq("id", applicationId)
    .maybeSingle();

  if (loadError || !application) {
    return NextResponse.json(
      { error: loadError?.message ?? "Application not found" },
      { status: loadError ? 400 : 404 }
    );
  }

  const email = application.email.trim();
  const { data: linkedProfile } = await service
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (linkedProfile) {
    if (linkedProfile.id === profile!.id) {
      return NextResponse.json(
        { error: "You cannot remove your own account from Volunteers." },
        { status: 400 }
      );
    }

    const target = linkedProfile as Profile;
    const preview = await previewVolunteerAssignments(service, target);
    const decisions = defaultAssignmentDecisions(preview);

    if (preview.groups.some((group) => group.key === "trap_team_lead")) {
      return NextResponse.json(
        {
          error:
            "This volunteer is a trap team lead. Remove them from Admin → Users and reassign the team lead first.",
        },
        { status: 400 }
      );
    }

    if (preview.hasAssignments) {
      const applyError = await applyVolunteerAssignmentDecisions(service, preview, decisions);
      if (applyError) {
        return NextResponse.json({ error: applyError }, { status: 400 });
      }
    }

    const scrubError = await scrubVolunteerFromApp(service, target);
    if (scrubError) {
      return NextResponse.json({ error: scrubError }, { status: 400 });
    }

    const removeError = await removeVolunteerUser(service, target.id);
    if (removeError) {
      return NextResponse.json({ error: removeError }, { status: 400 });
    }

    return NextResponse.json({ success: true, removedProfile: true });
  }

  await service.from("volunteer_role_requests").delete().ilike("email", email);
  const { error } = await service.from("volunteer_applications").delete().eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, removedProfile: false });
}
