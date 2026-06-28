-- Merge legacy staff notes (additional_notes) and follow_up_log into history_log.

UPDATE help_requests hr
SET history_log = COALESCE(hr.history_log, '[]'::jsonb)
  || CASE
    WHEN hr.additional_notes IS NOT NULL AND btrim(hr.additional_notes) <> '' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'timestamp', COALESCE(hr.updated_at, hr.created_at, now())::text,
          'action', 'note',
          'actor_email', null,
          'actor_name', 'Legacy staff notes',
          'details', btrim(hr.additional_notes),
          'follow_up', false,
          'highlighted', false,
          'text_color', 'default'
        )
      )
    ELSE '[]'::jsonb
  END
  || COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', COALESCE(elem->>'id', gen_random_uuid()::text),
          'timestamp', COALESCE(elem->>'timestamp', hr.created_at::text),
          'action', 'note',
          'actor_email', NULLIF(btrim(elem->>'author_email'), ''),
          'actor_name', NULLIF(btrim(elem->>'author_name'), ''),
          'details', btrim(elem->>'notes'),
          'follow_up', true,
          'highlighted', false,
          'text_color', 'default'
        )
        ORDER BY elem->>'timestamp'
      )
      FROM jsonb_array_elements(COALESCE(hr.follow_up_log, '[]'::jsonb)) AS elem
      WHERE btrim(COALESCE(elem->>'notes', '')) <> ''
    ),
    '[]'::jsonb
  )
WHERE (hr.additional_notes IS NOT NULL AND btrim(hr.additional_notes) <> '')
   OR jsonb_array_length(COALESCE(hr.follow_up_log, '[]'::jsonb)) > 0;

UPDATE help_requests
SET
  additional_notes = NULL,
  follow_up_log = '[]'::jsonb
WHERE (additional_notes IS NOT NULL AND btrim(additional_notes) <> '')
   OR jsonb_array_length(COALESCE(follow_up_log, '[]'::jsonb)) > 0;
