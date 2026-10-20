ALTER TYPE community_partner_organization_type ADD VALUE IF NOT EXISTS 'gcaa';

ALTER TABLE community_partners
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phones TEXT[] NOT NULL DEFAULT '{}';

UPDATE community_partners
SET emails = ARRAY[email]
WHERE coalesce(email, '') <> ''
  AND coalesce(array_length(emails, 1), 0) = 0;

UPDATE community_partners
SET phones = ARRAY[phone]
WHERE coalesce(phone, '') <> ''
  AND coalesce(array_length(phones, 1), 0) = 0;

COMMENT ON COLUMN community_partners.emails IS
  'One or more organization emails. The first value is also stored in email.';
COMMENT ON COLUMN community_partners.phones IS
  'One or more organization phones. The first value is also stored in phone.';
