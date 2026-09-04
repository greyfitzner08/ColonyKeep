import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  applyVolunteerAssignmentDecisions,
  previewVolunteerAssignments,
  removeVolunteerUser,
  scrubVolunteerFromApp,
  type AssignmentDecision,
} from "@/lib/admin/volunteer-assignments";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

function parseDecisions(value: unknown): Record<string, AssignmentDecision> {
  if (!value || typeof value !== "object") return {};

  const decisions: Record<string, AssignmentDecision> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const action = (entry as { action?: string }).action;
    const targetUserId = (entry as { targetUserId?: string }).targetUserId?.trim();

    if (action === "unassign" || action === "dismiss") {
      decisions[key] = { action: "unassign" };
      continue;
    }

    if (action === "reassign") {
      decisions[key] = { action: "reassign", targetUserId: targetUserId ?? "" };
    }
  }

  return decisions;
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const decisions = parseDecisions(body.decisions);

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (userId === profile!.id) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: targetProfile, error } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const target = targetProfile as Profile;
  const preview = await previewVolunteerAssignments(service, target);

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

  const removeError = await removeVolunteerUser(service, userId);
  if (removeError) {
    return NextResponse.json({ error: removeError }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
