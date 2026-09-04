import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { banVolunteerAuthUser, unbanVolunteerAuthUser } from "@/lib/volunteers/approve-auth";
import type { VolunteerApplicationStatus } from "@/lib/types";

const ALLOWED_STATUSES = new Set<VolunteerApplicationStatus>([
  "pending",
  "needs_followup",
  "approved",
  "rejected",
  "inactive",
]);

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, status, adminNotes } = body as {
    applicationId?: string;
    status?: VolunteerApplicationStatus;
    adminNotes?: string;
  };

  if (!applicationId || !status) {
    return NextResponse.json({ error: "Missing applicationId or status" }, { status: 400 });
  }

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("volunteer_applications")
    .select("id, email, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: loadError?.message ?? "Application not found" },
      { status: loadError ? 400 : 404 }
    );
  }

  if (status === "inactive") {
    const banResult = await banVolunteerAuthUser(service, existing.email);
    if (banResult && "error" in banResult) {
      return NextResponse.json({ error: banResult.error }, { status: 400 });
    }
  }

  // Re-enable login when leaving inactive/rejected for an active application path.
  if (
    (existing.status === "inactive" || existing.status === "rejected") &&
    (status === "approved" || status === "pending" || status === "needs_followup")
  ) {
    const unbanResult = await unbanVolunteerAuthUser(service, existing.email);
    if (unbanResult && "error" in unbanResult) {
      return NextResponse.json({ error: unbanResult.error }, { status: 400 });
    }
  }

  const updates: Record<string, string | null> = {
    status,
    reviewed_by: profile.email,
    reviewed_at: new Date().toISOString(),
  };
  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes?.trim() || null;
  }

  const { error } = await service
    .from("volunteer_applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
