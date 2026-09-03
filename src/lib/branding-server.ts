import { cache } from "react";
import {
  defaultPlatformBranding,
  normalizePlatformBranding,
  type PlatformBranding,
} from "@/lib/branding";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
      .select("app_name, logo_url, primary_color, sidebar_color")
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
