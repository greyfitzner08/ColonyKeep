import { NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import type { Clinic } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Clinic details unavailable." }, { status: 503 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing clinic id." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service.from("clinics").select("*").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
  }

  return NextResponse.json(
    { clinic: data as Clinic },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
