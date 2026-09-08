ALTER TABLE public.hpm_attendance
  ADD COLUMN IF NOT EXISTS lat_out numeric,
  ADD COLUMN IF NOT EXISTS long_out numeric,
  ADD COLUMN IF NOT EXISTS distance_out_meters numeric,
  ADD COLUMN IF NOT EXISTS is_outside_office_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS outside_location_note_out text,
  ADD COLUMN IF NOT EXISTS needs_supervisor_approval boolean DEFAULT false;