-- Default newly created auth users to the volunteer platform role.
-- Profiles were previously inserted without a role, so manual account creation
-- left users as "No role" until an admin set one.
-- Note: profiles.role is text in production (not user_role enum).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'volunteer'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(NULLIF(profiles.role, ''), EXCLUDED.role);

  RETURN NEW;
END;
$$;

-- Backfill existing profiles that were created without a platform role.
UPDATE public.profiles
SET role = 'volunteer'
WHERE role IS NULL OR btrim(role) = '';
