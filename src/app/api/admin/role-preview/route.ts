import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  PREVIEWABLE_PLATFORM_ROLES,
  ROLE_PREVIEW_COOKIE,
  parsePreviewRole,
} from "@/lib/admin/role-preview.shared";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const role = body.role as UserRole | null | undefined;

  const next = NextResponse.json({ ok: true, role: role ?? null });

  if (!role) {
    next.cookies.delete(ROLE_PREVIEW_COOKIE);
    return next;
  }

  const parsed = parsePreviewRole(role);
  if (!parsed || !PREVIEWABLE_PLATFORM_ROLES.includes(parsed)) {
    return NextResponse.json({ error: "Invalid preview role" }, { status: 400 });
  }

  next.cookies.set(ROLE_PREVIEW_COOKIE, parsed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return next;
}
