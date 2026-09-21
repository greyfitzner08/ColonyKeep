-- Saved custom / pivot reports for the Reports page (admin).

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_reports_updated_at_idx
  ON public.saved_reports (updated_at DESC);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage saved reports" ON public.saved_reports;
CREATE POLICY "Admins manage saved reports"
  ON public.saved_reports
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
