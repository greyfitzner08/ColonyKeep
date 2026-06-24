-- Team feed audience targeting + onboarding documents in library

ALTER TABLE team_announcements
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';

ALTER TABLE team_announcements
  ADD COLUMN IF NOT EXISTS view_roles TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO library_documents (title, description, file_url, section, view_roles, is_active)
SELECT
  'Liability Waiver',
  'Required for all volunteers. Read before submitting your application.',
  'https://www.notion.so/placeholder-liability-waiver',
  'Volunteer Onboarding',
  ARRAY['admin', 'inquiry_team', 'trap_team_lead', 'clinic_coordination', 'volunteer']::TEXT[],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM library_documents WHERE title = 'Liability Waiver' AND section = 'Volunteer Onboarding'
);

INSERT INTO library_documents (title, description, file_url, section, view_roles, is_active)
SELECT
  'Policy & Procedures',
  'Core organization policies. Required reading for all volunteers.',
  'https://zealous-sherbet-f24.notion.site/Core-Policies-309a52ca229f817381b3cb6b68e5fadb',
  'Volunteer Onboarding',
  ARRAY['admin', 'inquiry_team', 'trap_team_lead', 'clinic_coordination', 'volunteer']::TEXT[],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM library_documents WHERE title = 'Policy & Procedures' AND section = 'Volunteer Onboarding'
);
