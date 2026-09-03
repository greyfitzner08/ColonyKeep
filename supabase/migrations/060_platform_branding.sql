-- Organization branding: app name + logo for admins to customize.

CREATE TABLE IF NOT EXISTS platform_branding (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name TEXT NOT NULL DEFAULT 'TNVR Rescue',
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO platform_branding (id, app_name)
VALUES (1, 'TNVR Rescue')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read branding" ON platform_branding;
CREATE POLICY "Anyone can read branding" ON platform_branding
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update branding" ON platform_branding;
CREATE POLICY "Admins update branding" ON platform_branding
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins insert branding" ON platform_branding;
CREATE POLICY "Admins insert branding" ON platform_branding
  FOR INSERT WITH CHECK (is_admin());

CREATE TRIGGER update_platform_branding_updated_at
  BEFORE UPDATE ON platform_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read branding assets" ON storage.objects;
CREATE POLICY "Public read branding assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Admins upload branding assets" ON storage.objects;
CREATE POLICY "Admins upload branding assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'branding' AND is_admin());

DROP POLICY IF EXISTS "Admins update branding assets" ON storage.objects;
CREATE POLICY "Admins update branding assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'branding' AND is_admin());

DROP POLICY IF EXISTS "Admins delete branding assets" ON storage.objects;
CREATE POLICY "Admins delete branding assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'branding' AND is_admin());
