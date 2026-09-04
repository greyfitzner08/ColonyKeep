-- Security hardening: constrain shift updates, close overly-open RLS, tighten RPC grants.

-- 1) Volunteers must claim/unclaim via the API (service role). Drop broad client UPDATE.
DROP POLICY IF EXISTS "Volunteers update shift signup" ON public.shifts;
DROP POLICY IF EXISTS "Volunteers update shifts signup" ON public.shifts;

-- Defense in depth: if a non-service client somehow updates, only signup/waitlist may change.
CREATE OR REPLACE FUNCTION public.enforce_shift_signup_only_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.event_name IS DISTINCT FROM OLD.event_name
    OR NEW.position_name IS DISTINCT FROM OLD.position_name
    OR NEW.shift_type IS DISTINCT FROM OLD.shift_type
    OR NEW.required_roles IS DISTINCT FROM OLD.required_roles
    OR NEW.date IS DISTINCT FROM OLD.date
    OR NEW.start_time IS DISTINCT FROM OLD.start_time
    OR NEW.end_time IS DISTINCT FROM OLD.end_time
    OR NEW.location IS DISTINCT FROM OLD.location
    OR NEW.team_ids IS DISTINCT FROM OLD.team_ids
    OR NEW.volunteers_needed IS DISTINCT FROM OLD.volunteers_needed
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only signup and waitlist fields may be updated on shifts'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shifts_signup_only_update ON public.shifts;
CREATE TRIGGER shifts_signup_only_update
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_shift_signup_only_update();

COMMENT ON FUNCTION public.enforce_shift_signup_only_update() IS
  'Prevents non-admin clients from changing shift metadata; signup/waitlist only.';

-- 2) Remove permissive SELECT that OR'd with the real case-worker policy and exposed all cases.
DROP POLICY IF EXISTS "Authenticated users can view help requests" ON public.help_requests;

-- Keep a single intentional public insert policy for colony intake.
DROP POLICY IF EXISTS "Anyone can insert help requests" ON public.help_requests;

-- Profiles are created by the auth trigger / service role — not open inserts.
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;

-- 3) Revoke EXECUTE on admin-only / trigger-only SECURITY DEFINER functions from API roles.
REVOKE ALL ON FUNCTION public.admin_add_volunteer_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_add_volunteer_role(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_volunteer_role(text) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Helper predicates used by RLS: authenticated needs them; anon does not.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.is_case_worker() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_case_worker() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_case_worker() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.get_user_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_email() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_email() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.get_user_team_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_team_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_team_id() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.profile_volunteer_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_volunteer_roles() FROM anon;
GRANT EXECUTE ON FUNCTION public.profile_volunteer_roles() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.has_clinic_coordination_volunteer_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_clinic_coordination_volunteer_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_clinic_coordination_volunteer_role() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.can_manage_appointments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_appointments() FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_appointments() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.can_manage_community_partners() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_community_partners() FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_community_partners() TO authenticated, service_role, postgres;

REVOKE ALL ON FUNCTION public.can_manage_trap_equipment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_trap_equipment() FROM anon;
GRANT EXECUTE ON FUNCTION public.can_manage_trap_equipment() TO authenticated, service_role, postgres;

-- Public intake RPC must remain callable without login.
REVOKE ALL ON FUNCTION public.create_community_help_request(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_help_request(jsonb) TO anon, authenticated, service_role, postgres;

-- 4) Pin search_path on common updated_at helpers (advisor WARN).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
