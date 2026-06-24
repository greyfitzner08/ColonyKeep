-- Track when newsletter opt-in emails have been added to the external mailing list.

ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS newsletter_list_added_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_help_requests_newsletter_pending
  ON help_requests (created_at DESC)
  WHERE consent_communications = TRUE
    AND newsletter_list_added_at IS NULL
    AND contact_email IS NOT NULL
    AND contact_email <> '';
