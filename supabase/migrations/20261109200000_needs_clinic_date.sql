ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS needs_clinic_date boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.help_requests.needs_clinic_date IS
  'Manual flag: case needs a clinic appointment date scheduled.';
