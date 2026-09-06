/**
 * Company Profile settings — office identity + the GPS point attendance is
 * geofenced against. Client-side, localStorage-backed (same pattern as the
 * other HPM data layers).
 */

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  officeLat: number | null;
  officeLng: number | null;
};

const COMPANY_KEY = "aurora.hpm.company.v1";

const DEFAULT_COMPANY: CompanyProfile = {
  name: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  officeLat: null,
  officeLng: null,
};

export function getCompanyProfile(): CompanyProfile {
  if (typeof window === "undefined") return DEFAULT_COMPANY;
  const raw = localStorage.getItem(COMPANY_KEY);
  return raw ? { ...DEFAULT_COMPANY, ...(JSON.parse(raw) as CompanyProfile) } : DEFAULT_COMPANY;
}

export function saveCompanyProfile(profile: CompanyProfile) {
  if (typeof window !== "undefined") localStorage.setItem(COMPANY_KEY, JSON.stringify(profile));
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

export const OFFICE_RADIUS_METERS = 30;

