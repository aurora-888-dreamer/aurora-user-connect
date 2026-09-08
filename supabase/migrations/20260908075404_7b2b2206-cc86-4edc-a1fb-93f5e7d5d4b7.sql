ALTER TABLE public.hpm_attendance
  ALTER COLUMN lat_out TYPE text USING lat_out::text,
  ALTER COLUMN long_out TYPE text USING long_out::text;

ALTER TABLE public.hpm_employees
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS resign_date date;

ALTER TABLE public.hpm_companies
  ADD COLUMN IF NOT EXISTS allow_outside_attendance boolean NOT NULL DEFAULT false;