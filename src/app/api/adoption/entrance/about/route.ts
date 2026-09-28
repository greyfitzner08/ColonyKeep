import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { DEFAULT_ENTRANCE_ABOUT_MESSAGE } from "@/lib/branding";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_LENGTH = 12000;

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "volunteer", "trap_team_lead"]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const raw =
    body && typeof body === "object" && "message" in body
      ? (body as { message: unknown }).message
      : null;
  const message =
    typeof raw === "string" && intakeAboutPlainText(raw).trim()
      ? sanitizeIntakeAboutHtml(raw)
      : DEFAULT_ENTRANCE_ABOUT_MESSAGE;
  if (message.length > MAX_LENGTH) {
    return NextResponse.json({ error: "The about us text is too long." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("platform_branding")
    .update({
      adoption_entrance_about_message: message,
      updated_by: profile?.id ?? null,
    })
    .eq("id", 1)
    .select("adoption_entrance_about_message")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Unable to save the about us text." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Branding settings were not found." }, { status: 404 });
  }

  return NextResponse.json({ message: data.adoption_entrance_about_message });
}
