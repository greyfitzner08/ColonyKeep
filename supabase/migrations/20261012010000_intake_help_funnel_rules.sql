-- Admin-configured post-submit resources for the public inquiry form,
-- matched to "How you can help" Yes/No answers.
ALTER TABLE platform_branding
  ADD COLUMN IF NOT EXISTS intake_help_funnel_rules JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN platform_branding.intake_help_funnel_rules IS
  'Ordered rules that pick post-submit resource copy/links from How you can help answers.';
