export function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseBrowserUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseBrowserPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function looksLikeJwt(value: string): boolean {
  return value.split(".").length === 3;
}

function jwtRole(value: string): string | null {
  if (!looksLikeJwt(value)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8"
      )
    ) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Prefer a dedicated secret key for admin/server work.
 * Keep legacy service_role JWTs working, but never prefer a publishable/anon key.
 */
export function getSupabaseSecretKey() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() || null;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  if (secret?.startsWith("sb_secret_")) return secret;
  if (serviceRole?.startsWith("sb_secret_")) return serviceRole;

  if (serviceRole && jwtRole(serviceRole) === "service_role") return serviceRole;
  if (secret && jwtRole(secret) === "service_role") return secret;

  // Last resort: accept either configured value so hasSupabaseAdminConfig() still works,
  // but callers should validate before Auth Admin use.
  return secret ?? serviceRole;
}

export function describeSupabaseSecretKey(key: string | null | undefined): string {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "sb_secret";
  if (key.startsWith("sb_publishable_")) return "sb_publishable (wrong key for admin)";
  const role = jwtRole(key);
  if (role === "service_role") return "legacy service_role JWT";
  if (role === "anon") return "legacy anon JWT (wrong key for admin)";
  if (looksLikeJwt(key)) return `JWT role=${role ?? "unknown"}`;
  return "unrecognized key format";
}

export function hasSupabaseServerConfig() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function hasSupabaseAdminConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
