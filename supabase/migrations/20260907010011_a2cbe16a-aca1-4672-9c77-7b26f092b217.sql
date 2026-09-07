DO $$
DECLARE keep uuid;
BEGIN
  SELECT id INTO keep FROM public.hpm_companies ORDER BY created_at LIMIT 1;
  UPDATE public.hpm_employees SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_staff_users SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_attendance SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_payrolls SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_job_vacancies SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_applicants SET company_id = keep WHERE company_id <> keep;
  UPDATE public.hpm_admin_users SET company_id = keep WHERE company_id <> keep;
  DELETE FROM public.hpm_companies WHERE id <> keep;

  INSERT INTO public.hpm_admin_users (company_id, user_id, pin_hash, full_name, phone_wa, role, is_active)
  SELECT keep, 'AUROR62710', '4cb3863c90faac07b52bd26103220f3c08665413cda5cc3394bfc0f309344d44', 'Super Admin Aurora', '08211307710', 'SUPER_ADMIN', true
  WHERE NOT EXISTS (SELECT 1 FROM public.hpm_admin_users WHERE upper(user_id) = 'AUROR62710');
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hpm_companies_singleton ON public.hpm_companies ((true));
CREATE UNIQUE INDEX IF NOT EXISTS hpm_admin_users_user_id_key ON public.hpm_admin_users (upper(user_id));