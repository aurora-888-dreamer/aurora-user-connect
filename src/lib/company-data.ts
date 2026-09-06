/**
 * Company Profile settings — office identity + the GPS point attendance is
 * geofenced against.
 *
 * MIGRATED from localStorage to Supabase (`hpm_companies`). This app is
 * currently single-tenant (one deployed instance = one company), and admin
 * login (see `aurora-id.ts`) is not yet company-aware — so instead of
 * threading a real company_id through a login session, we resolve/bootstrap
 * a single company row and cache its id in memory for the lifetime of the
 * tab. This keeps every other table's `company_id` foreign key satisfied
 * without a bigger admin-auth migration (out of scope right now).
 */
import { supabase } from "@/integrations/supabase/client";

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  officeLat: number | null;
  officeLng: number | null;
  officeRadiusMeters: number;
};

const DEFAULT_COMPANY: CompanyProfile = {
  name: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  officeLat: null,
  officeLng: null,
  officeRadiusMeters: 30,
};

/** Fallback used only if a read/write happens before the office radius has ever been set. */
export const DEFAULT_OFFICE_RADIUS_METERS = 30;

let cachedCompanyId: string | null = null;

/**
 * Resolves the single company row this instance belongs to, creating a
 * blank one on first run. Cached in memory so repeated calls (attendance,
 * staff accounts, HRIS, settings) don't all round-trip to Supabase.
 */
export async function getOrCreateCompanyId(): Promise<string> {
  if (cachedCompanyId) return cachedCompanyId;

  const { data: existing, error: readError } = await supabase
    .from("hpm_companies")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;

  if (existing) {
    cachedCompanyId = existing.id;
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("hpm_companies")
    .insert({ name: "", office_radius_meters: DEFAULT_OFFICE_RADIUS_METERS })
    .select("id")
    .single();

  if (insertError) throw insertError;

  cachedCompanyId = created.id;
  return created.id;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_companies")
    .select(
      "name, address, phone, whatsapp, email, website, office_lat, office_lng, office_radius_meters",
    )
    .eq("id", companyId)
    .single();

  if (error) throw error;

  return {
    name: data.name ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    whatsapp: data.whatsapp ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    officeLat: data.office_lat,
    officeLng: data.office_lng,
    officeRadiusMeters: data.office_radius_meters ?? DEFAULT_OFFICE_RADIUS_METERS,
  };
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  const { error } = await supabase
    .from("hpm_companies")
    .update({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      email: profile.email,
      website: profile.website,
      office_lat: profile.officeLat,
      office_lng: profile.officeLng,
      office_radius_meters: profile.officeRadiusMeters,
    })
    .eq("id", companyId);

  if (error) throw error;
}

export function isOfficeLocationSet(profile: CompanyProfile): boolean {
  return profile.officeLat !== null && profile.officeLng !== null;
}

/** Great-circle distance between two lat/lng points, in meters (Haversine formula). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
