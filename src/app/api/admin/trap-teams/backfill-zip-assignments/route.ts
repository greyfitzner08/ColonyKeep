import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { backfillTrapTeamAssignmentsByHomeZip } from "@/lib/volunteers/assign-team-by-home-zip";

/** Assign unassigned TNVR-eligible volunteers to teams by home ZIP. */
export async function POST(_request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  try {
    const service = await createServiceClient();
    const result = await backfillTrapTeamAssignmentsByHomeZip(service);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to backfill team assignments" },
      { status: 400 }
    );
  }
}
