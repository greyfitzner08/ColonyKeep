-- Track reproductive status for female cats at the individual cat level.

ALTER TABLE cats
  ADD COLUMN IF NOT EXISTS female_reproductive_status TEXT
    CHECK (
      female_reproductive_status IS NULL
      OR female_reproductive_status IN (
        'not_pregnant',
        'pregnant',
        'in_heat',
        'lactating',
        'post_partum'
      )
    );
