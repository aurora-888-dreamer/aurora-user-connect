/**
 * Core HRIS data layer.
 *
 * Employees + Attendance are MIGRATED from localStorage to Supabase
 * (`hpm_employees`, `hpm_attendance`) — these are the two pieces staff
 * attendance depends on directly, so they moved first. Payroll stays
 * localStorage-backed for now (lower priority — can migrate next).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { getOrCreateCompanyId } from "@/lib/company-data";

export type EmploymentStatus = "PKWT" | "PKWTT" | "INTERN";
export type PtkpStatus = "TK/0" | "TK/1" | "TK/2" | "TK/3" | "K/0" | "K/1" | "K/2" | "K/3";
export type AttendanceStatus = "PRESENT" | "LATE" | "LEAVE" | "ALPHA";
export type PayrollStatus = "DRAFT" | "PAID";

export type MaritalStatus = "Menikah" | "Belum Menikah" | "Cerai Hidup" | "Cerai Mati";

export type FamilyData = {
  religion?: string;
  maritalStatus?: MaritalStatus;
  // Filled when Menikah:
  spouseName?: string;
  childrenCount?: number;
  childrenNames?: string;
  // Filled when Belum Menikah / Cerai:
  fatherName?: string;
  motherName?: string;
  siblingsCount?: number;
};

export type Employee = {
  id: string;
  nik: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentStatus: EmploymentStatus;
  joinDate: string;
  npwp: string;
  ptkpStatus: PtkpStatus;
  basicSalary: number;
  isActive: boolean;
  source?: "MANUAL" | "ATS_HANDOVER" | undefined;
  familyData?: FamilyData | undefined;
  supervisorId?: string | undefined;
  /** Convenience field only — the real FaceID data lives on the staff account (hpm_staff_users.face_descriptor), not here. Populated by joinFaceDescriptors(). */
  faceDescriptor?: number[] | undefined;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  latIn?: string | undefined;
  longIn?: string | undefined;
  distanceMeters?: number | undefined;
  isOutsideOffice?: boolean | undefined;
  outsideLocationNote?: string | undefined;
  outsideTaskStatus?: string | undefined;
  photoDataUrl?: string | undefined;
  lateInReason?: string | undefined;
  lateOutReason?: string | undefined;
  needsSupervisorApproval: boolean;
  status: AttendanceStatus;
};

export type Payroll = {
  id: string;
  employeeId: string;
  period: string;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  bpjsHealthEmp: number;
  bpjsTkEmp: number;
  pph21Amount: number;
  netSalary: number;
  paymentStatus: PayrollStatus;
  createdAt: string;
};

const PAYROLL_KEY = "aurora.hpm.payroll.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function write<T>(key: string, rows: T[]) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(rows));
}

// ---------- Employees ----------

type EmployeeRow = {
  id: string;
  nik: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  employment_status: string;
  join_date: string | null;
  npwp: string | null;
  ptkp_status: string | null;
  basic_salary: number;
  is_active: boolean;
  source: string | null;
  family_data: unknown;
  supervisor_id: string | null;
  created_at: string;
};

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    nik: row.nik ?? "",
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    department: row.department ?? "",
    position: row.position ?? "",
    employmentStatus: (row.employment_status as EmploymentStatus) ?? "PKWT",
    joinDate: row.join_date ?? "",
    npwp: row.npwp ?? "",
    ptkpStatus: (row.ptkp_status as PtkpStatus) ?? "TK/0",
    basicSalary: row.basic_salary,
    isActive: row.is_active,
    source: (row.source as Employee["source"]) ?? "MANUAL",
    familyData:
      row.family_data && typeof row.family_data === "object"
        ? (row.family_data as FamilyData)
        : undefined,
    supervisorId: row.supervisor_id ?? undefined,
    createdAt: row.created_at,
  };
}

