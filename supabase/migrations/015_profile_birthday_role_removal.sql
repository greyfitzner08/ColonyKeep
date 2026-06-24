-- Profile birthdays for team feed / banners; role removal requests

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthday DATE;

UPDATE profiles p
SET birthday = va.birthday
FROM volunteer_applications va
WHERE lower(va.email) = lower(p.email)
  AND va.status = 'approved'
  AND va.birthday IS NOT NULL
  AND p.birthday IS NULL;

ALTER TABLE volunteer_role_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'add';

ALTER TABLE volunteer_role_requests
  DROP CONSTRAINT IF EXISTS volunteer_role_requests_request_type_check;

ALTER TABLE volunteer_role_requests
  ADD CONSTRAINT volunteer_role_requests_request_type_check
  CHECK (request_type IN ('add', 'remove'));
