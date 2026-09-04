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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const fileUrl = typeof body.file_url === "string" ? body.file_url.trim() : "";
  const bodyMarkdown =
    typeof body.body_markdown === "string" ? body.body_markdown.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!fileUrl && !bodyMarkdown) {
    return NextResponse.json(
      { error: "Add a file/link or write in-app guide content." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const payload = {
    title,
    description: body.description?.trim() || null,
    file_url: fileUrl,
    body_markdown: bodyMarkdown || null,
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
