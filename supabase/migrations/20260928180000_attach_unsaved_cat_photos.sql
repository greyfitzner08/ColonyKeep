-- Uploads were stored, but the cat row never received the public URL.
-- Point each cat that is still missing a photo at its newest stored file.

UPDATE adoptable_cats AS cat
SET profile_photo_url =
  'https://bsepgefqlmxmgukvifqy.supabase.co/storage/v1/object/public/adoption-photos/' || latest.name
FROM (
  SELECT DISTINCT ON (split_part(name, '/', 1))
    split_part(name, '/', 1) AS cat_id,
    name
  FROM storage.objects
  WHERE bucket_id = 'adoption-photos'
    AND position('/' IN name) > 0
  ORDER BY split_part(name, '/', 1), created_at DESC
) AS latest
WHERE cat.id::text = latest.cat_id
  AND cat.profile_photo_url IS NULL;
