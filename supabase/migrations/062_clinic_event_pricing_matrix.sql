-- Per-event pricing: flat per cat, cat-count matrix, or fully sponsored (free).

ALTER TABLE public_clinic_events
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'flat'
    CHECK (pricing_mode IN ('flat', 'matrix', 'sponsored')),
  ADD COLUMN IF NOT EXISTS pricing_matrix JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public_clinic_events.pricing_mode IS
  'flat = base_price per cat; matrix = total by cat count; sponsored = free package price';
COMMENT ON COLUMN public_clinic_events.pricing_matrix IS
  'Array of { cats: number, total_price: number } used when pricing_mode = matrix';
