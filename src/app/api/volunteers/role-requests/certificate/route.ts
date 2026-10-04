import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const requestId = typeof body.request_id === "string" ? body.request_id.trim() : "";
  const certificateUrl =
    typeof body.certificate_url === "string" ? body.certificate_url.trim() : "";

  if (!requestId || !certificateUrl) {
    return NextResponse.json({ error: "Missing request_id or certificate_url" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: roleRequest, error: loadError } = await service
    .from("volunteer_role_requests")
    .select("id, email, status")
    .eq("id", requestId)
    .single();

  if (loadError || !roleRequest) {
    return NextResponse.json({ error: loadError?.message ?? "Role request not found" }, { status: 404 });
  }

  if (roleRequest.status !== "pending") {
    return NextResponse.json({ error: "Only pending role requests can be updated" }, { status: 400 });
  }

  const email = roleRequest.email.toLowerCase();
  const { data, error } = await service
    .from("volunteer_role_requests")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await service
    .from("volunteer_applications")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
      reviewed_by: profile!.email,
      reviewed_at: new Date().toISOString(),
    })
    .ilike("email", email);

  await service
    .from("profiles")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
    })
    .ilike("email", email);

  return NextResponse.json({ request: data, certificate_url: certificateUrl });
}
