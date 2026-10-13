import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  isAllowedTeamFeedReaction,
  normalizeTeamFeedReactions,
  toggleTeamFeedReaction,
} from "@/lib/team-feed/reactions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await getAuthenticatedProfile();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
  if (!isAllowedTeamFeedReaction(emoji)) {
    return NextResponse.json({ error: "That reaction is not supported." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: post, error: loadError } = await service
    .from("team_announcements")
    .select("id, reactions")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 });
  }
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const nextReactions = toggleTeamFeedReaction(normalizeTeamFeedReactions(post.reactions), {
    emoji,
    author_email: profile!.email,
    author_name: profile!.full_name ?? profile!.email,
  });

  const { error } = await service
    .from("team_announcements")
    .update({ reactions: nextReactions })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, reactions: nextReactions });
}
