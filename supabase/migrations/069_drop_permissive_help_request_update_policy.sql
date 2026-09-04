-- Remove legacy permissive policies that OR'd with claim-gated staff policies.
-- Postgres ORs same-command policies, so USING (true) let any signed-in user edit
-- unclaimed cases despite "Staff can update help requests".

DROP POLICY IF EXISTS "Authenticated users can update help requests" ON help_requests;
DROP POLICY IF EXISTS "Authenticated users can delete help requests" ON help_requests;

-- Keep a single staff update policy that requires claim (admins exempt).
DROP POLICY IF EXISTS "Staff can update help requests" ON help_requests;
CREATE POLICY "Staff can update help requests" ON help_requests FOR UPDATE
USING (
  is_admin()
  OR (
    is_case_worker()
    AND claimed_by_email IS NOT NULL
    AND lower(claimed_by_email) = lower(COALESCE(get_user_email(), ''))
  )
)
WITH CHECK (
  is_admin()
  OR (
    is_case_worker()
    AND claimed_by_email IS NOT NULL
    AND lower(claimed_by_email) = lower(COALESCE(get_user_email(), ''))
  )
);
