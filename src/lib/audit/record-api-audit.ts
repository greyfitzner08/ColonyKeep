import type { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { describeAuditAction } from "@/lib/audit/action-label";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const LOGIN_COOKIE = "ck_login_audit";
const RECENT_SIGN_IN_MS = 15 * 60 * 1000;

/** Activity that already appears on the case page. */
const CASE_ACTIVITY_PREFIXES = [
  "/api/help-requests",
  "/api/cats",
  "/api/appointments",
  "/api/public/case-progress",
];

function shouldRecord(pathname: string, method: string) {
  if (!pathname.startsWith("/api/")) return false;
  if (!MUTATING.has(method)) return false;
  if (pathname.startsWith("/api/places")) return false;
  if (pathname.startsWith("/api/geocode")) return false;
  if (pathname.startsWith("/api/cron")) return false;
  if (CASE_ACTIVITY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return true;
}

function secretKey() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret || serviceRole || null;
}

function sessionKeyFromToken(token: string | null, userId: string, lastSignInAt: string | null) {
  if (token) {
    const part = token.split(".")[1];
    if (part) {
      try {
        const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as {
          session_id?: string;
        };
        if (typeof json.session_id === "string" && json.session_id) return json.session_id;
      } catch {
        // Fall through to the sign-in timestamp key.
      }
    }
  }
  return `${userId}:${lastSignInAt ?? "unknown"}`;
}

async function loginAlreadyRecorded(actorId: string, occurredAt: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = secretKey();
  if (!supabaseUrl || !key) return false;

  const params = new URLSearchParams({
    select: "id",
    source: "eq.login",
    actor_id: `eq.${actorId}`,
    occurred_at: `eq.${occurredAt}`,
    limit: "1",
  });
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/audit_events?${params.toString()}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as unknown[];
  return rows.length > 0;
}

async function insertAuditEvent(row: Record<string, string | null>) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = secretKey();
  if (!supabaseUrl || !key) return;

  await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/audit_events`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
}

/** Record a mutating API call. Failures are ignored so the request still proceeds. */
export async function recordApiAudit(request: NextRequest, user: User | null) {
  const method = request.method.toUpperCase();
  const path = request.nextUrl.pathname;
  if (!shouldRecord(path, method)) return;

  try {
    await insertAuditEvent({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      method,
      path,
      summary: describeAuditAction(method, path),
      source: "api",
    });
  } catch {
    // Audit logging must not block the action.
  }
}

/**
 * Record a sign-in once per auth session. The returned function marks that
 * session on whichever response is actually sent.
 */
export async function trackLogin(
  request: NextRequest,
  user: Pick<User, "id" | "email"> & { last_sign_in_at?: string | null },
  accessToken: string | null
) {
  const sessionKey = sessionKeyFromToken(accessToken, user.id, user.last_sign_in_at ?? null);
  const seen = request.cookies.get(LOGIN_COOKIE)?.value;
  const stamp = (response: NextResponse) => {
    if (seen === sessionKey) return response;
    response.cookies.set(LOGIN_COOKIE, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  };

  if (seen === sessionKey) return stamp;

  const signedInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
  const recent = Number.isFinite(signedInAt) && Date.now() - signedInAt < RECENT_SIGN_IN_MS;

  try {
    if (recent) {
      const occurredAt = new Date(signedInAt).toISOString();
      const already = await loginAlreadyRecorded(user.id, occurredAt);
      if (!already) {
        await insertAuditEvent({
          occurred_at: occurredAt,
          actor_id: user.id,
          actor_email: user.email ?? null,
          method: null,
          path: "/login",
          summary: "Signed in",
          source: "login",
        });
      }
    }
  } catch {
    // Still mark the session so a logging failure does not retry every page.
  }

  return stamp;
}
