-- Remember pairs admins marked as “not a duplicate / keep both”
-- so they stop showing up in duplicate review scans.

CREATE TABLE IF NOT EXISTS public.dismissed_duplicate_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL
    CHECK (entity_type IN ('profile', 'application')),
  left_id uuid NOT NULL,
  right_id uuid NOT NULL,
  dismissed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dismissed_duplicate_pairs_ordered CHECK (left_id < right_id),
  CONSTRAINT dismissed_duplicate_pairs_unique UNIQUE (entity_type, left_id, right_id)
);

CREATE INDEX IF NOT EXISTS dismissed_duplicate_pairs_entity_idx
  ON public.dismissed_duplicate_pairs (entity_type);

ALTER TABLE public.dismissed_duplicate_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage dismissed duplicates" ON public.dismissed_duplicate_pairs;
CREATE POLICY "Admins manage dismissed duplicates" ON public.dismissed_duplicate_pairs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.dismissed_duplicate_pairs IS
  'Admin-dismissed likely-duplicate pairs (profile or volunteer application IDs).';
