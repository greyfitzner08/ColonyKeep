"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { VOLUNTEER_ROLES } from "@/lib/constants";
import {
  birthdaysWithinDays,
  upcomingBirthdayLabel,
  type BirthdayPerson,
} from "@/lib/team-feed/birthdays";
import { BirthdayCalendarDialog } from "@/components/team/birthday-calendar-dialog";
import type { TeamAnnouncement, Profile, UserRole } from "@/lib/types";
import type { FeedAudience } from "@/lib/team-feed/visibility";
import { Pin, Cake, MessageCircle, Pencil, X, Check, Users, Globe, Send, CalendarDays } from "lucide-react";

const PLATFORM_ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrators" },
  { value: "inquiry_team", label: "Inquiry Team" },
  { value: "trap_team_lead", label: "Trap Team Leads" },
  { value: "clinic_coordination", label: "Clinic Coordination" },
  { value: "volunteer", label: "Volunteers (platform role)" },
];

interface TrapTeamOption {
  id: string;
  name: string;
}

interface TeamFeedProps {
  announcements: TeamAnnouncement[];
  profile: Profile | null;
  birthdayPeople: BirthdayPerson[];
  trapTeams: TrapTeamOption[];
}

function audienceLabel(post: TeamAnnouncement): string {
  const audience = (post.audience ?? "all") as FeedAudience;
  if (audience === "all") return "Everyone";
  if (audience === "team") return post.team_name ?? "Specific team";
  if (audience === "roles") {
    const count = post.view_roles?.length ?? 0;
    return count === 0 ? "Selected roles" : `${count} role${count === 1 ? "" : "s"}`;
  }
  return "Everyone";
}

export function TeamFeed({
  announcements: initial,
  profile,
  birthdayPeople,
  trapTeams,
}: TeamFeedProps) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<FeedAudience>("all");
  const [teamId, setTeamId] = useState<string>(profile?.team_id ?? "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const birthdaysSoon = useMemo(() => birthdaysWithinDays(birthdayPeople, 7), [birthdayPeople]);

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function postAnnouncement() {
    if (!message.trim() || !profile) return;
    if (audience === "team" && !teamId) return;
    if (audience === "roles" && selectedRoles.length === 0) return;

    const team = trapTeams.find((t) => t.id === teamId);
    const supabase = createClient();
    await supabase.from("team_announcements").insert({
      message,
      audience,
      view_roles: audience === "roles" ? selectedRoles : [],
      team_id: audience === "team" ? teamId : null,
      team_name: audience === "team" ? (team?.name ?? null) : null,
      author_email: profile.email,
      author_name: profile.full_name ?? profile.email,
    });
    setMessage("");
    setAudience("all");
    setSelectedRoles([]);
    router.refresh();
  }

  async function saveEdit(postId: string) {
    if (!editText.trim() || !profile) return;
    const supabase = createClient();
    await supabase
      .from("team_announcements")
      .update({ message: editText.trim() })
      .eq("id", postId)
      .eq("author_email", profile.email);
    setEditingId(null);
    setEditText("");
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

  const canPost =
    message.trim().length > 0 &&
    (audience !== "team" || Boolean(teamId)) &&
    (audience !== "roles" || selectedRoles.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {birthdayPeople.length > 0 && (
        <>
          {birthdaysSoon.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-pink-200 bg-pink-50/50 px-3 py-1.5 text-sm text-pink-900">
              <Cake className="h-4 w-4 shrink-0 text-pink-500" />
              <p className="min-w-0 flex-1 leading-snug">
                <span className="font-medium">Birthdays this week:</span>{" "}
                {birthdaysSoon
                  .map((person) => `${person.full_name} (${upcomingBirthdayLabel(person.birthday)})`)
                  .join(" · ")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-pink-800 hover:bg-pink-100/80 hover:text-pink-900"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </Button>
            </div>
          )}

          {birthdaysSoon.length === 0 && (
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Birthday calendar
              </Button>
            </div>
          )}

          <BirthdayCalendarDialog
            open={calendarOpen}
            onOpenChange={setCalendarOpen}
            people={birthdayPeople}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New post</CardTitle>
          <CardDescription>Share updates, wins, and milestones with your chosen audience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="feed-message">Message</Label>
            <Textarea
              id="feed-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's happening with the team?"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as FeedAudience)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone on the platform</SelectItem>
                  <SelectItem value="team">A specific trap team</SelectItem>
                  <SelectItem value="roles">Specific roles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audience === "team" && (
              <div className="space-y-2">
                <Label>Trap team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {trapTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {audience === "roles" && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium mb-3">Platform roles</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLATFORM_ROLES.map((role) => (
                    <label
                      key={role.value}
                      htmlFor={`platform-${role.value}`}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-pointer"
                    >
                      <Checkbox
                        id={`platform-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <span className="text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Volunteer interests</p>
                <div className="grid gap-2 sm:grid-cols-2 max-h-52 overflow-y-auto pr-1">
                  {VOLUNTEER_ROLES.map((role) => (
                    <label
                      key={role.value}
                      htmlFor={`volunteer-${role.value}`}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 cursor-pointer"
                    >
                      <Checkbox
                        id={`volunteer-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                      />
                      <span className="text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button onClick={postAnnouncement} disabled={!canPost} className="gap-2">
              <Send className="h-4 w-4" />
              Post to feed
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {initial.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No posts yet. Be the first to share something with the team!
            </CardContent>
          </Card>
        )}

        {initial.map((post) => {
          const isAuthor = profile?.email === post.author_email;
          const isEditing = editingId === post.id;
          const postAudience = (post.audience ?? "all") as FeedAudience;

          return (
            <Card
              key={post.id}
              className={post.pinned ? "border-primary shadow-sm" : post.is_birthday ? "border-pink-300 bg-pink-50/50" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {post.pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                      {post.is_birthday && <Cake className="h-4 w-4 text-pink-500 shrink-0" />}
                      <span className="font-semibold text-sm">{post.author_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(post.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs gap-1">
                        {postAudience === "all" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        {audienceLabel(post)}
                      </Badge>
                      {post.team_name && postAudience === "team" && (
                        <Badge variant="secondary" className="text-xs">{post.team_name}</Badge>
                      )}
                    </div>
                  </div>
                  {isAuthor && !post.is_birthday && !isEditing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => {
                        setEditingId(post.id);
                        setEditText(post.message);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(post.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.message}</p>
                )}

                {postAudience === "roles" && (post.view_roles?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.view_roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs font-normal">
                        {VOLUNTEER_ROLES.find((r) => r.value === role)?.label ??
                          PLATFORM_ROLES.find((r) => r.value === role)?.label ??
                          role}
                      </Badge>
                    ))}
                  </div>
                )}

                {(post.comments ?? []).length > 0 && (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                    {(post.comments ?? []).map((comment, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium text-xs text-muted-foreground">{comment.author_name}</p>
                        <p>{comment.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={commentTexts[post.id] ?? ""}
                    onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                    placeholder="Write a comment..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addComment(post.id);
                      }
                    }}
                  />
                  <Button size="icon" variant="outline" className="shrink-0" onClick={() => addComment(post.id)}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
