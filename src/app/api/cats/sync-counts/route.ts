import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { syncTrackedCatFixesForCase } from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId = body?.helpRequestId as string | undefined;

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  try {
    const service = await createServiceClient();
    await syncTrackedCatFixesForCase(service, helpRequestId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync cat counts";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
