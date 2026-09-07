import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";

export type PermissionRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR";
export type PermissionModule = "hris" | "finance" | "ats";

export const PERMISSION_ROLES: PermissionRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];

/** The canonical menu list per module — Top Admin toggles access to exactly these. Keep in sync with each module's actual tabs/sections. */
export const MODULE_MENUS: Record<PermissionModule, { key: string; label: string }[]> = {
  hris: [
    { key: "employees", label: "Database Karyawan" },
    { key: "locations", label: "Lokasi" },
    { key: "shifts", label: "Jam Kerja" },
    { key: "attendance", label: "Absensi GPS" },
    { key: "final-report", label: "Laporan Akhir" },
    { key: "outside-requests", label: "Pengajuan Absensi Luar" },
    { key: "staff-accounts", label: "Akun Staff" },
    { key: "announcements", label: "Pengumuman" },
    { key: "contacts", label: "Contact List" },
    { key: "chat", label: "Chat" },
    { key: "payroll", label: "Payroll" },
  ],
  finance: [
    { key: "salary-view", label: "Data Gaji & Tunjangan Karyawan" },
    { key: "contacts", label: "Contact List" },
    { key: "chat", label: "Chat" },
  ],
  ats: [
    { key: "vacancies", label: "Job Board" },
    { key: "pipeline", label: "Pipeline Kandidat" },
    { key: "contacts", label: "Contact List" },
    { key: "chat", label: "Chat" },
  ],
};

/** role:menuKey -> allowed. A key absent from the map means "allowed" (default open until Top Admin restricts it). */
export type PermissionMap = Record<string, boolean>;

export async function getMenuPermissions(module: PermissionModule): Promise<PermissionMap> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_menu_permissions")
    .select("role, menu_key, allowed")
    .eq("company_id", companyId)
    .eq("module", module);
  if (error) throw error;
  const map: PermissionMap = {};
  for (const row of data) {
    map[`${row.role}:${row.menu_key}`] = row.allowed;
  }
  return map;
}

/** true (allowed) if no explicit row exists — Top Admin only needs to save exceptions. */
export function isMenuAllowed(map: PermissionMap, role: string, menuKey: string): boolean {
  const val = map[`${role}:${menuKey}`];
  return val === undefined ? true : val;
}

export async function setMenuPermission(
  module: PermissionModule,
  role: PermissionRole,
  menuKey: string,
  allowed: boolean,
): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  const { error } = await supabase.from("hpm_menu_permissions").upsert(
    {
      company_id: companyId,
      role,
      module,
      menu_key: menuKey,
      allowed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,role,module,menu_key" },
  );
  if (error) throw error;
}
