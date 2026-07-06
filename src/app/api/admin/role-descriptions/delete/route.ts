import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

const PROTECTED_ROLE_IDS = new Set(["youth_volunteer", "other"]);

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "Missing role id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: role, error: fetchError } = await service
    .from("role_descriptions")
    .select("id, role_id, label")
    .eq("id", id)
    .single();

  if (fetchError || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (PROTECTED_ROLE_IDS.has(role.role_id)) {
    return NextResponse.json(
      { error: `${role.label} is a core role and cannot be removed.` },
      { status: 400 }
    );
  }

  const [{ count: profileCount }, { count: applicationCount }] = await Promise.all([
    service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("volunteer_roles", [role.role_id]),
    service
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .contains("roles_requested", [role.role_id]),
  ]);

  if ((profileCount ?? 0) > 0 || (applicationCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Cannot remove ${role.label} — ${profileCount ?? 0} volunteer(s) and ${applicationCount ?? 0} application(s) still reference it.`,
      },
      { status: 400 }
    );
  }

  const { error } = await service.from("role_descriptions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
