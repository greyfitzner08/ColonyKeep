-- Align author update policy with delete: case-insensitive email match.
DROP POLICY IF EXISTS "Authors update announcements" ON team_announcements;
CREATE POLICY "Authors update announcements" ON team_announcements
FOR UPDATE
USING (
  is_admin()
  OR lower(author_email) = lower(COALESCE(get_user_email(), ''))
)
WITH CHECK (
  is_admin()
  OR lower(author_email) = lower(COALESCE(get_user_email(), ''))
);
