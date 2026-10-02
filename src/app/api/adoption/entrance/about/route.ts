import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  DEFAULT_ENTRANCE_ABOUT_MESSAGE,
  normalizePublicHttpsUrl,
  normalizeRescueAboutLinks,
} from "@/lib/branding";
import { intakeAboutPlainText, sanitizeIntakeAboutHtml } from "@/lib/intake-about-html";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_LENGTH = 12000;
const MAX_BUTTON_TEXT = 80;

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "volunteer", "trap_team_lead"]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = "message" in body ? (body as { message: unknown }).message : null;
  const message =
    typeof raw === "string" && intakeAboutPlainText(raw).trim()
      ? sanitizeIntakeAboutHtml(raw, { allowLinks: true })
      : DEFAULT_ENTRANCE_ABOUT_MESSAGE;
  if (message.length > MAX_LENGTH) {
    return NextResponse.json({ error: "The about us text is too long." }, { status: 400 });
  }

  const buttonTextRaw =
    "buttonText" in body ? (body as { buttonText: unknown }).buttonText : "";
  const buttonText = typeof buttonTextRaw === "string" ? buttonTextRaw.trim().slice(0, MAX_BUTTON_TEXT) : "";
  const buttonUrlRaw = "buttonUrl" in body ? (body as { buttonUrl: unknown }).buttonUrl : null;
  const buttonUrl = normalizePublicHttpsUrl(
    typeof buttonUrlRaw === "string" || buttonUrlRaw === null ? buttonUrlRaw : undefined
  );
  const buttonWarning =
    buttonUrl === undefined
      ? "The button link needs to be a web address. Your text was saved."
      : buttonText && !buttonUrl
        ? "Add a link for the button, or clear the button label. Your text was saved."
        : null;

  const patch: Record<string, unknown> = {
    adoption_entrance_about_message: message,
    adoption_entrance_button_text: buttonText,
    updated_by: profile?.id ?? null,
  };

  // Keep the previous URL when the submitted value is invalid; otherwise persist
  // the normalized URL (including null when the field was cleared).
  if (buttonUrl !== undefined) {
    patch.adoption_entrance_button_url = buttonUrl;
  }

  // Only overwrite links when the client explicitly sends them.
  if ("links" in body) {
    patch.adoption_entrance_links = normalizeRescueAboutLinks(
      (body as { links: unknown }).links
    );
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("platform_branding")
    .update(patch)
    .eq("id", 1)
    .select(
      "adoption_entrance_about_message, adoption_entrance_button_text, adoption_entrance_button_url, adoption_entrance_links"
    )
    .maybeSingle();

  if (error) {
    console.error("[adoption/entrance/about] save failed:", error.message);
    return NextResponse.json(
      { error: error.message || "Unable to save the about us text." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Branding settings were not found." }, { status: 404 });
  }

  return NextResponse.json({
    message: data.adoption_entrance_about_message,
    buttonText: data.adoption_entrance_button_text ?? "",
    buttonUrl: data.adoption_entrance_button_url,
    links: normalizeRescueAboutLinks(data.adoption_entrance_links),
    warning: buttonWarning,
  });
}
