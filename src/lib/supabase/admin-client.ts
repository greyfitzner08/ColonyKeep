import { createClient } from "@supabase/supabase-js";
import {
  describeSupabaseSecretKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

/** Service-role Supabase client — safe inside unstable_cache (no cookies/headers). */
export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY."
    );
  }

  const keyKind = describeSupabaseSecretKey(secretKey);
  if (keyKind.includes("wrong key") || keyKind.includes("anon")) {
    throw new Error(
      `Supabase admin key looks invalid (${keyKind}). Use the service_role JWT or an sb_secret_... key.`
    );
  }

  // Do not set accessToken — that option disables supabase.auth.admin.
  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
