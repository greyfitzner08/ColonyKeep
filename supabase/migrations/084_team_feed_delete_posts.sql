-- Authors can delete their own team feed posts. Admins can delete any post.

DROP POLICY IF EXISTS "Authors or admins delete announcements" ON team_announcements;
CREATE POLICY "Authors or admins delete announcements" ON team_announcements
FOR DELETE
USING (
  is_admin()
  OR lower(author_email) = lower(COALESCE(get_user_email(), ''))
);
