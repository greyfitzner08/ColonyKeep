-- Keep volunteer signup role options aligned with the platform role catalog.

INSERT INTO role_descriptions (role_id, label, description) VALUES
  (
    'youth_volunteer',
    'Youth Volunteer (under 18)',
    'Support TNVR events and community activities in age-appropriate volunteer roles.'
  )
ON CONFLICT (role_id) DO NOTHING;
