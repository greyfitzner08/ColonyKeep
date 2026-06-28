import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const VALID_ROLES = new Set<UserRole>([
  "admin",
  "inquiry_team",
  "trap_team_lead",
  "volunteer",
]);

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const viewRoles = ((body.view_roles ?? ["admin"]) as string[]).filter((role) =>
    VALID_ROLES.has(role as UserRole)
  );

  if (!body.title?.trim() || !body.file_url?.trim()) {
    return NextResponse.json({ error: "Title and file URL are required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const payload = {
    title: body.title.trim(),
    description: body.description?.trim() || null,
    file_url: body.file_url.trim(),
    section: body.section?.trim() || "General",
    view_roles: viewRoles.length > 0 ? viewRoles : ["admin"],
    is_active: true,
    created_by_email: profile!.email,
  };

  const query = body.id
    ? service.from("library_documents").update(payload).eq("id", body.id)
    : service.from("library_documents").insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ document: data });
}
