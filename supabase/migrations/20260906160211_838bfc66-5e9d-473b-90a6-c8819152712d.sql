DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hpm_admin_users','hpm_applicants','hpm_attendance','hpm_companies','hpm_employees','hpm_job_vacancies','hpm_otp_codes','hpm_payrolls','hpm_pin_resets','hpm_staff_users']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "app_full_access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "app_full_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;