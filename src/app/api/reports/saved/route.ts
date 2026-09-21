import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { sanitizePivotConfig } from "@/lib/reports/pivot";

export async function GET() {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const client = await createServiceClient();
  const { data, error } = await client
    .from("saved_reports")
    .select("id, name, description, config, created_by_email, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, reports: [] },
      { status: error.code === "42P01" ? 503 : 400 }
    );
  }

  return NextResponse.json({ reports: data ?? [], actorEmail: profile?.email ?? null });
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const config = sanitizePivotConfig(body?.config);
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : config?.name ?? "Untitled pivot";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!config) {
    return NextResponse.json({ error: "Invalid report configuration" }, { status: 400 });
  }

  const client = await createServiceClient();
  const { data, error } = await client
    .from("saved_reports")
    .insert({
      name,
      description: description || null,
      config: { ...config, name, description },
      created_by: profile?.id ?? null,
      created_by_email: profile?.email ?? null,
    })
    .select("id, name, description, config, created_by_email, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }

  return NextResponse.json({ report: data });
}
