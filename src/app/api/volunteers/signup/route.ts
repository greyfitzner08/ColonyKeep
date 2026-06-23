import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = await createServiceClient();

  const { error } = await service.from("volunteer_applications").insert({
    status: "pending",
    full_name: body.full_name,
    email: body.email,
    phone: body.phone,
    birthday: body.birthday,
    roles_requested: body.roles_requested ?? [],
    prior_experience: body.prior_experience || null,
    how_heard: body.how_heard || null,
    liability_waiver_signed: Boolean(body.liability_waiver_signed),
    policy_signed: Boolean(body.policy_signed),
    tnvr_certificate_uploaded: Boolean(body.tnvr_certificate_uploaded),
    tnvr_certificate_url: body.tnvr_certificate_url ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
