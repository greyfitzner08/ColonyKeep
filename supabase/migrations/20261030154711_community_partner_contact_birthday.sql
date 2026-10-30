ALTER TABLE community_partner_contacts
  ADD COLUMN IF NOT EXISTS birthday DATE;

COMMENT ON COLUMN community_partner_contacts.birthday IS
  'Optional contact birthday. Month and day appear on the team birthday calendar as Name | Organization.';
