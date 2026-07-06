-- Migrate volunteer role clinic_coordination → colony_support (Colony Support).

UPDATE role_descriptions
SET role_id = 'colony_support'
WHERE role_id = 'clinic_coordination';

UPDATE profiles
SET volunteer_roles = array_replace(volunteer_roles, 'clinic_coordination', 'colony_support')
WHERE volunteer_roles @> ARRAY['clinic_coordination']::text[];

UPDATE volunteer_applications
SET roles_requested = array_replace(roles_requested::text[], 'clinic_coordination', 'colony_support')::volunteer_role[]
WHERE 'clinic_coordination' = ANY(roles_requested);

UPDATE volunteer_role_requests
SET requested_roles = array_replace(requested_roles, 'clinic_coordination', 'colony_support')
WHERE requested_roles @> ARRAY['clinic_coordination']::text[];