const EMPLOYEE_COLUMNS =
  "id, nik, full_name, email, phone, department, position, employment_status, join_date, npwp, ptkp_status, basic_salary, is_active, source, family_data, supervisor_id, created_at";

export async function getEmployees(): Promise<Employee[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as EmployeeRow[]).map(toEmployee);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from("hpm_employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toEmployee(data as EmployeeRow) : null;
}

/**
 * FaceID actually lives on `hpm_staff_users.face_descriptor` (one per staff
 * account, self-enrolled on their own phone). This merges that in wherever
 * the HRIS admin screens need to show "sudah/belum daftar wajah" per
 * employee, without changing hpm_employees at all.
 */
export async function joinFaceDescriptors(employees: Employee[]): Promise<Employee[]> {
  if (employees.length === 0) return employees;
  const { data, error } = await supabase
    .from("hpm_staff_users")
    .select("employee_id, face_descriptor")
    .in(
      "employee_id",
      employees.map((e) => e.id),
    );
  if (error) throw error;
  const byEmployeeId = new Map<string, number[]>();
  for (const row of data ?? []) {
    if (row.employee_id && Array.isArray(row.face_descriptor)) {
      byEmployeeId.set(row.employee_id, row.face_descriptor as number[]);
    }
  }
  return employees.map((e) => ({ ...e, faceDescriptor: byEmployeeId.get(e.id) }));
}

export async function addEmployee(input: Omit<Employee, "id" | "createdAt">): Promise<Employee> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_employees")
    .insert({
      company_id: companyId,
      nik: input.nik || null,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      department: input.department || null,
      position: input.position || null,
      employment_status: input.employmentStatus,
      join_date: input.joinDate || null,
      npwp: input.npwp || null,
      ptkp_status: input.ptkpStatus,
      basic_salary: input.basicSalary,
      is_active: input.isActive,
      source: input.source ?? "MANUAL",
      family_data: (input.familyData ?? null) as unknown as Json | null,
      supervisor_id: input.supervisorId || null,
    })
    .select(EMPLOYEE_COLUMNS)
    .single();
  if (error) throw error;
  return toEmployee(data as EmployeeRow);
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_employees"]["Update"] = {};
  if (patch.nik !== undefined) dbPatch.nik = patch.nik;
  if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.department !== undefined) dbPatch.department = patch.department;
  if (patch.position !== undefined) dbPatch.position = patch.position;
  if (patch.employmentStatus !== undefined) dbPatch.employment_status = patch.employmentStatus;
  if (patch.joinDate !== undefined) dbPatch.join_date = patch.joinDate;
  if (patch.npwp !== undefined) dbPatch.npwp = patch.npwp;
  if (patch.ptkpStatus !== undefined) dbPatch.ptkp_status = patch.ptkpStatus;
  if (patch.basicSalary !== undefined) dbPatch.basic_salary = patch.basicSalary;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
  if (patch.familyData !== undefined)
    dbPatch.family_data = (patch.familyData ?? null) as unknown as Json | null;
  if (patch.supervisorId !== undefined) dbPatch.supervisor_id = patch.supervisorId || null;
  // Note: patch.faceDescriptor is intentionally ignored here — FaceID is
  // written to hpm_staff_users via staff-auth.ts's updateStaffAccount, not here.
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from("hpm_employees").update(dbPatch).eq("id", id);
  if (error) throw error;
}

/** Deletes an employee row. Any linked staff account (hpm_staff_users.employee_id) is
 * automatically orphaned (set to null) by the database's ON DELETE SET NULL — the staff
 * account itself is NOT deleted, only unlinked. */
export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_employees").delete().eq("id", id);
  if (error) throw error;
}

