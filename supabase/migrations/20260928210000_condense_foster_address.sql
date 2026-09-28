-- Fold separate city, state, and ZIP into the foster address when that line
-- does not already include them, then drop the extra keys.
update public.adoption_entrance_applications
set answers = (
  (
    answers || jsonb_build_object(
      'location_address',
      case
        when btrim(coalesce(answers->>'location_city', '')) <> ''
          and position(
            lower(btrim(answers->>'location_city')) in lower(coalesce(answers->>'location_address', ''))
          ) > 0
          then btrim(coalesce(answers->>'location_address', ''))
        when btrim(coalesce(answers->>'location_state', '')) <> ''
          and position(
            lower(btrim(answers->>'location_state')) in lower(coalesce(answers->>'location_address', ''))
          ) > 0
          and (
            btrim(coalesce(answers->>'location_zip', '')) = ''
            or position(btrim(answers->>'location_zip') in coalesce(answers->>'location_address', '')) > 0
          )
          then btrim(coalesce(answers->>'location_address', ''))
        else btrim(
          concat_ws(
            ', ',
            nullif(btrim(coalesce(answers->>'location_address', '')), ''),
            nullif(btrim(coalesce(answers->>'location_city', '')), ''),
            nullif(btrim(coalesce(answers->>'location_state', '')), ''),
            nullif(btrim(coalesce(answers->>'location_zip', '')), '')
          )
        )
      end
    )
  ) - 'location_city' - 'location_state' - 'location_zip'
)
where answers is not null
  and (
    answers ? 'location_city'
    or answers ? 'location_state'
    or answers ? 'location_zip'
  );

-- Map a saved store name onto Pet Supermarket (Matthews) or Other.
update public.adoption_entrance_applications
set answers = answers || jsonb_build_object(
  'pet_store_name',
  case
    when position('pet supermarket' in lower(btrim(answers->>'pet_store_name'))) > 0
      then 'pet_supermarket_matthews'
    else 'other'
  end,
  'pet_store_other_name',
  case
    when position('pet supermarket' in lower(btrim(answers->>'pet_store_name'))) > 0
      then coalesce(answers->>'pet_store_other_name', '')
    when btrim(answers->>'pet_store_name') = 'other'
      then coalesce(answers->>'pet_store_other_name', '')
    else btrim(answers->>'pet_store_name')
  end
)
where answers is not null
  and btrim(coalesce(answers->>'pet_store_name', '')) <> ''
  and btrim(answers->>'pet_store_name') not in ('pet_supermarket_matthews', 'other');
