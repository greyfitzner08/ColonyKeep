ALTER TABLE public.help_requests
  ADD COLUMN IF NOT EXISTS claimant_needs_review boolean NOT NULL DEFAULT false;