export async function getSubordinates(supervisorEmployeeId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("hpm_employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("supervisor_id", supervisorEmployeeId);
  if (error) throw error;
  return (data as EmployeeRow[]).map(toEmployee);
}

// ---------- Attendance ----------

type AttendanceRow = {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  lat_in: string | null;
  long_in: string | null;
  distance_meters: number | null;
  is_outside_office: boolean | null;
  outside_location_note: string | null;
  outside_task_status: string | null;
  photo_url: string | null;
  late_in_reason: string | null;
  late_out_reason: string | null;
  needs_supervisor_approval: boolean;
  status: string | null;
};

function toAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    latIn: row.lat_in ?? undefined,
    longIn: row.long_in ?? undefined,
    distanceMeters: row.distance_meters ?? undefined,
    isOutsideOffice: row.is_outside_office ?? undefined,
    outsideLocationNote: row.outside_location_note ?? undefined,
    outsideTaskStatus: row.outside_task_status ?? undefined,
    photoDataUrl: row.photo_url ?? undefined,
    lateInReason: row.late_in_reason ?? undefined,
    lateOutReason: row.late_out_reason ?? undefined,
    needsSupervisorApproval: row.needs_supervisor_approval ?? false,
    status: (row.status as AttendanceStatus) ?? "PRESENT",
  };
}

