import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  ROLE_PREVIEW_COOKIE,
  isValidRolePreviewKey,
  parseRolePreviewCookie,
} from "@/lib/admin/role-preview.shared";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => ({}));
  const preview = body.preview as string | null | undefined;

  const next = NextResponse.json({ ok: true, preview: preview ?? null });

  if (!preview) {
    next.cookies.delete(ROLE_PREVIEW_COOKIE);
    return next;
  }

  if (!isValidRolePreviewKey(preview) || !parseRolePreviewCookie(preview)) {
    return NextResponse.json({ error: "Invalid preview role" }, { status: 400 });
  }

  next.cookies.set(ROLE_PREVIEW_COOKIE, preview, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return next;
}
