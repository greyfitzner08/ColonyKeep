-- Pet store placement is approved on the location record.
-- Keep an existing store visible by marking it approved, then drop the old yes/no.

UPDATE adoption_entrance_applications
SET answers = (answers - 'at_pet_store') || jsonb_build_object('approved_pet_store', 'yes')
WHERE COALESCE(answers->>'approved_pet_store', '') <> 'yes'
  AND (
    answers->>'at_pet_store' = 'yes'
    OR NULLIF(BTRIM(COALESCE(answers->>'pet_store_name', '')), '') IS NOT NULL
  );

UPDATE adoption_entrance_applications
SET answers = answers - 'at_pet_store'
WHERE answers ? 'at_pet_store';
