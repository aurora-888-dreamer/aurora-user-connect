/**
 * Company Profile settings — office identity + the GPS point attendance is
 * geofenced against.
 *
 * MIGRATED from localStorage to Supabase (`hpm_companies`). This app is
 * currently single-tenant (one deployed instance = one company), and admin
 * login (see `admin-auth.ts`) is not yet company-aware — so instead of
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
  /** "HH:MM" 24-hour, e.g. "09:00" — used to detect late clock-in/out. */
  workStartTime: string;
  workEndTime: string;
  /** Day of month (1-28) the payroll period cuts over on, e.g. 20 = periods run 20th-to-20th. */
  payrollCutoffDay: number;
  /** Pension payout formula at retirement (age 55): (pensionYearsMultiplier × years of service + pensionConstant) × basic salary. Default matches the common government-standard "2n+1". */
  pensionYearsMultiplier: number;
  pensionConstant: number;
  /** JHT (Jaminan Hari Tua) deduction rate — percent of basic salary, company-wide, not per-employee. Government default for the employee's own share is 2%. */
  jhtRatePercent: number;
  /** Izinkan absen dari luar radius kantor (dengan persetujuan). */
  allowOutsideAttendance: boolean;
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
  workStartTime: "09:00",
  workEndTime: "17:00",
  payrollCutoffDay: 1,
  pensionYearsMultiplier: 2,
  pensionConstant: 1,
  jhtRatePercent: 2,
  allowOutsideAttendance: false,
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
      "name, address, phone, whatsapp, email, website, office_lat, office_lng, office_radius_meters, work_start_time, work_end_time, payroll_cutoff_day, pension_years_multiplier, pension_constant, jht_rate_percent, allow_outside_attendance",
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
    workStartTime: (data.work_start_time ?? "09:00").slice(0, 5),
    workEndTime: (data.work_end_time ?? "17:00").slice(0, 5),
    payrollCutoffDay: data.payroll_cutoff_day ?? 1,
    pensionYearsMultiplier: data.pension_years_multiplier ?? 2,
    pensionConstant: data.pension_constant ?? 1,
    jhtRatePercent: data.jht_rate_percent ?? 2,
    allowOutsideAttendance: data.allow_outside_attendance ?? false,
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
      work_start_time: profile.workStartTime,
      work_end_time: profile.workEndTime,
      payroll_cutoff_day: profile.payrollCutoffDay,
      pension_years_multiplier: profile.pensionYearsMultiplier,
      pension_constant: profile.pensionConstant,
      jht_rate_percent: profile.jhtRatePercent,
      allow_outside_attendance: profile.allowOutsideAttendance,
    })
    .eq("id", companyId);

  if (error) throw error;
}

export function isOfficeLocationSet(profile: CompanyProfile): boolean {
  return profile.officeLat !== null && profile.officeLng !== null;
}

/** True if `now` is more than `graceMinutes` past `scheduledTime` ("HH:MM") on the same day. */
export function isPastSchedule(
  scheduledTime: string,
  graceMinutes: number,
  now = new Date(),
): boolean {
  const [h, m] = scheduledTime.split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(h ?? 0, m ?? 0, 0, 0);
  return now.getTime() - scheduled.getTime() > graceMinutes * 60 * 1000;
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

export type PayrollPeriod = { start: string; end: string; label: string };

/**
 * The payroll period (inclusive start/end, "YYYY-MM-DD") containing
 * `referenceDate`, given a cutoff day (e.g. cutoffDay=20 → periods run the
 * 20th of one month through the 19th of the next). cutoffDay=1 means a
 * plain calendar month. Used by HRIS's Laporan Akhir and Finance payroll so
 * both compute the exact same date range.
 */
export function getPayrollPeriod(cutoffDay: number, referenceDate = new Date()): PayrollPeriod {
  const day = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // If we're before this month's cutoff day, the current period started LAST month.
  const startMonthOffset = day < cutoffDay ? -1 : 0;
  const start = new Date(year, month + startMonthOffset, cutoffDay);
  const end = new Date(year, month + startMonthOffset + 1, cutoffDay - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const monthLabel = (d: Date) =>
    d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  return {
    start: fmt(start),
    end: fmt(end),
    label:
      cutoffDay === 1
        ? monthLabel(start)
        : `${start.getDate()} ${monthLabel(start)} – ${end.getDate()} ${monthLabel(end)}`,
  };
}

/** The previous full period before the one containing `referenceDate` — usually what a "final report" covers, since the current period isn't finished yet. */
export function getPreviousPayrollPeriod(
  cutoffDay: number,
  referenceDate = new Date(),
): PayrollPeriod {
  const current = getPayrollPeriod(cutoffDay, referenceDate);
  const dayBeforeCurrentStart = new Date(current.start);
  dayBeforeCurrentStart.setDate(dayBeforeCurrentStart.getDate() - 1);
  return getPayrollPeriod(cutoffDay, dayBeforeCurrentStart);
}
