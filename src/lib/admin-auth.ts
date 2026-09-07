// src/lib/admin-auth.ts
//
// Admin accounts now live in the database (`hpm_admin_users`) instead of
// localStorage. Clearing the browser cache no longer wipes accounts or
// resets a changed PIN, and an admin can sign in from any device.
// PINs are stored as SHA-256 hashes (prefix "hpm-admin-pin:").
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { getEmployeeById } from "@/lib/hris-data";

export type UserRole = "TOP_ADMIN" | "SUPER_ADMIN" | "ADMIN" | "OPERATOR";

export interface UserProfile {
  /** Internal UUID (hpm_admin_users.id) — used for FK references like the shared Contact List, not for login. */
  id: string;
  userId: string;
  fullName: string;
  phoneWA: string;
  role: UserRole;
  /** null/"" = general admin (sees Core HRIS/ATS as usual). "Finance" = restricted to the Finance module only. */
  department?: string;
  position?: string;
  /** hpm_employees.id — every admin account is a role granted to an already-registered employee, not a standalone identity. Absent only for the original bootstrap account and Aurora's own developer account. */
  employeeId?: string;
  /** Aurora's own developer/platform account — full access everywhere, ignores department restrictions. Set manually via SQL. */
  isDeveloper?: boolean;
}

/** Top Admin — full access to every module, every department, including Finance. Assigned automatically to employees at "Direktur" level; anyone else can also be granted this role. The one thing it does NOT open is the hidden Dev Console (Aurora's own). */
export function isTopAdmin(profile: UserProfile): boolean {
  return profile.role === "TOP_ADMIN";
}

/** Direktur-tier within Finance — department "Finance" + role SUPER_ADMIN. Sees & edits EVERY employee's salary/allowances, including senior levels (Kepala Divisi/GM, Direktur). */
export function isFinanceDirector(profile: UserProfile): boolean {
  return profile.department === "Finance" && profile.role === "SUPER_ADMIN";
}

/** Head Finance — department "Finance" + role ADMIN. Sees & edits only non-senior levels (Staff/Supervisor/Manager) — senior salaries stay hidden from this tier. */
export function isFinanceHeadRole(profile: UserProfile): boolean {
  return profile.department === "Finance" && profile.role === "ADMIN";
}

/** True for any Finance-department account (any of the three tiers). */
export function isFinanceDept(profile: UserProfile): boolean {
  return profile.department === "Finance";
}

/** Aurora's own platform/developer account — bypasses every department restriction, sees every module. */
export function isDeveloperAdmin(profile: UserProfile): boolean {
  return !!profile.isDeveloper;
}

const SESSION_KEY = "aurora_active_session";

async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`hpm-admin-pin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type AdminRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone_wa: string | null;
  role: string;
  department: string | null;
  position: string | null;
  employee_id: string | null;
  is_developer: boolean;
};

function toProfile(row: AdminRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    phoneWA: row.phone_wa ?? "",
    role: (row.role as UserRole) ?? "OPERATOR",
    ...(row.department ? { department: row.department } : {}),
    ...(row.position ? { position: row.position } : {}),
    ...(row.employee_id ? { employeeId: row.employee_id } : {}),
    ...(row.is_developer ? { isDeveloper: true } : {}),
  };
}

export async function listAdminUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("hpm_admin_users")
    .select(
      "id, user_id, full_name, phone_wa, role, department, position, employee_id, is_developer",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as AdminRow[]).map(toProfile);
}

export async function findAdminByCredentials(
  userId: string,
  pin: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("hpm_admin_users")
    .select(
      "id, user_id, full_name, phone_wa, role, department, position, employee_id, is_developer, pin_hash",
    )
    .ilike("user_id", userId.trim())
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as (AdminRow & { pin_hash: string }) | null;
  if (!row) return null;
  if (row.pin_hash !== (await hashPin(pin))) return null;
  return toProfile(row);
}

export async function updateAdminProfile(
  userId: string,
  patch: { fullName: string; phoneWA: string },
): Promise<void> {
  const { error } = await supabase
    .from("hpm_admin_users")
    .update({ full_name: patch.fullName, phone_wa: patch.phoneWA })
    .ilike("user_id", userId);
  if (error) throw error;
}

/** Returns false when the old PIN doesn't match. */
export async function changeAdminPin(
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<boolean> {
  const existing = await findAdminByCredentials(userId, oldPin);
  if (!existing) return false;
  const { error } = await supabase
    .from("hpm_admin_users")
    .update({ pin_hash: await hashPin(newPin) })
    .ilike("user_id", userId);
  if (error) throw error;
  return true;
}

/**
 * Grants admin access to an ALREADY-REGISTERED employee — this is the only
 * way to create an admin account now. Name/department/jabatan are pulled
 * straight from their HRIS record, not typed freely, so the two can never
 * drift apart. An employee at "Direktur" level is automatically escalated
 * to TOP_ADMIN (full access everywhere except the Dev Console) regardless
 * of the role passed in.
 */
export async function createAdminUser(input: {
  userId: string;
  pin: string;
  employeeId: string;
  role: UserRole;
  /** Only meaningful for department-scoped tiers like Finance — most grants leave this unset. */
  department?: string;
}): Promise<UserProfile> {
  const employee = await getEmployeeById(input.employeeId);
  if (!employee) throw new Error("Karyawan tidak ditemukan di HRIS.");

  const effectiveRole: UserRole = employee.positionLevel === "Direktur" ? "TOP_ADMIN" : input.role;

  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_admin_users")
    .insert({
      company_id: companyId,
      user_id: input.userId.toUpperCase(),
      pin_hash: await hashPin(input.pin),
      full_name: employee.fullName,
      phone_wa: employee.phone || "",
      role: effectiveRole,
      department: input.department || null,
      position: employee.position || null,
      employee_id: employee.id,
      is_active: true,
    })
    .select("id, user_id, full_name, phone_wa, role, department, position, employee_id")
    .single();
  if (error) throw error;
  return toProfile(data as AdminRow);
}

// ---------- Session pointer (localStorage only holds who is logged in on this device) ----------

export function getActiveSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const session = localStorage.getItem(SESSION_KEY);
  return session ? (JSON.parse(session) as UserProfile) : null;
}

export function setActiveSession(user: UserProfile | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
}