const ATTENDANCE_COLUMNS =
  "id, employee_id, date, clock_in, clock_out, lat_in, long_in, distance_meters, is_outside_office, outside_location_note, outside_task_status, photo_url, late_in_reason, late_out_reason, needs_supervisor_approval, status";

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("company_id", companyId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

/** Scoped to one employee — used on the staff dashboard so a staff member only ever pulls their own history. */
export async function getAttendanceForEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("hpm_attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

/** All of today's sessions for one employee, oldest first — a field staff member can have several. */
export async function getTodaySessionsFor(employeeId: string): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("hpm_attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("date", today)
    .order("clock_in", { ascending: true });
  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

/** The currently open session today (clocked in, not yet out), if any — at most one can be open at a time. */
export async function getOpenSessionFor(employeeId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("hpm_attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("date", today)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toAttendance(data as AttendanceRow) : null;
}

/**
 * Clock in with an optional GPS coordinate. Multiple sessions per day are
 * allowed (field staff going out and back several times) — this only blocks
 * a NEW clock-in while a session is still open (must clock out first).
 * "LATE" is only ever applied to the day's first session; later same-day
 * re-entries (after a client visit, etc) are just PRESENT.
 */
export async function clockIn(
  employeeId: string,
  input?: {
    coords?: { lat: string; long: string };
    distanceMeters?: number;
    isOutsideOffice?: boolean;
    outsideLocationNote?: string;
    outsideTaskStatus?: string;
    photoDataUrl?: string;
    lateInReason?: string;
  },
): Promise<void> {
  const open = await getOpenSessionFor(employeeId);
  if (open) return; // already clocked in — must clock out before clocking in again

  const todaySessions = await getTodaySessionsFor(employeeId);
  const companyId = await getOrCreateCompanyId();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const isFirstSessionToday = todaySessions.length === 0;
  const isLate =
    isFirstSessionToday && (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0));

  const { error } = await supabase.from("hpm_attendance").insert({
    company_id: companyId,
    employee_id: employeeId,
    date: today,
    clock_in: now.toISOString(),
    clock_out: null,
    lat_in: input?.coords?.lat ?? null,
    long_in: input?.coords?.long ?? null,
    distance_meters: input?.distanceMeters ?? null,
    is_outside_office: input?.isOutsideOffice ?? null,
    outside_location_note: input?.outsideLocationNote ?? null,
    outside_task_status: input?.outsideTaskStatus ?? null,
    photo_url: input?.photoDataUrl ?? null,
    late_in_reason: input?.lateInReason ?? null,
    status: isLate ? "LATE" : "PRESENT",
  });
  if (error) throw error;
}

export async function clockOut(employeeId: string, lateOutReason?: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("hpm_attendance")
    .update({
      clock_out: new Date().toISOString(),
      ...(lateOutReason ? { late_out_reason: lateOutReason } : {}),
    })
    .eq("employee_id", employeeId)
    .eq("date", today)
    .is("clock_out", null);
  if (error) throw error;
}

/** HR-side: decide whether a late reason needs the supervisor's sign-off. */
export async function setNeedsSupervisorApproval(
  attendanceId: string,
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("hpm_attendance")
    .update({ needs_supervisor_approval: value })
    .eq("id", attendanceId);
  if (error) throw error;
}

// ---------- Payroll: PPh 21 TER (PMK 168/2023) + BPJS — still localStorage, migrating later ----------

const TER_CATEGORY: Record<PtkpStatus, "A" | "B" | "C"> = {
  "TK/0": "A",
  "TK/1": "A",
  "K/0": "A",
  "TK/2": "B",
  "TK/3": "B",
  "K/1": "B",
  "K/2": "B",
  "K/3": "C",
};

/** Simplified monthly TER rate lookup per bracket (illustrative — replace with the full PMK 168/2023 table). */
function terRate(category: "A" | "B" | "C", bruto: number): number {
  const table: Record<"A" | "B" | "C", [number, number][]> = {
    A: [
      [5400000, 0],
      [5650000, 0.0025],
      [6000000, 0.005],
      [6300000, 0.0075],
      [7500000, 0.01],
      [9000000, 0.015],
      [10000000, 0.02],
      [Infinity, 0.03],
    ],
    B: [
      [6200000, 0],
      [6500000, 0.0025],
      [6850000, 0.005],
      [7300000, 0.0075],
      [9200000, 0.01],
      [11600000, 0.015],
      [13000000, 0.02],
      [Infinity, 0.03],
    ],
    C: [
      [6600000, 0],
      [6950000, 0.0025],
      [7350000, 0.005],
      [7800000, 0.0075],
      [8850000, 0.01],
      [11250000, 0.015],
      [13750000, 0.02],
      [Infinity, 0.03],
    ],
  };
  const bracket = table[category].find(([ceiling]) => bruto <= ceiling);
  return bracket ? bracket[1] : 0.03;
}

const BPJS_HEALTH_CAP = 12_000_000;
const BPJS_JP_CAP = 10_547_400;

export function computePayroll(input: {
  employee: Employee;
  period: string;
  allowances: number;
  overtimePay: number;
}): Omit<Payroll, "id" | "createdAt"> {
  const { employee, period, allowances, overtimePay } = input;
  const bruto = employee.basicSalary + allowances + overtimePay;
  const category = TER_CATEGORY[employee.ptkpStatus];
  const rate = terRate(category, bruto);
  const pph21Amount = Math.round(bruto * rate);

  const healthBasis = Math.min(employee.basicSalary, BPJS_HEALTH_CAP);
  const bpjsHealthEmp = Math.round(healthBasis * 0.01);
  const jpBasis = Math.min(employee.basicSalary, BPJS_JP_CAP);
  const bpjsTkEmp = Math.round(employee.basicSalary * 0.02 + jpBasis * 0.01);

  const netSalary = bruto - pph21Amount - bpjsHealthEmp - bpjsTkEmp;

  return {
    employeeId: employee.id,
    period,
    basicSalary: employee.basicSalary,
    allowances,
    overtimePay,
    bpjsHealthEmp,
    bpjsTkEmp,
    pph21Amount,
    netSalary,
    paymentStatus: "DRAFT",
  };
}

export function getPayrolls(): Payroll[] {
  return read<Payroll>(PAYROLL_KEY);
}

export function addPayroll(input: Omit<Payroll, "id" | "createdAt">): Payroll {
  const rows = getPayrolls();
  const payroll: Payroll = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  write(PAYROLL_KEY, [...rows, payroll]);
  return payroll;
}

export function markPayrollPaid(id: string) {
  write(
    PAYROLL_KEY,
    getPayrolls().map((p) => (p.id === id ? { ...p, paymentStatus: "PAID" as PayrollStatus } : p)),
  );
}
