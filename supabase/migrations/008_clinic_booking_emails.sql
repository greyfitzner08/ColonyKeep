-- Waitlist status and editable booking email copy on clinic events

ALTER TYPE public_booking_status ADD VALUE IF NOT EXISTS 'waitlist';

ALTER TABLE public_clinic_events
  ADD COLUMN IF NOT EXISTS pending_email_message TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_email_message TEXT;
