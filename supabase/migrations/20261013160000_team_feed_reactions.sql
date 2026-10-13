-- Emoji reactions on team feed posts (array of { emoji, author_email, author_name, created_at }).
ALTER TABLE team_announcements
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN team_announcements.reactions IS
  'Emoji reactions: [{ emoji, author_email, author_name, created_at }].';
