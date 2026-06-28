-- Routed trap-queue cases should not keep inquiry-team claim fields.
-- Migration 017 previously flipped these to status "claimed" instead.

UPDATE help_requests
SET
  claimed_by_email = NULL,
  claimed_by_name = NULL,
  assigned_to = NULL,
  updated_at = NOW()
WHERE status = 'routed_to_trap_team'
  AND (
    NULLIF(TRIM(claimed_by_email), '') IS NOT NULL
    OR NULLIF(TRIM(claimed_by_name), '') IS NOT NULL
    OR NULLIF(TRIM(assigned_to), '') IS NOT NULL
  );
