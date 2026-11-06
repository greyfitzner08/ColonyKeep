import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { describeAuditAction } from "@/lib/audit/action-label";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function shouldRecord(pathname: string, method: string) {
  if (!pathname.startsWith("/api/")) return false;
  if (!MUTATING.has(method)) return false;
  if (pathname.startsWith("/api/places")) return false;
  if (pathname.startsWith("/api/geocode")) return false;
  if (pathname.startsWith("/api/cron")) return false;
  return true;
}

function secretKey() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret || serviceRole || null;
}

/** Record a mutating API call. Failures are ignored so the request still proceeds. */
export async function recordApiAudit(request: NextRequest, user: User | null) {
  const method = request.method.toUpperCase();
  const path = request.nextUrl.pathname;
  if (!shouldRecord(path, method)) return;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = secretKey();
  if (!supabaseUrl || !key) return;

  try {
    await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/audit_events`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        actor_id: user?.id ?? null,
        actor_email: user?.email ?? null,
        method,
        path,
        summary: describeAuditAction(method, path),
        source: "api",
      }),
    });
  } catch {
    // Audit logging must not block the action.
  }
}
