-- Service catalog on clinics/events and add-on payment tracking on bookings

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS service_catalog JSONB DEFAULT '[]';

ALTER TABLE public_clinic_events
  ADD COLUMN IF NOT EXISTS service_catalog JSONB DEFAULT '[]';

ALTER TABLE public_bookings
  ADD COLUMN IF NOT EXISTS addon_payments JSONB DEFAULT '{}';
