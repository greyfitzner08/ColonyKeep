-- Add colony_support volunteer role enum value (data migration in 052).

ALTER TYPE volunteer_role ADD VALUE IF NOT EXISTS 'colony_support';
