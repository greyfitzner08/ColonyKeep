import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidRoleId, normalizeRoleId, roleIdValidationError } from "@/lib/volunteers/role-id";
import { isKnownRequirementField } from "@/lib/volunteers/role-requirements";
import type { VolunteerRole } from "@/lib/types";

function parseRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const requirements = parseRequirements(body.requirements);
  const invalidRequirement = requirements.find(
    (entry) => !isKnownRequirementField(entry) && entry.length > 80
  );

  if (invalidRequirement) {
    return NextResponse.json(
      { error: "Custom requirements must be 80 characters or fewer." },
      { status: 400 }
    );
  }

  if (!label) {
    return NextResponse.json({ error: "Role name is required." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const service = await createServiceClient();
  const payload = { label, description, requirements };

  if (id) {
    const { data, error } = await service
      .from("role_descriptions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ role: data });
  }

  const roleId = normalizeRoleId(
    typeof body.role_id === "string" && body.role_id.trim()
      ? body.role_id
      : label
  );
  const roleIdError = roleIdValidationError(roleId);
  if (roleIdError) {
    return NextResponse.json({ error: roleIdError }, { status: 400 });
  }
  if (!isValidRoleId(roleId)) {
    return NextResponse.json({ error: "Invalid role id." }, { status: 400 });
  }

  const { data: existing } = await service
    .from("role_descriptions")
    .select("id")
    .eq("role_id", roleId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await service
      .from("role_descriptions")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ role: data });
  }

  const builtInRoleIds = new Set<string>(VOLUNTEER_ROLES.map((role) => role.value));

  if (!builtInRoleIds.has(roleId)) {
    const { error: enumError } = await service.rpc("admin_add_volunteer_role", {
      new_role: roleId,
    });

    if (enumError) {
      return NextResponse.json({ error: enumError.message }, { status: 400 });
    }
  }

  const { data, error } = await service
    .from("role_descriptions")
    .insert({
      role_id: roleId as VolunteerRole,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ role: data });
}
