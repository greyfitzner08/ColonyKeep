-- Clinics: check-in details, library documents, booking holds

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS check_in_details TEXT;

ALTER TABLE public_bookings
  ADD COLUMN IF NOT EXISTS hold_session_id UUID;

CREATE INDEX IF NOT EXISTS idx_public_bookings_hold_session
  ON public_bookings (hold_session_id)
  WHERE hold_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS library_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  view_roles TEXT[] NOT NULL DEFAULT ARRAY['admin']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE library_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read library documents" ON library_documents;
CREATE POLICY "Staff read library documents" ON library_documents FOR SELECT USING (
  is_active = true AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role::TEXT = ANY (view_roles)
    )
  )
);

DROP POLICY IF EXISTS "Admins manage library documents" ON library_documents;
CREATE POLICY "Admins manage library documents" ON library_documents FOR ALL USING (is_admin());

CREATE TRIGGER update_library_documents_updated_at
  BEFORE UPDATE ON library_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
