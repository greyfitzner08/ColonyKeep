-- Library sections, document uploads, volunteer role tracking

ALTER TABLE library_documents
  ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'General';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS volunteer_roles TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS volunteer_role_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES volunteer_applications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  requested_roles TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  tnvr_certificate_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
  tnvr_certificate_url TEXT,
  intake_training BOOLEAN NOT NULL DEFAULT FALSE,
  shadow_completed BOOLEAN NOT NULL DEFAULT FALSE,
  liability_waiver_signed BOOLEAN NOT NULL DEFAULT FALSE,
  policy_signed BOOLEAN NOT NULL DEFAULT FALSE,
  event_crash_course BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE volunteer_role_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read role requests" ON volunteer_role_requests;
CREATE POLICY "Staff read role requests" ON volunteer_role_requests FOR SELECT USING (is_staff() OR is_admin());

DROP POLICY IF EXISTS "Users read own role requests" ON volunteer_role_requests;
CREATE POLICY "Users read own role requests" ON volunteer_role_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND lower(p.email) = lower(email))
);

DROP POLICY IF EXISTS "Users create own role requests" ON volunteer_role_requests;
CREATE POLICY "Users create own role requests" ON volunteer_role_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND lower(p.email) = lower(email))
);

DROP POLICY IF EXISTS "Admins manage role requests" ON volunteer_role_requests;
CREATE POLICY "Admins manage role requests" ON volunteer_role_requests FOR ALL USING (is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('library-documents', 'library-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins upload library documents" ON storage.objects;
CREATE POLICY "Admins upload library documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'library-documents' AND is_admin()
);

DROP POLICY IF EXISTS "Public read library documents" ON storage.objects;
CREATE POLICY "Public read library documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'library-documents'
);

DROP POLICY IF EXISTS "Admins delete library documents" ON storage.objects;
CREATE POLICY "Admins delete library documents" ON storage.objects FOR DELETE USING (
  bucket_id = 'library-documents' AND is_admin()
);

CREATE TRIGGER update_volunteer_role_requests_updated_at
  BEFORE UPDATE ON volunteer_role_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
