-- Cats submitted to the adoption program for specialist approval.

CREATE TABLE IF NOT EXISTS adoption_entrance_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  cat_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  denial_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  adoptable_cat_id UUID REFERENCES adoptable_cats(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adoption_entrance_status
  ON adoption_entrance_applications(status);
CREATE INDEX IF NOT EXISTS idx_adoption_entrance_created
  ON adoption_entrance_applications(created_at DESC);

DROP TRIGGER IF EXISTS update_adoption_entrance_applications_updated_at
  ON adoption_entrance_applications;
CREATE TRIGGER update_adoption_entrance_applications_updated_at
  BEFORE UPDATE ON adoption_entrance_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE adoption_entrance_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Adoption specialists manage entrance applications"
  ON adoption_entrance_applications;
CREATE POLICY "Adoption specialists manage entrance applications"
  ON adoption_entrance_applications
  FOR ALL
  USING (has_adoption_specialist_role())
  WITH CHECK (has_adoption_specialist_role());
