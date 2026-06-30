-- Multiple contacts per community partner organization.

CREATE TABLE community_partner_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES community_partners(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_partner_contacts_partner
  ON community_partner_contacts (partner_id, sort_order);

CREATE INDEX idx_community_partner_contacts_email
  ON community_partner_contacts (email)
  WHERE email IS NOT NULL;

CREATE TRIGGER update_community_partner_contacts_updated_at
  BEFORE UPDATE ON community_partner_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO community_partner_contacts (
  partner_id,
  name,
  title,
  email,
  phone,
  is_primary,
  sort_order
)
SELECT
  id,
  contact_name,
  contact_title,
  contact_email,
  contact_phone,
  TRUE,
  0
FROM community_partners
WHERE NULLIF(TRIM(contact_name), '') IS NOT NULL
   OR NULLIF(TRIM(contact_email), '') IS NOT NULL
   OR NULLIF(TRIM(contact_phone), '') IS NOT NULL;

ALTER TABLE community_partners
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_title,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

ALTER TABLE community_partner_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community partner contacts access" ON community_partner_contacts
  FOR ALL USING (can_manage_community_partners());
