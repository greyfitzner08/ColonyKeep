export const TEAM_FEED_REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🙌", "🙏", "😮", "😢"] as const;

export type TeamFeedReactionEmoji = (typeof TEAM_FEED_REACTION_EMOJIS)[number];

export interface TeamFeedReaction {
  emoji: string;
  author_email: string;
  author_name: string;
  created_at: string;
}

export function isAllowedTeamFeedReaction(emoji: string): emoji is TeamFeedReactionEmoji {
  return (TEAM_FEED_REACTION_EMOJIS as readonly string[]).includes(emoji);
}

export function normalizeTeamFeedReactions(value: unknown): TeamFeedReaction[] {
  if (!Array.isArray(value)) return [];
  const reactions: TeamFeedReaction[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const emoji = typeof raw.emoji === "string" ? raw.emoji.trim() : "";
    const author_email =
      typeof raw.author_email === "string" ? raw.author_email.trim().toLowerCase() : "";
    const author_name =
      typeof raw.author_name === "string" && raw.author_name.trim()
        ? raw.author_name.trim()
        : author_email;
    const created_at =
      typeof raw.created_at === "string" && raw.created_at.trim()
        ? raw.created_at
        : new Date().toISOString();
    if (!emoji || !author_email || !isAllowedTeamFeedReaction(emoji)) continue;
    reactions.push({ emoji, author_email, author_name, created_at });
  }
  return reactions;
}

/** Toggle: add if missing, remove if the same user already reacted with that emoji. */
export function toggleTeamFeedReaction(
  reactions: TeamFeedReaction[],
  input: { emoji: string; author_email: string; author_name: string }
): TeamFeedReaction[] {
  if (!isAllowedTeamFeedReaction(input.emoji)) return reactions;
  const email = input.author_email.trim().toLowerCase();
  if (!email) return reactions;

  const existingIndex = reactions.findIndex(
    (reaction) =>
      reaction.emoji === input.emoji && reaction.author_email.toLowerCase() === email
  );
  if (existingIndex >= 0) {
    return reactions.filter((_, index) => index !== existingIndex);
  }

  return [
    ...reactions,
    {
      emoji: input.emoji,
      author_email: email,
      author_name: input.author_name.trim() || email,
      created_at: new Date().toISOString(),
    },
  ];
}

export function reactionGroupsForViewer(
  reactions: TeamFeedReaction[],
  viewerEmail: string | null | undefined
) {
  const email = viewerEmail?.trim().toLowerCase() ?? "";
  const map = new Map<string, { count: number; names: string[]; reactedByMe: boolean }>();

  for (const reaction of reactions) {
    const current = map.get(reaction.emoji) ?? {
      count: 0,
      names: [],
      reactedByMe: false,
    };
    current.count += 1;
    current.names.push(reaction.author_name);
    if (email && reaction.author_email.toLowerCase() === email) {
      current.reactedByMe = true;
    }
    map.set(reaction.emoji, current);
  }

  return TEAM_FEED_REACTION_EMOJIS.filter((emoji) => map.has(emoji)).map((emoji) => {
    const group = map.get(emoji)!;
    return {
      emoji,
      count: group.count,
      reactedByMe: group.reactedByMe,
      names: group.names,
    };
  });
}
