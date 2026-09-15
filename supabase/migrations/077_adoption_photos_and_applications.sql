-- Adoptable cat profile photos + public adoption applications.

ALTER TABLE adoptable_cats
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

CREATE TABLE IF NOT EXISTS adoption_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'denied', 'withdrawn')),
  cat_id UUID REFERENCES adoptable_cats(id) ON DELETE SET NULL,
  cat_interest_name TEXT NOT NULL,
  applicant_first_name TEXT NOT NULL,
  applicant_last_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  staff_notes TEXT,
  additional_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adoption_applications_status ON adoption_applications(status);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_created ON adoption_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_email ON adoption_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_cat ON adoption_applications(cat_id);

DROP TRIGGER IF EXISTS update_adoption_applications_updated_at ON adoption_applications;
CREATE TRIGGER update_adoption_applications_updated_at
  BEFORE UPDATE ON adoption_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE adoption_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Adoption specialists manage applications" ON adoption_applications;
CREATE POLICY "Adoption specialists manage applications" ON adoption_applications
  FOR ALL USING (has_adoption_specialist_role())
  WITH CHECK (has_adoption_specialist_role());

DROP POLICY IF EXISTS "Public can submit adoption applications" ON adoption_applications;
CREATE POLICY "Public can submit adoption applications" ON adoption_applications
  FOR INSERT WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('adoption-photos', 'adoption-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read adoption photos" ON storage.objects;
CREATE POLICY "Public read adoption photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'adoption-photos');

DROP POLICY IF EXISTS "Adoption specialists upload photos" ON storage.objects;
CREATE POLICY "Adoption specialists upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'adoption-photos' AND has_adoption_specialist_role());

DROP POLICY IF EXISTS "Adoption specialists update photos" ON storage.objects;
CREATE POLICY "Adoption specialists update photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'adoption-photos' AND has_adoption_specialist_role());

DROP POLICY IF EXISTS "Adoption specialists delete photos" ON storage.objects;
CREATE POLICY "Adoption specialists delete photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'adoption-photos' AND has_adoption_specialist_role());
