-- Split the old combined breed description into the Breed field
-- so existing rescue answers are not dropped on the next save.

UPDATE adoption_entrance_applications
SET answers = (answers - 'description_breed')
  || jsonb_build_object('breed', answers ->> 'description_breed')
WHERE coalesce(answers ->> 'description_breed', '') <> ''
  AND coalesce(answers ->> 'breed', '') = '';
