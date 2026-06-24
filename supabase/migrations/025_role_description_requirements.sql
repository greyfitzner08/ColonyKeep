-- Per-role volunteer training requirements (admin-configurable in Role Descriptions).

ALTER TABLE role_descriptions
ADD COLUMN IF NOT EXISTS requirements text[] NOT NULL DEFAULT '{}';

UPDATE role_descriptions
SET requirements = ARRAY['liability_waiver_signed', 'policy_signed', 'intake_training']::text[]
WHERE role_id = 'intake_representative';

UPDATE role_descriptions
SET requirements = ARRAY['liability_waiver_signed', 'policy_signed', 'tnvr_certificate_uploaded', 'shadow_completed']::text[]
WHERE role_id IN ('trapper', 'trap_loaner', 'transporter', 'recovery');

UPDATE role_descriptions
SET requirements = ARRAY['liability_waiver_signed', 'policy_signed', 'event_crash_course']::text[]
WHERE role_id = 'event_volunteer';

UPDATE role_descriptions
SET requirements = ARRAY['liability_waiver_signed', 'policy_signed']::text[]
WHERE role_id IN (
  'grant_writing',
  'social_media',
  'snack_patrol',
  'crafter',
  'story_writer',
  'community_outreach',
  'other'
);

-- Creative roles with no training prerequisites by default.
UPDATE role_descriptions
SET requirements = ARRAY[]::text[]
WHERE role_id IN ('photographer', 'videographer');
