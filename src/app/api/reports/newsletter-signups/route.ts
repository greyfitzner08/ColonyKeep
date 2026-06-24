import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

type NewsletterAction = "mark_added" | "restore";

export async function PATCH(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
  const action = body?.action as NewsletterAction | undefined;

  if (!ids.length) {
    return NextResponse.json({ error: "No signups selected" }, { status: 400 });
  }

  if (action !== "mark_added" && action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("help_requests")
    .update({
      newsletter_list_added_at:
        action === "mark_added" ? new Date().toISOString() : null,
    })
    .in("id", ids)
    .eq("consent_communications", true)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
