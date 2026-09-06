/**
 * Staff self-service accounts — separate from hpm_admin_users (aurora-id.ts).
 * User_ID uses the SAME formula already used across Noble/Magic Talk/Database
 * Master: 5 letters from the name + country dial code + last 3 digits of the
 * WhatsApp number (e.g. "SANTY62296"). Confirmed against this project's own
 * DEFAULT_ADMIN ("AUROR62710" = AURORA + 62 + ...710).
 *
 * OTP + email-reset here are DEMO implementations (no SMSGate/email backend
 * wired up yet) — they generate a real code and surface it directly in the
 * UI so the flow is fully testable now. Swap requestStaffOtp/requestPinReset
 * for real SMSGate + email calls once the backend (see hpm_otp_codes /
 * hpm_pin_resets in the SQL schema) is live.
 */
import { deviceFingerprint, encryptNik } from "@/lib/device-identity";

export type StaffAccount = {
  id: string;
  employeeId: string;
  userId: string;
  pin: string; // demo: plain text, matches this project's existing admin-account convention
  fullName: string;
  whatsapp: string;
  email: string;
  nikEncrypted?: string;
  nikIv?: string;
  deviceId?: string;
  waVerified: boolean;
  profileCompleted: boolean; // once true, fullName/whatsapp are locked (lockIdentity pattern)
  faceEnrolled: boolean;
  createdAt: string;
};

const STAFF_ACCOUNTS_KEY = "aurora.hpm.staffAccounts.v1";
const STAFF_SESSION_KEY = "aurora.hpm.staffSession.v1"; // deliberately separate from aurora_active_session
const DEFAULT_STAFF_PIN = "123456";

function read(): StaffAccount[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STAFF_ACCOUNTS_KEY);
  return raw ? (JSON.parse(raw) as StaffAccount[]) : [];
}
function write(rows: StaffAccount[]) {
  if (typeof window !== "undefined") localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(rows));
}

export function getStaffAccounts(): StaffAccount[] {
  return read();
}

/** 5 letters from the name + dial code + last 3 WA digits, with collision suffixing. */
export function generateStaffUserId(fullName: string, whatsapp: string, dial = "62"): string {
  const letters = (fullName.replace(/[^a-zA-Z]/g, "").toUpperCase() + "XXXXX").slice(0, 5);
  const digits = whatsapp.replace(/\D/g, "");
  const last3 = (digits.slice(-3) || "000").padStart(3, "0");
  const base = `${letters}${dial}${last3}`;
  const existing = new Set(read().map((a) => a.userId));
  if (!existing.has(base)) return base;
  for (let i = 1; i < 100; i++) {
    const candidate = `${base}${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

/** HR-side: creates the account + default PIN for an employee to be invited with. */
export function createStaffAccount(input: {
  employeeId: string;
  fullName: string;
  whatsapp: string;
  email: string;
}): StaffAccount {
  const account: StaffAccount = {
    id: crypto.randomUUID(),
    employeeId: input.employeeId,
    userId: generateStaffUserId(input.fullName, input.whatsapp),
    pin: DEFAULT_STAFF_PIN,
    fullName: input.fullName,
    whatsapp: input.whatsapp,
    email: input.email,
    waVerified: false,
    profileCompleted: false,
    faceEnrolled: false,
    createdAt: new Date().toISOString(),
  };
  write([...read(), account]);
  return account;
}

export function findStaffAccountByEmployee(employeeId: string): StaffAccount | null {
  return read().find((a) => a.employeeId === employeeId) ?? null;
}

export function findStaffAccountByCredentials(userId: string, pin: string): StaffAccount | null {
  return (
    read().find((a) => a.userId.toUpperCase() === userId.toUpperCase() && a.pin === pin) ?? null
  );
}

export function updateStaffAccount(id: string, patch: Partial<StaffAccount>) {
  const rows = read().map((a) => (a.id === id ? { ...a, ...patch } : a));
  write(rows);
  const session = getStaffSession();
  if (session?.id === id) setStaffSession({ ...session, ...patch });
}

/** HR-side: reset a staff member's PIN back to the default (e.g. after they lose access). */
export function resetStaffAccountToDefaultPin(id: string) {
  updateStaffAccount(id, { pin: DEFAULT_STAFF_PIN });
}

// ---------- Session (kept separate from the admin session key) ----------

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

// ---------- WhatsApp OTP (first login only) — DEMO, replace with SMSGate ----------

const OTP_KEY_PREFIX = "aurora.hpm.staffOtp.";

export function requestStaffOtp(staffAccountId: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem(
    OTP_KEY_PREFIX + staffAccountId,
    JSON.stringify({ code, expiresAt: Date.now() + 5 * 60 * 1000 }),
  );
  return code; // DEMO ONLY: real version sends this via SMSGate instead of returning it
}

export function verifyStaffOtp(staffAccountId: string, code: string): boolean {
  const raw = localStorage.getItem(OTP_KEY_PREFIX + staffAccountId);
  if (!raw) return false;
  const { code: expected, expiresAt } = JSON.parse(raw) as { code: string; expiresAt: number };
  if (Date.now() > expiresAt) return false;
  const ok = expected === code;
  if (ok) localStorage.removeItem(OTP_KEY_PREFIX + staffAccountId);
  return ok;
}

// ---------- Forgot PIN by email — DEMO, replace with real email send ----------

const RESET_KEY_PREFIX = "aurora.hpm.staffPinReset.";

export function requestPinResetCode(
  email: string,
): { staffAccountId: string; code: string } | null {
  const account = read().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account) return null;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  localStorage.setItem(
    RESET_KEY_PREFIX + account.id,
    JSON.stringify({ code, expiresAt: Date.now() + 15 * 60 * 1000 }),
  );
  return { staffAccountId: account.id, code }; // DEMO ONLY: real version emails this instead
}

export function confirmPinReset(staffAccountId: string, code: string, newPin: string): boolean {
  const raw = localStorage.getItem(RESET_KEY_PREFIX + staffAccountId);
  if (!raw) return false;
  const { code: expected, expiresAt } = JSON.parse(raw) as { code: string; expiresAt: number };
  if (Date.now() > expiresAt || expected !== code) return false;
  updateStaffAccount(staffAccountId, { pin: newPin });
  localStorage.removeItem(RESET_KEY_PREFIX + staffAccountId);
  return true;
}

// ---------- NIK + device verification (reuses the existing device vault crypto) ----------

export async function attachNikAndDevice(staffAccountId: string, nik: string) {
  const { nikEncrypted, nikIv } = await encryptNik(nik);
  const deviceId = deviceFingerprint();
  updateStaffAccount(staffAccountId, { nikEncrypted, nikIv, deviceId });
}
