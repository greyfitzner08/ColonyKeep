import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

function isValidBirthday(value: string): boolean {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;

  const body = await request.json();
  const birthday = typeof body.birthday === "string" ? body.birthday.trim() : "";

  if (!birthday) {
    return NextResponse.json({ error: "Birthday is required" }, { status: 400 });
  }

  if (!isValidBirthday(birthday)) {
    return NextResponse.json({ error: "Enter a valid birthday in the past" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { error: profileError } = await service
    .from("profiles")
    .update({ birthday })
    .eq("id", profile!.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await service
    .from("volunteer_applications")
    .update({ birthday })
    .eq("email", profile!.email);

  return NextResponse.json({ ok: true });
}
