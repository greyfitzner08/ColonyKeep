import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  describeSupabaseSecretKey,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  return createServerClient(
    supabaseUrl!,
    publishableKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set SUPABASE_SERVICE_ROLE_KEY (legacy) or SUPABASE_SECRET_KEY (sb_secret_...)."
    );
  }

  const keyKind = describeSupabaseSecretKey(secretKey);
  if (keyKind.includes("wrong key") || keyKind.includes("anon")) {
    throw new Error(
      `Supabase admin key looks invalid (${keyKind}). Use the service_role JWT or an sb_secret_... key from Supabase → Settings → API Keys.`
    );
  }

  // Plain createClient with the secret key (no cookies / no accessToken).
  // accessToken disables supabase.auth.admin, which we need for volunteer login setup.
  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
