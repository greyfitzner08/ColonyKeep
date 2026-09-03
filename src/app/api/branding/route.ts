import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { normalizePlatformBranding, type PlatformBranding } from "@/lib/branding";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_NAME_LENGTH = 80;

function validateName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_NAME_LENGTH) return null;
  return trimmed;
}

function validateLogoUrl(logoUrl: unknown): string | null | undefined {
  if (logoUrl === null) return null;
  if (logoUrl === undefined) return undefined;
  if (typeof logoUrl !== "string") return undefined;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const service = await createServiceClient();
    const { data, error } = await service
      .from("platform_branding")
      .select("app_name, logo_url")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ branding: normalizePlatformBranding(data) satisfies PlatformBranding });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load branding" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const appName = validateName((body as { app_name?: unknown }).app_name);
  if (!appName) {
    return NextResponse.json(
      { error: `Enter an app name (1–${MAX_NAME_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const logoResult = validateLogoUrl((body as { logo_url?: unknown }).logo_url);
  if (logoResult === undefined && (body as { logo_url?: unknown }).logo_url !== undefined) {
    return NextResponse.json({ error: "Logo URL must be a valid http(s) link." }, { status: 400 });
  }

  const service = await createServiceClient();
  const payload = {
    id: 1,
    app_name: appName,
    logo_url: logoResult === undefined ? null : logoResult,
    updated_by: profile!.id,
  };

  const { data, error } = await service
    .from("platform_branding")
    .upsert(payload, { onConflict: "id" })
    .select("app_name, logo_url")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ branding: normalizePlatformBranding(data) });
}
