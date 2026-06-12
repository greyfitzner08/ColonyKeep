"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { TeamAnnouncement, Profile } from "@/lib/types";
import { Pin, Cake, MessageCircle } from "lucide-react";

interface TeamFeedProps {
  announcements: TeamAnnouncement[];
  profile: Profile | null;
}

export function TeamFeed({ announcements: initial, profile }: TeamFeedProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  async function postAnnouncement() {
    if (!message.trim() || !profile) return;
    const supabase = createClient();
    await supabase.from("team_announcements").insert({
      message,
      team_id: profile.team_id,
      team_name: null,
      author_email: profile.email,
      author_name: profile.full_name ?? profile.email,
    });
    setMessage("");
    router.refresh();
  }

  async function addComment(announcementId: string) {
    const text = commentTexts[announcementId];
    if (!text?.trim() || !profile) return;
    const supabase = createClient();
    const announcement = initial.find((a) => a.id === announcementId);
    if (!announcement) return;

    const comments = [
      ...(announcement.comments ?? []),
      {
        author_email: profile.email,
        author_name: profile.full_name ?? profile.email,
        text,
        created_at: new Date().toISOString(),
      },
    ];
    await supabase.from("team_announcements").update({ comments }).eq("id", announcementId);
    setCommentTexts({ ...commentTexts, [announcementId]: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Post an announcement to your team..."
            rows={3}
          />
          <Button onClick={postAnnouncement}>Post</Button>
        </CardContent>
      </Card>

      {initial.map((post) => (
        <Card key={post.id} className={post.pinned ? "border-primary" : post.is_birthday ? "border-pink-300 bg-pink-50" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {post.pinned && <Pin className="h-4 w-4 text-primary" />}
              {post.is_birthday && <Cake className="h-4 w-4 text-pink-500" />}
              <span className="font-medium text-sm">{post.author_name}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(post.created_at)}</span>
              {post.team_name && <Badge variant="secondary">{post.team_name}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap">{post.message}</p>

            {(post.comments ?? []).map((comment, i) => (
              <div key={i} className="ml-4 border-l-2 pl-3 text-sm">
                <p className="font-medium text-xs">{comment.author_name}</p>
                <p>{comment.text}</p>
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                value={commentTexts[post.id] ?? ""}
                onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                placeholder="Add a comment..."
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={() => addComment(post.id)}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
