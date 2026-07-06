-- Point clinic-coordination volunteer permission checks at colony_support.

CREATE OR REPLACE FUNCTION has_clinic_coordination_volunteer_role()
RETURNS BOOLEAN AS $$
  SELECT 'colony_support' = ANY(profile_volunteer_roles())
    OR 'clinic_coordination' = ANY(profile_volunteer_roles());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
