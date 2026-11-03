-- Restrict some TNVR users to cases assigned/claimed to them only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trap_queue_assigned_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.trap_queue_assigned_only IS
  'When true, TNVR Team users only see My Cases (admin-assigned/claimed). They cannot browse All Cases or self-claim from the queue.';
