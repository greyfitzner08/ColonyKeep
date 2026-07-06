-- Fix enum add syntax: use string literals and skip values that already exist.

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

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'volunteer_role'
      AND e.enumlabel = new_role
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TYPE volunteer_role ADD VALUE %L', new_role);
END;
$$;

REVOKE ALL ON FUNCTION admin_add_volunteer_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_volunteer_role(text) TO service_role;
