import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SIDEBAR_COLOR,
  isValidHexColor,
  normalizeHexColor,
  normalizePlatformBranding,
  type PlatformBranding,
} from "@/lib/branding";
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

function validateThemeColor(value: unknown, fallback: string): string | null {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!isValidHexColor(withHash)) return null;
  return normalizeHexColor(withHash, fallback);
}

const BRANDING_SELECT =
  "app_name, logo_url, logo_light_url, primary_color, sidebar_color" as const;

export async function GET() {
  try {
    const service = await createServiceClient();
    const { data, error } = await service
      .from("platform_branding")
      .select(BRANDING_SELECT)
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

  const logoLightResult = validateLogoUrl((body as { logo_light_url?: unknown }).logo_light_url);
  if (
    logoLightResult === undefined &&
    (body as { logo_light_url?: unknown }).logo_light_url !== undefined
  ) {
    return NextResponse.json(
      { error: "Light-background logo URL must be a valid http(s) link." },
      { status: 400 }
    );
  }

  const primaryColor = validateThemeColor(
    (body as { primary_color?: unknown }).primary_color,
    DEFAULT_PRIMARY_COLOR
  );
  if (!primaryColor) {
    return NextResponse.json(
      { error: "Primary color must be a hex value like #21966B." },
      { status: 400 }
    );
  }

  const sidebarColor = validateThemeColor(
    (body as { sidebar_color?: unknown }).sidebar_color,
    DEFAULT_SIDEBAR_COLOR
  );
  if (!sidebarColor) {
    return NextResponse.json(
      { error: "Sidebar color must be a hex value like #142E26." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const payload = {
    id: 1,
    app_name: appName,
    logo_url: logoResult === undefined ? null : logoResult,
    logo_light_url: logoLightResult === undefined ? null : logoLightResult,
    primary_color: primaryColor,
    sidebar_color: sidebarColor,
    updated_by: profile!.id,
  };

  const { data, error } = await service
    .from("platform_branding")
    .upsert(payload, { onConflict: "id" })
    .select(BRANDING_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ branding: normalizePlatformBranding(data) });
}
