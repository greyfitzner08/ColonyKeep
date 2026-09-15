-- Adoption program: Adoption Specialist interest, training gate, locations, adoptable cats.

ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS 'adoption_specialist';

ALTER TABLE volunteer_applications
  ADD COLUMN IF NOT EXISTS adoption_training BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE volunteer_role_requests
  ADD COLUMN IF NOT EXISTS adoption_training BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO role_descriptions (role_id, label, description, requirements, is_signup_active)
VALUES (
  'adoption_specialist',
  'Adoption Specialist',
  'Manage adoptable cats, foster and pet-store placements, and adoption program records. Requires adoption training before access is granted.',
  ARRAY['liability_waiver_signed', 'policy_signed', 'adoption_training']::text[],
  false
)
ON CONFLICT (role_id) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  is_signup_active = EXCLUDED.is_signup_active;

CREATE TABLE IF NOT EXISTS adoption_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('petstore', 'foster')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  foster_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adoptable_cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_description TEXT,
  sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female', 'unknown')),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'pending', 'adopted', 'hold', 'unavailable')),
  location_id UUID REFERENCES adoption_locations(id) ON DELETE SET NULL,
  spayed_neutered BOOLEAN,
  vaccinated BOOLEAN,
  vaccination_notes TEXT,
  fiv_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (fiv_status IN ('unknown', 'negative', 'positive')),
  felv_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (felv_status IN ('unknown', 'negative', 'positive')),
  fip_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (fip_status IN ('unknown', 'negative', 'positive', 'suspected')),
  medical_notes TEXT,
  personality_notes TEXT,
  notes TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adoption_locations_type ON adoption_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_adoption_locations_active ON adoption_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_adoptable_cats_status ON adoptable_cats(status);
CREATE INDEX IF NOT EXISTS idx_adoptable_cats_location ON adoptable_cats(location_id);

DROP TRIGGER IF EXISTS update_adoption_locations_updated_at ON adoption_locations;
CREATE TRIGGER update_adoption_locations_updated_at
  BEFORE UPDATE ON adoption_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_adoptable_cats_updated_at ON adoptable_cats;
CREATE TRIGGER update_adoptable_cats_updated_at
  BEFORE UPDATE ON adoptable_cats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION has_adoption_specialist_role()
RETURNS BOOLEAN AS $$
  SELECT is_admin()
    OR 'adoption_specialist' = ANY(COALESCE(profile_volunteer_roles(), '{}'::text[]));
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

ALTER TABLE adoption_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoptable_cats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Adoption specialists manage locations" ON adoption_locations;
CREATE POLICY "Adoption specialists manage locations" ON adoption_locations
  FOR ALL USING (has_adoption_specialist_role())
  WITH CHECK (has_adoption_specialist_role());

DROP POLICY IF EXISTS "Adoption specialists manage cats" ON adoptable_cats;
CREATE POLICY "Adoption specialists manage cats" ON adoptable_cats
  FOR ALL USING (has_adoption_specialist_role())
  WITH CHECK (has_adoption_specialist_role());
