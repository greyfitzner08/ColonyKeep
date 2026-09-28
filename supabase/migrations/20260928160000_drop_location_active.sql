-- Active is no longer a location field. Drop it from saved answers.

UPDATE adoption_entrance_applications
SET answers = answers - 'location_active'
WHERE answers ? 'location_active';
