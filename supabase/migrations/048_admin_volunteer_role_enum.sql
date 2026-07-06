-- Allow admins to add new volunteer_role enum values via API (validated slug only).

CREATE OR REPLACE FUNCTION admin_add_volunteer_role(new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_role IS NULL OR new_role !~ '^[a-z][a-z0-9_]{0,48}$' THEN
    RAISE EXCEPTION 'Invalid volunteer role id';
  END IF;

  EXECUTE format('ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS %I', new_role);
END;
$$;

REVOKE ALL ON FUNCTION admin_add_volunteer_role(text) FROM PUBLIC;
