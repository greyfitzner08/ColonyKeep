-- Cases with a person assigned should use status "claimed", not "routed_to_trap_team".

UPDATE help_requests
SET status = 'claimed',
    updated_at = NOW()
WHERE status = 'routed_to_trap_team'
  AND (
    NULLIF(TRIM(claimed_by_email), '') IS NOT NULL
    OR NULLIF(TRIM(claimed_by_name), '') IS NOT NULL
    OR NULLIF(TRIM(assigned_to), '') IS NOT NULL
  );
