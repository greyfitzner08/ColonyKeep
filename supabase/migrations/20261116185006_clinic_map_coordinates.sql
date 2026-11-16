-- Store map coordinates for partner clinics shown on Hotspots.
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS clinic_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS clinic_lng DOUBLE PRECISION;
