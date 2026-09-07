CREATE TABLE IF NOT EXISTS public.hpm_outside_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.hpm_companies(id) on delete cascade,
  employee_id uuid not null references public.hpm_employees(id) on delete cascade,
  supervisor_employee_id uuid references public.hpm_employees(id) on delete set null,
  action text not null,
  lat text,
  long text,
  distance_meters numeric,
  location_note text,
  task_status text,
  photo_url text,
  stage text not null default 'HRD',
  status text not null default 'PENDING',
  decision_note text,
  decided_at timestamptz,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hpm_outside_requests TO anon, authenticated;
GRANT ALL ON public.hpm_outside_requests TO service_role;

ALTER TABLE public.hpm_outside_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_full_access" ON public.hpm_outside_requests;
CREATE POLICY "app_full_access" ON public.hpm_outside_requests
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);