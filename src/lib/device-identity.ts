/**
 * Device identity vault.
 * The NIK is entered ONCE and stored only on this device, encrypted with
 * AES-GCM using a non-extractable-style random device key kept in localStorage.
 * It is used for silent auto-verification login on this device.
 */

const VAULT_KEY = "aurora.hpm.vault.v1";
const DEVICE_KEY = "aurora.hpm.devicekey.v1";
const REGISTRY_KEY = "aurora.hpm.registry.v1";

export type AuroraProfile = {
  userId: string;
  fullName: string;
  dial: string;
  countryCode: string;
  phone: string;
  nikEncrypted: string;
  nikIv: string;
  deviceId: string;
  registeredAt: string;
  syncedToAurora: boolean;
};

const toB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function getDeviceKey(): Promise<CryptoKey> {
  let raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = toB64(bytes.buffer);
    localStorage.setItem(DEVICE_KEY, raw);
  }
  return crypto.subtle.importKey("raw", fromB64(raw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptNik(nik: string) {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(nik);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { nikEncrypted: toB64(cipher), nikIv: toB64(iv.buffer) };
}

export async function decryptNik(nikEncrypted: string, nikIv: string) {
  const key = await getDeviceKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(nikIv) },
    key,
    fromB64(nikEncrypted),
  );
  return new TextDecoder().decode(plain);
}

export function deviceFingerprint(): string {
  const existing = localStorage.getItem("aurora.hpm.deviceid.v1");
  if (existing) return existing;
  const id = `DEV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  localStorage.setItem("aurora.hpm.deviceid.v1", id);
  return id;
}

export function loadProfile(): AuroraProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(VAULT_KEY);
  return raw ? (JSON.parse(raw) as AuroraProfile) : null;
}

export function saveProfile(profile: AuroraProfile) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(profile));
  const registry = loadRegistry();
  if (!registry.some((r) => r.userId === profile.userId)) {
    registry.push({
      userId: profile.userId,
      fullName: profile.fullName,
      dial: profile.dial,
      phone: profile.phone,
    });
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  }
}

export function clearProfile() {
  localStorage.removeItem(VAULT_KEY);
}

export type RegistryEntry = {
  userId: string;
  fullName: string;
  dial: string;
  phone: string;
};

export function loadRegistry(): RegistryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(REGISTRY_KEY);
  return raw ? (JSON.parse(raw) as RegistryEntry[]) : [];
}

/** Push the new user_id to AURORA MASTER DATABASE CENTRE. */
export const AURORA_CENTRE = "https://magic-noble-nexus.lovable.app";

export async function syncToAuroraCentre(payload: {
  userId: string;
  fullName: string;
  dial: string;
  countryCode: string;
  phone: string;
  deviceId: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${AURORA_CENTRE}/api/public/aurora/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "HUMAN_POWER_MANAGEMENT", ...payload }),
    });
    if (!res.ok) {
      return { ok: false, message: `Aurora Centre responded ${res.status}. Queued locally.` };
    }
    return { ok: true, message: "Registered at Aurora Master Database Centre." };
  } catch {
    return { ok: false, message: "Aurora Centre unreachable. Registration queued on device." };
  }
}
