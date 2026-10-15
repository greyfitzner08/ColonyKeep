import type { TeamAnnouncement } from "@/lib/types";

/** Match Team Feed posts by author, body, team, or comment text. */
export function matchesTeamFeedSearch(post: TeamAnnouncement, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const fields = [
    post.author_name,
    post.author_email,
    post.message,
    post.team_name,
    post.birthday_person_name,
  ];

  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) return true;
  }

  for (const comment of post.comments ?? []) {
    if (comment.author_name?.toLowerCase().includes(q)) return true;
    if (comment.text?.toLowerCase().includes(q)) return true;
  }

  return false;
}

export function filterTeamFeedPosts(
  posts: TeamAnnouncement[],
  query: string
): TeamAnnouncement[] {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((post) => matchesTeamFeedSearch(post, q));
}
