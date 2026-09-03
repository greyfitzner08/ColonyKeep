import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const DEFAULT_APP_NAME = "TNVR Rescue";

export interface PlatformBranding {
  app_name: string;
  logo_url: string | null;
}

export function defaultPlatformBranding(): PlatformBranding {
  return {
    app_name: DEFAULT_APP_NAME,
    logo_url: null,
  };
}

export function normalizePlatformBranding(
  row: { app_name?: string | null; logo_url?: string | null } | null | undefined
): PlatformBranding {
  const name = row?.app_name?.trim();
  const logo = row?.logo_url?.trim();
  return {
    app_name: name || DEFAULT_APP_NAME,
    logo_url: logo || null,
  };
}

/** Cached per-request branding fetch for server components. */
export const getPlatformBranding = cache(async (): Promise<PlatformBranding> => {
  try {
    // Prefer service client so public pages still load branding if anon RLS misbehaves.
    let client;
    try {
      client = await createServiceClient();
    } catch {
      client = await createClient();
    }

    const { data, error } = await client
      .from("platform_branding")
      .select("app_name, logo_url")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[branding] Failed to load platform branding:", error.message);
      return defaultPlatformBranding();
    }

    return normalizePlatformBranding(data);
  } catch (error) {
    console.error("[branding] Unexpected branding load error:", error);
    return defaultPlatformBranding();
  }
});
