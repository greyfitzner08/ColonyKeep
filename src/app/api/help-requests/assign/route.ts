import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { isTnvrVolunteerProfile } from "@/lib/equipment/volunteers";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

const CLOSED_STATUSES = new Set(["closed", "completed"]);

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { helpRequestId, assigneeProfileId } = body as {
    helpRequestId?: string;
    assigneeProfileId?: string;
  };

  if (!helpRequestId?.trim() || !assigneeProfileId?.trim()) {
    return NextResponse.json(
      { error: "Missing helpRequestId or assigneeProfileId" },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const [{ data: existing, error: fetchError }, { data: assignee, error: assigneeError }] =
    await Promise.all([
      service
        .from("help_requests")
        .select("id, claimed_by_email, claimed_by_name, status, history_log")
        .eq("id", helpRequestId)
        .single(),
      service
        .from("profiles")
        .select("id, email, full_name, role, volunteer_roles, team_id")
        .eq("id", assigneeProfileId)
        .maybeSingle(),
    ]);

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  if (assigneeError || !assignee) {
    return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
  }

  if (!isTnvrVolunteerProfile(assignee)) {
    return NextResponse.json(
      { error: "Assignee must be a TNVR team member or admin" },
      { status: 400 }
    );
  }

  const status = existing.status as HelpRequestStatus;
  if (CLOSED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Closed cases cannot be assigned" }, { status: 400 });
  }

  const assigneeEmail = (assignee.email ?? "").trim();
  if (!assigneeEmail) {
    return NextResponse.json({ error: "Assignee has no email" }, { status: 400 });
  }

  const assigneeName = (assignee.full_name ?? assignee.email ?? "").trim() || assigneeEmail;
  const actorEmail = profile!.email ?? "";
  const actorName = profile!.full_name ?? profile!.email ?? "";
  const priorHistory = normalizeHistoryLog(existing.history_log);

  const alreadyAssigned =
    (existing.claimed_by_email ?? "").trim().toLowerCase() === assigneeEmail.toLowerCase();

  if (alreadyAssigned && status === "claimed") {
    return NextResponse.json({ success: true, unchanged: true });
  }

  const historyEntry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: "assign",
    actor_email: actorEmail || null,
    actor_name: actorName || null,
    details: `Assigned to ${assigneeName} for trap work`,
  };

  const updates: Record<string, unknown> = {
    claimed_by_email: assigneeEmail,
    claimed_by_name: assigneeName,
    status: "claimed",
    history_log: [...priorHistory, historyEntry],
  };

  const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    claimed_by_email: assigneeEmail,
    claimed_by_name: assigneeName,
  });
}
