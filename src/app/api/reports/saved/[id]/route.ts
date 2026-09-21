import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizePivotConfig } from "@/lib/reports/pivot";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { response, profile } = await requireApiRole(["admin"]);
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const config = body?.config != null ? sanitizePivotConfig(body.config) : null;
  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const description = typeof body?.description === "string" ? body.description.trim() : null;

  if (!name && description == null && !config) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name) patch.name = name;
  if (description != null) patch.description = description || null;
  if (config) {
    patch.config = {
      ...config,
      name: name || config.name,
      description: description ?? config.description ?? "",
    };
  }

  const client = await createServiceClient();
  const { data, error } = await client
    .from("saved_reports")
    .update(patch)
    .eq("id", id)
    .select("id, name, description, config, created_by_email, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ report: data, updatedBy: profile?.email ?? null });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const { id } = await params;
  const client = await createServiceClient();
  const { error } = await client.from("saved_reports").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
