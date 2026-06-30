-- Community partners: local businesses, rescues, grantors, and other external organizations.

CREATE TYPE community_partner_organization_type AS ENUM (
  'local_business',
  'rescue',
  'grantor',
  'sponsor',
  'municipal',
  'media',
  'other'
);

CREATE TYPE community_partner_status AS ENUM (
  'active',
  'prospect',
  'past',
  'do_not_contact'
);

CREATE TABLE community_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_type community_partner_organization_type NOT NULL DEFAULT 'other',
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  partnership_status community_partner_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_partners_name ON community_partners (name);
CREATE INDEX idx_community_partners_type ON community_partners (organization_type);
CREATE INDEX idx_community_partners_status ON community_partners (partnership_status);

CREATE TRIGGER update_community_partners_updated_at
  BEFORE UPDATE ON community_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION can_manage_community_partners()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR get_user_role() = 'inquiry_team'
    OR profile_volunteer_roles() && ARRAY[
      'community_outreach',
      'grant_writing',
      'social_media'
    ]::TEXT[];
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

ALTER TABLE community_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community partners access" ON community_partners
  FOR ALL USING (can_manage_community_partners());
