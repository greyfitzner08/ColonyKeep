-- Location is a foster home, plus a pet store only when the cat is also there.
-- Type and the old Other description are no longer stored.

UPDATE adoption_entrance_applications
SET answers = answers - 'location_type' - 'location_other'
WHERE answers ? 'location_type' OR answers ? 'location_other';
