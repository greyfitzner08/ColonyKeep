import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Service-role Supabase client — safe inside unstable_cache (no cookies/headers). */
export function createAdminClient() {
  return createClient(getSupabaseUrl()!, getSupabaseSecretKey()!);
}
