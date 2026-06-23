import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import {
  createAdminClient,
  createContextClient,
  verifyCredentials,
} from "@supabase/server/core";
import { withSupabase } from "@supabase/server";
import type {
  AuthModeWithKey,
  SupabaseContext,
  SupabaseEnv,
  WithSupabaseConfig,
} from "@supabase/server";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export { withSupabase };
export type { AuthModeWithKey, SupabaseContext, WithSupabaseConfig };

function resolveNextSupabaseEnv(): Partial<SupabaseEnv> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  const jwksUrl =
    process.env.SUPABASE_JWKS_URL ??
    (url ? `${url}/auth/v1/.well-known/jwks.json` : undefined);

  return {
    url: url ?? undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: secretKey ? { default: secretKey } : {},
    jwks: jwksUrl ? new URL(jwksUrl) : null,
  };
}

export async function createNextSupabaseContext(
  options: Pick<WithSupabaseConfig, "auth" | "supabaseOptions"> = {
    auth: "user",
  },
): Promise<
  | { data: SupabaseContext; error: null }
  | { data: null; error: Error }
> {
  const env = resolveNextSupabaseEnv();
  const publishableKey = env.publishableKeys?.default;

  if (!env.url || !publishableKey) {
    return {
      data: null,
      error: new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY"),
    };
  }

  const cookieStore = await cookies();
  const ssrClient = createServerClient(env.url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, cookieOptions),
          );
        } catch {
          // Server Components cannot write cookies; middleware refreshes them.
        }
      },
    },
  });

  const {
    data: { session },
  } = await ssrClient.auth.getSession();

  const { data: auth, error } = await verifyCredentials(
    { token: session?.access_token ?? null, apikey: null },
    {
      auth: options.auth ?? "user",
      env,
    },
  );

  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      supabase: createContextClient({
        auth: { token: auth.token },
        env,
        supabaseOptions: options.supabaseOptions,
      }),
      supabaseAdmin: createAdminClient({
        env,
        supabaseOptions: options.supabaseOptions,
      }),
      userClaims: auth.userClaims,
      jwtClaims: auth.jwtClaims,
      authMode: auth.authMode,
      authKeyName: auth.keyName ?? undefined,
    },
    error: null,
  };
}
