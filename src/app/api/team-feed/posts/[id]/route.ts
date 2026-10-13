import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a?.trim() && b?.trim() && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Enter a message." }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: post, error: loadError } = await service
    .from("team_announcements")
    .select("id, author_email, is_birthday")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isAuthor = emailsMatch(post.author_email, profile!.email);
  const isAdmin = profile!.role === "admin";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json(
      { error: "You can only edit posts you created." },
      { status: 403 }
    );
  }
  if (post.is_birthday) {
    return NextResponse.json({ error: "Birthday posts cannot be edited." }, { status: 400 });
  }

  const { error } = await service
    .from("team_announcements")
    .update({ message })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return response;

  const { id } = await params;
  const service = await createServiceClient();
  const { data: post, error: loadError } = await service
    .from("team_announcements")
    .select("id, author_email")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isAuthor = emailsMatch(post.author_email, profile!.email);
  const isAdmin = profile!.role === "admin";
  if (!isAuthor && !isAdmin) {
    return NextResponse.json(
      { error: "You can only delete posts you created." },
      { status: 403 }
    );
  }

  const { error } = await service.from("team_announcements").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
