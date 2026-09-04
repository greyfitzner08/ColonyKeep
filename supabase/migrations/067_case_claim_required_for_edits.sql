-- Inquiry and TNVR case workers may only update cases they have claimed.
-- Admins remain unrestricted. Claim/unclaim uses the service-role API.

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
