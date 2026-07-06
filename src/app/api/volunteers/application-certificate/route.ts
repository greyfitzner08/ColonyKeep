import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const path = request.nextUrl.searchParams.get("path")?.trim();
  if (!path) {
    return NextResponse.json({ error: "Missing certificate path" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service.storage.from("certificates").createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not load certificate" }, { status: 400 });
  }

  return NextResponse.json({ url: data.signedUrl });
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const applicationId =
    typeof body.applicationId === "string" ? body.applicationId.trim() : "";
  const certificateUrl =
    typeof body.certificate_url === "string" ? body.certificate_url.trim() : "";

  if (!applicationId || !certificateUrl) {
    return NextResponse.json({ error: "Missing applicationId or certificate_url" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application, error: loadError } = await service
    .from("volunteer_applications")
    .select("email")
    .eq("id", applicationId)
    .single();

  if (loadError || !application) {
    return NextResponse.json({ error: loadError?.message ?? "Application not found" }, { status: 404 });
  }

  const { error } = await service
    .from("volunteer_applications")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
      reviewed_by: profile!.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await service
    .from("volunteer_role_requests")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
    })
    .eq("email", application.email.toLowerCase())
    .eq("status", "pending");

  return NextResponse.json({ success: true, certificate_url: certificateUrl });
}
