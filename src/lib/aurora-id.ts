// src/lib/aurora-id.ts
//
// Admin accounts now live in the database (`hpm_admin_users`) instead of
// localStorage. Clearing the browser cache no longer wipes accounts or
// resets a changed PIN, and an admin can sign in from any device.
// PINs are stored as SHA-256 hashes (prefix "hpm-admin-pin:").
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR";

export interface UserProfile {
  userId: string;
  fullName: string;
  phoneWA: string;
  role: UserRole;
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
  user_id: string;
  full_name: string;
  phone_wa: string | null;
  role: string;
};

function toProfile(row: AdminRow): UserProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    phoneWA: row.phone_wa ?? "",
    role: (row.role as UserRole) ?? "OPERATOR",
  };
}

export async function listAdminUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("hpm_admin_users")
    .select("user_id, full_name, phone_wa, role")
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
    .select("user_id, full_name, phone_wa, role, pin_hash")
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

export async function createAdminUser(input: {
  userId: string;
  pin: string;
  fullName: string;
  phoneWA?: string;
  role: UserRole;
}): Promise<UserProfile> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_admin_users")
    .insert({
      company_id: companyId,
      user_id: input.userId.toUpperCase(),
      pin_hash: await hashPin(input.pin),
      full_name: input.fullName,
      phone_wa: input.phoneWA ?? "",
      role: input.role,
      is_active: true,
    })
    .select("user_id, full_name, phone_wa, role")
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
