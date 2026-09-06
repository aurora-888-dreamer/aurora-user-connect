/**
 * Staff self-service accounts — separate from hpm_admin_users (aurora-id.ts).
 * User_ID uses the SAME formula already used across Noble/Magic Talk/Database
 * Master: 5 letters from the name + country dial code + last 3 digits of the
 * WhatsApp number (e.g. "SANTY62296").
 *
 * MIGRATED from localStorage to Supabase (`hpm_staff_users`, `hpm_otp_codes`,
 * `hpm_pin_resets`). This is the fix for staff being "rejected" when logging
 * in from their own phone: accounts now live in the shared database instead
 * of the browser that created them, so any device can look them up.
 *
 * PINs are hashed (SHA-256) before being written to `pin_hash` — a step up
 * from the old plaintext-in-localStorage version, though a 6-digit PIN space
 * is small regardless, so this is not meant as strong security on its own.
 *
 * OTP + email-reset are still DEMO implementations (no SMSGate/email backend
 * wired up yet) — they generate a real code, store it in the database, and
 * surface it directly in the UI so the flow is fully testable now. Swap
 * requestStaffOtp/requestPinResetCode for real SMSGate + email calls once
 * the backend is live.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { deviceFingerprint, encryptNik } from "@/lib/device-identity";

export type StaffAccount = {
  id: string;
  employeeId: string;
  userId: string;
  fullName: string;
  whatsapp: string;
  email: string;
  nikEncrypted?: string | undefined;
  deviceId?: string | undefined;
  waVerified: boolean;
  profileCompleted: boolean; // once true, fullName/whatsapp are locked (lockIdentity pattern)
  faceEnrolled: boolean;
  faceDescriptor?: number[] | undefined;
  createdAt: string;
};

const STAFF_SESSION_KEY = "aurora.hpm.staffSession.v1"; // session pointer only — the account itself lives in Supabase now
const DEFAULT_STAFF_PIN = "123456";

async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`hpm-staff-pin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type StaffRow = {
  id: string;
  employee_id: string | null;
  user_id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  nik_encrypted: string | null;
  device_id: string | null;
  wa_verified: boolean;
  is_active: boolean;
  face_descriptor: unknown;
  created_at: string;
};

// `profileCompleted` isn't its own DB column — it's derived from wa_verified +
// having changed the PIN away from the default, tracked implicitly by
// `nik_encrypted` being set (step 3 of the wizard, right before FaceID).
function toAccount(row: StaffRow): StaffAccount {
  const faceDescriptor = Array.isArray(row.face_descriptor)
    ? (row.face_descriptor as number[])
    : undefined;
  return {
    id: row.id,
    employeeId: row.employee_id ?? "",
    userId: row.user_id,
    fullName: row.full_name,
    whatsapp: row.whatsapp,
    email: row.email ?? "",
    nikEncrypted: row.nik_encrypted ?? undefined,
    deviceId: row.device_id ?? undefined,
    waVerified: row.wa_verified,
    profileCompleted: !!row.nik_encrypted,
    faceEnrolled: !!faceDescriptor,
    faceDescriptor,
    createdAt: row.created_at,
  };
}

const STAFF_COLUMNS =
  "id, employee_id, user_id, full_name, whatsapp, email, nik_encrypted, device_id, wa_verified, is_active, face_descriptor, created_at";
const STAFF_COLUMNS_WITH_PIN =
  "id, employee_id, user_id, full_name, whatsapp, email, nik_encrypted, device_id, wa_verified, is_active, face_descriptor, created_at, pin_hash";

export async function getStaffAccounts(): Promise<StaffAccount[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_staff_users")
    .select(STAFF_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StaffRow[]).map(toAccount);
}

/** 5 letters from the name + dial code + last 3 WA digits, with collision suffixing. */
export async function generateStaffUserId(
  fullName: string,
  whatsapp: string,
  dial = "62",
): Promise<string> {
  const letters = (fullName.replace(/[^a-zA-Z]/g, "").toUpperCase() + "XXXXX").slice(0, 5);
  const digits = whatsapp.replace(/\D/g, "");
  const last3 = (digits.slice(-3) || "000").padStart(3, "0");
  const base = `${letters}${dial}${last3}`;

  const existing = new Set((await getStaffAccounts()).map((a) => a.userId));
  if (!existing.has(base)) return base;
  for (let i = 1; i < 100; i++) {
    const candidate = `${base}${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

/** HR-side: creates the account + default PIN for an employee to be invited with. */
export async function createStaffAccount(input: {
  employeeId: string;
  fullName: string;
  whatsapp: string;
  email: string;
}): Promise<StaffAccount> {
  const companyId = await getOrCreateCompanyId();
  const userId = await generateStaffUserId(input.fullName, input.whatsapp);
  const pinHash = await hashPin(DEFAULT_STAFF_PIN);

  const { data, error } = await supabase
    .from("hpm_staff_users")
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      user_id: userId,
      full_name: input.fullName,
      whatsapp: input.whatsapp,
      email: input.email || null,
      pin_hash: pinHash,
      wa_verified: false,
      is_active: true,
    })
    .select(STAFF_COLUMNS)
    .single();

  if (error) throw error;
  return toAccount(data as StaffRow);
}

export async function findStaffAccountByEmployee(employeeId: string): Promise<StaffAccount | null> {
  const { data, error } = await supabase
    .from("hpm_staff_users")
    .select(STAFF_COLUMNS)
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) throw error;
  return data ? toAccount(data as StaffRow) : null;
}

/** Staff login — looks the account up by User ID (any device) and checks the hashed PIN. */
export async function findStaffAccountByCredentials(
  userId: string,
  pin: string,
): Promise<StaffAccount | null> {
  const pinHash = await hashPin(pin);
  const { data, error } = await supabase
    .from("hpm_staff_users")
    .select(STAFF_COLUMNS_WITH_PIN)
    .ilike("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  const row = data as unknown as (StaffRow & { pin_hash: string }) | null;
  if (!row || row.pin_hash !== pinHash) return null;
  return toAccount(row);
}

export async function updateStaffAccount(id: string, patch: Partial<StaffAccount>): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_staff_users"]["Update"] = {};
  if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
  if (patch.whatsapp !== undefined) dbPatch.whatsapp = patch.whatsapp;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.waVerified !== undefined) dbPatch.wa_verified = patch.waVerified;
  if (patch.nikEncrypted !== undefined) dbPatch.nik_encrypted = patch.nikEncrypted;
  if (patch.deviceId !== undefined) dbPatch.device_id = patch.deviceId;
  if (patch.faceDescriptor !== undefined) dbPatch.face_descriptor = patch.faceDescriptor;
  if ((patch as { pin?: string }).pin !== undefined) {
    dbPatch.pin_hash = await hashPin((patch as { pin: string }).pin);
  }

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await supabase.from("hpm_staff_users").update(dbPatch).eq("id", id);
    if (error) throw error;
  }

  const session = getStaffSession();
  if (session?.id === id) setStaffSession({ ...session, ...patch });
}

/** HR-side: reset a staff member's PIN back to the default (e.g. after they lose access). */
export async function resetStaffAccountToDefaultPin(id: string): Promise<void> {
  await updateStaffAccount(id, { pin: DEFAULT_STAFF_PIN } as Partial<StaffAccount> & {
    pin: string;
  });
}

// ---------- Session (kept in localStorage — it's just a pointer to the device's own logged-in staff, not the source of truth) ----------

export function getStaffSession(): StaffAccount | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STAFF_SESSION_KEY);
  return raw ? (JSON.parse(raw) as StaffAccount) : null;
}

export function setStaffSession(account: StaffAccount | null) {
  if (typeof window === "undefined") return;
  if (account) localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(account));
  else localStorage.removeItem(STAFF_SESSION_KEY);
}

/** Re-fetches the currently logged-in staff account from the database and refreshes the session pointer. */
export async function refreshStaffSession(): Promise<StaffAccount | null> {
  const session = getStaffSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from("hpm_staff_users")
    .select(STAFF_COLUMNS)
    .eq("id", session.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    setStaffSession(null);
    return null;
  }
  const account = toAccount(data as StaffRow);
  setStaffSession(account);
  return account;
}

// ---------- WhatsApp OTP (first login only) — DEMO, replace with SMSGate ----------

export async function requestStaffOtp(staffAccountId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const { error } = await supabase.from("hpm_otp_codes").insert({
    staff_user_id: staffAccountId,
    code,
    purpose: "login",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  return code; // DEMO ONLY: real version sends this via SMSGate instead of returning it
}

export async function verifyStaffOtp(staffAccountId: string, code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("hpm_otp_codes")
    .select("id, expires_at, consumed_at")
    .eq("staff_user_id", staffAccountId)
    .eq("code", code)
    .eq("purpose", "login")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return false;

  const { error: consumeError } = await supabase
    .from("hpm_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);
  if (consumeError) throw consumeError;
  return true;
}

// ---------- Forgot PIN by email — DEMO, replace with real email send ----------

export async function requestPinResetCode(
  email: string,
): Promise<{ staffAccountId: string; code: string } | null> {
  const { data: account, error: findError } = await supabase
    .from("hpm_staff_users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (findError) throw findError;
  if (!account) return null;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hashPin(code);
  const { error } = await supabase.from("hpm_pin_resets").insert({
    staff_user_id: account.id,
    reset_code_hash: codeHash,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  return { staffAccountId: account.id, code }; // DEMO ONLY: real version emails this instead
}

export async function confirmPinReset(
  staffAccountId: string,
  code: string,
  newPin: string,
): Promise<boolean> {
  const codeHash = await hashPin(code);
  const { data, error } = await supabase
    .from("hpm_pin_resets")
    .select("id, reset_code_hash, expires_at")
    .eq("staff_user_id", staffAccountId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (
    !data ||
    data.reset_code_hash !== codeHash ||
    new Date(data.expires_at).getTime() < Date.now()
  ) {
    return false;
  }

  await updateStaffAccount(staffAccountId, { pin: newPin } as Partial<StaffAccount> & {
    pin: string;
  });
  const { error: consumeError } = await supabase
    .from("hpm_pin_resets")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);
  if (consumeError) throw consumeError;
  return true;
}

// ---------- NIK + device verification (reuses the existing device vault crypto) ----------

export async function attachNikAndDevice(staffAccountId: string, nik: string): Promise<void> {
  const { nikEncrypted, nikIv } = await encryptNik(nik);
  // The `hpm_staff_users` table only has one `nik_encrypted` column (no
  // separate IV column), so the AES-GCM IV is packed alongside the
  // ciphertext as "<iv>:<ciphertext>". Nothing currently reads this back
  // (there's no decrypt flow in the UI yet), but packing the IV in means
  // decryptNik() will still work later without another migration.
  const deviceId = deviceFingerprint();
  await updateStaffAccount(staffAccountId, { nikEncrypted: `${nikIv}:${nikEncrypted}`, deviceId });
}
