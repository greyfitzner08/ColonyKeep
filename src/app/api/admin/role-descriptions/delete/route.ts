import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { VolunteerRole } from "@/lib/types";

const PROTECTED_ROLE_IDS = new Set<VolunteerRole>(["youth_volunteer", "other"]);

function roleLabel(roleId: VolunteerRole, dbLabel?: string | null): string {
  if (dbLabel?.trim()) return dbLabel.trim();
  return VOLUNTEER_ROLES.find((role) => role.value === roleId)?.label ?? roleId.replace(/_/g, " ");
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const roleIdInput =
    typeof body.role_id === "string"
      ? body.role_id.trim()
      : id.startsWith("default-")
        ? id.slice("default-".length)
        : "";

  if (!roleIdInput) {
    return NextResponse.json({ error: "Missing role id" }, { status: 400 });
  }

  const roleId = roleIdInput as VolunteerRole;

  if (PROTECTED_ROLE_IDS.has(roleId)) {
    return NextResponse.json(
      { error: `${roleLabel(roleId)} is a core role and cannot be removed.` },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: dbRole } = await service
    .from("role_descriptions")
    .select("id, role_id, label")
    .eq("role_id", roleId)
    .maybeSingle();

  const label = roleLabel(roleId, dbRole?.label);

  const [
    { count: profileCount },
    { count: applicationCount },
    { count: roleRequestCount },
  ] = await Promise.all([
    service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("volunteer_roles", [roleId]),
    service
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .contains("roles_requested", [roleId]),
    service
      .from("volunteer_role_requests")
      .select("id", { count: "exact", head: true })
      .contains("requested_roles", [roleId]),
  ]);

  const references =
    (profileCount ?? 0) + (applicationCount ?? 0) + (roleRequestCount ?? 0);

  if (references > 0) {
    const parts = [
      profileCount ? `${profileCount} volunteer(s)` : null,
      applicationCount ? `${applicationCount} application(s)` : null,
      roleRequestCount ? `${roleRequestCount} role request(s)` : null,
    ].filter(Boolean);

    return NextResponse.json(
      {
        error: `Cannot remove ${label} — still referenced by ${parts.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (dbRole?.id) {
    const { error: deleteError } = await service
      .from("role_descriptions")
      .delete()
      .eq("id", dbRole.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
  }

  const { error: disableError } = await service
    .from("disabled_volunteer_roles")
    .upsert({ role_id: roleId }, { onConflict: "role_id" });

  if (disableError) {
    return NextResponse.json({ error: disableError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
