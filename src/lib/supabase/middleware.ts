import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { canAccessRoute } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

const PUBLIC_ROUTES = ["/request", "/volunteer-signup", "/clinic-booking", "/login", "/auth", "/set-password"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  const supabase = createServerClient(
    supabaseUrl!,
    publishableKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isApi = pathname.startsWith("/api/");

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname !== "/set-password" && !pathname.startsWith("/auth") && !isApi && !isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, volunteer_roles, must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = "/set-password";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!canAccessRoute(profile as Profile, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
