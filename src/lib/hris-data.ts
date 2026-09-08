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
import { getOrCreateCompanyId, getCompanyProfile } from "@/lib/company-data";

export type EmploymentStatus = "PKWT" | "PKWTT" | "INTERN";
export type PtkpStatus = "TK/0" | "TK/1" | "TK/2" | "TK/3" | "K/0" | "K/1" | "K/2" | "K/3";
export type AttendanceStatus = "PRESENT" | "LATE" | "LEAVE" | "ALPHA";
export type PayrollStatus = "DRAFT" | "PAID";

export type MaritalStatus = "Menikah" | "Belum Menikah" | "Cerai Hidup" | "Cerai Mati";

export const RELIGIONS = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
] as const;
export type Religion = (typeof RELIGIONS)[number];

export const BLOOD_TYPES = ["A", "B", "AB", "O", "Tidak Diketahui"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

/** Level jabatan untuk visibilitas gaji di Finance — bukan judul bebas seperti Jabatan/Pangkat. */
export const POSITION_LEVELS = [
  "Staff",
  "Supervisor",
  "Manager",
  "Kepala Divisi / GM",
  "Direktur",
] as const;
export type PositionLevel = (typeof POSITION_LEVELS)[number];

/** True for "Kepala Divisi / GM" and "Direktur" — only a Finance Direktur (or the Aurora developer account) may view/edit these employees' pay. */
export function isSeniorPositionLevel(level: PositionLevel | string): boolean {
  return level === "Kepala Divisi / GM" || level === "Direktur";
}

/** One family member / emergency contact — name + WhatsApp number. */
export type FamilyContact = {
  name?: string;
  whatsapp?: string;
};

export type FamilyData = {
  religion?: Religion;
  maritalStatus?: MaritalStatus;
  // Filled when Menikah:
  spouse?: FamilyContact;
  children?: FamilyContact[];
  // Filled when Belum Menikah / Cerai:
  father?: FamilyContact;
  mother?: FamilyContact;
  siblings?: FamilyContact[];
};

export type Employee = {
  id: string;
  nik: string;
  nip?: string;
  bpjsHealthNumber?: string;
  bpjsEmploymentNumber?: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  rank: string;
  positionLevel: PositionLevel;
  bloodType?: BloodType;
  dateOfBirth?: string;
  locationId?: string;
  shiftTypeId?: string;
  employmentStatus: EmploymentStatus;
  joinDate: string;
  contractEndDate?: string | undefined;
  resignDate?: string | undefined;
  npwp: string;
  ptkpStatus: PtkpStatus;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  transportAllowance?: number;
  mealAllowance?: number;
  positionAllowance?: number;
  healthAllowance?: number;
  insuranceAllowance?: number;
  overtimeRatePerHour?: number;
  performanceBonus?: number;
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
  latOut?: string | undefined;
  longOut?: string | undefined;
  distanceOutMeters?: number | undefined;
  isOutsideOfficeOut?: boolean | undefined;
  outsideLocationNoteOut?: string | undefined;
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
  allowanceBreakdown: {
    transport: number;
    position: number;
    health: number;
    insurance: number;
    mealRate: number;
    mealDays: number;
    mealTotal: number;
  };
  overtimePay: number;
  bonus: number;
  penalty: number;
  bpjsHealthEmp: number;
  bpjsTkEmp: number;
  jhtDeduction: number;
  jhtRatePercent: number;
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
  nip: string | null;
  bpjs_health_number: string | null;
  bpjs_employment_number: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  rank: string | null;
  position_level: string;
  blood_type: string | null;
  date_of_birth: string | null;
  location_id: string | null;
  shift_type_id: string | null;
  employment_status: string;
  join_date: string | null;
  npwp: string | null;
  ptkp_status: string | null;
  basic_salary: number;
  is_active: boolean;
  source: string | null;
  family_data: unknown;
  supervisor_id: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  transport_allowance: number;
  meal_allowance: number;
  position_allowance: number;
  health_allowance: number;
  insurance_allowance: number;
  overtime_rate_per_hour: number;
  performance_bonus: number;
  created_at: string;
};

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    nik: row.nik ?? "",
    ...(row.nip ? { nip: row.nip } : {}),
    ...(row.bpjs_health_number ? { bpjsHealthNumber: row.bpjs_health_number } : {}),
    ...(row.bpjs_employment_number ? { bpjsEmploymentNumber: row.bpjs_employment_number } : {}),
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    department: row.department ?? "",
    position: row.position ?? "",
    rank: row.rank ?? "",
    positionLevel: (row.position_level as PositionLevel) ?? "Staff",
    ...(row.blood_type && row.blood_type !== "Tidak Diketahui"
      ? { bloodType: row.blood_type as BloodType }
      : {}),
    ...(row.date_of_birth ? { dateOfBirth: row.date_of_birth } : {}),
    ...(row.location_id ? { locationId: row.location_id } : {}),
    ...(row.shift_type_id ? { shiftTypeId: row.shift_type_id } : {}),
    employmentStatus: (row.employment_status as EmploymentStatus) ?? "PKWT",
    joinDate: row.join_date ?? "",
    ...(row.contract_end_date ? { contractEndDate: row.contract_end_date } : {}),
    ...(row.resign_date ? { resignDate: row.resign_date } : {}),
    npwp: row.npwp ?? "",
    ptkpStatus: (row.ptkp_status as PtkpStatus) ?? "TK/0",
    basicSalary: row.basic_salary,
    bankName: row.bank_name ?? "",
    bankAccountNumber: row.bank_account_number ?? "",
    bankAccountHolder: row.bank_account_holder ?? "",
    transportAllowance: row.transport_allowance ?? 0,
    mealAllowance: row.meal_allowance ?? 0,
    positionAllowance: row.position_allowance ?? 0,
    healthAllowance: row.health_allowance ?? 0,
    insuranceAllowance: row.insurance_allowance ?? 0,
    overtimeRatePerHour: row.overtime_rate_per_hour ?? 0,
    performanceBonus: row.performance_bonus ?? 0,
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
  "id, nik, nip, bpjs_health_number, bpjs_employment_number, full_name, email, phone, department, position, rank, position_level, blood_type, date_of_birth, location_id, shift_type_id, employment_status, join_date, contract_end_date, resign_date, npwp, ptkp_status, basic_salary, is_active, source, family_data, supervisor_id, bank_name, bank_account_number, bank_account_holder, transport_allowance, meal_allowance, position_allowance, health_allowance, insurance_allowance, overtime_rate_per_hour, performance_bonus, created_at";

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
      nip: input.nip || null,
      bpjs_health_number: input.bpjsHealthNumber || null,
      bpjs_employment_number: input.bpjsEmploymentNumber || null,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      department: input.department || null,
      position: input.position || null,
      rank: input.rank || null,
      position_level: input.positionLevel || "Staff",
      blood_type: input.bloodType || null,
      date_of_birth: input.dateOfBirth || null,
      location_id: input.locationId || null,
      shift_type_id: input.shiftTypeId || null,
      employment_status: input.employmentStatus,
      join_date: input.joinDate || null,
      contract_end_date: input.contractEndDate || null,
      resign_date: input.resignDate || null,
      npwp: input.npwp || null,
      ptkp_status: input.ptkpStatus,
      basic_salary: input.basicSalary || 0,
      is_active: input.isActive,
      source: input.source ?? "MANUAL",
      family_data: (input.familyData ?? null) as unknown as Json | null,
      supervisor_id: input.supervisorId || null,
      bank_name: input.bankName || null,
      bank_account_number: input.bankAccountNumber || null,
      bank_account_holder: input.bankAccountHolder || null,
      transport_allowance: input.transportAllowance || 0,
      meal_allowance: input.mealAllowance || 0,
      position_allowance: input.positionAllowance || 0,
      health_allowance: input.healthAllowance || 0,
      insurance_allowance: input.insuranceAllowance || 0,
      overtime_rate_per_hour: input.overtimeRatePerHour || 0,
      performance_bonus: input.performanceBonus || 0,
    })
    .select(EMPLOYEE_COLUMNS)
    .single();
  if (error) throw error;
  return toEmployee(data as EmployeeRow);
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_employees"]["Update"] = {};
  if (patch.nik !== undefined) dbPatch.nik = patch.nik;
  if (patch.nip !== undefined) dbPatch.nip = patch.nip;
  if (patch.bpjsHealthNumber !== undefined) dbPatch.bpjs_health_number = patch.bpjsHealthNumber;
  if (patch.bpjsEmploymentNumber !== undefined)
    dbPatch.bpjs_employment_number = patch.bpjsEmploymentNumber;
  if (patch.contractEndDate !== undefined) dbPatch.contract_end_date = patch.contractEndDate || null;
  if (patch.resignDate !== undefined) dbPatch.resign_date = patch.resignDate || null;
  if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.department !== undefined) dbPatch.department = patch.department;
  if (patch.position !== undefined) dbPatch.position = patch.position;
  if (patch.rank !== undefined) dbPatch.rank = patch.rank;
  if (patch.positionLevel !== undefined) dbPatch.position_level = patch.positionLevel;
  if (patch.bloodType !== undefined) dbPatch.blood_type = patch.bloodType || null;
  if (patch.dateOfBirth !== undefined) dbPatch.date_of_birth = patch.dateOfBirth || null;
  if (patch.locationId !== undefined) dbPatch.location_id = patch.locationId || null;
  if (patch.shiftTypeId !== undefined) dbPatch.shift_type_id = patch.shiftTypeId || null;
  if (patch.employmentStatus !== undefined) dbPatch.employment_status = patch.employmentStatus;
  if (patch.joinDate !== undefined) dbPatch.join_date = patch.joinDate;
  if (patch.npwp !== undefined) dbPatch.npwp = patch.npwp;
  if (patch.ptkpStatus !== undefined) dbPatch.ptkp_status = patch.ptkpStatus;
  if (patch.basicSalary !== undefined) dbPatch.basic_salary = patch.basicSalary;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
  if (patch.familyData !== undefined)
    dbPatch.family_data = (patch.familyData ?? null) as unknown as Json | null;
  if (patch.supervisorId !== undefined) dbPatch.supervisor_id = patch.supervisorId || null;
  if (patch.bankName !== undefined) dbPatch.bank_name = patch.bankName;
  if (patch.bankAccountNumber !== undefined) dbPatch.bank_account_number = patch.bankAccountNumber;
  if (patch.bankAccountHolder !== undefined) dbPatch.bank_account_holder = patch.bankAccountHolder;
  if (patch.transportAllowance !== undefined)
    dbPatch.transport_allowance = patch.transportAllowance;
  if (patch.mealAllowance !== undefined) dbPatch.meal_allowance = patch.mealAllowance;
  if (patch.positionAllowance !== undefined) dbPatch.position_allowance = patch.positionAllowance;
  if (patch.healthAllowance !== undefined) dbPatch.health_allowance = patch.healthAllowance;
  if (patch.insuranceAllowance !== undefined)
    dbPatch.insurance_allowance = patch.insuranceAllowance;
  if (patch.overtimeRatePerHour !== undefined)
    dbPatch.overtime_rate_per_hour = patch.overtimeRatePerHour;
  if (patch.performanceBonus !== undefined) dbPatch.performance_bonus = patch.performanceBonus;
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

// ---------- Mutation history (jabatan/pangkat/departemen/lokasi berubah sewaktu-waktu) ----------

export type MutationField = "department" | "position" | "rank" | "location" | "shift";

export type EmployeeMutation = {
  id: string;
  employeeId: string;
  fieldChanged: MutationField;
  oldValue?: string;
  newValue?: string;
  effectiveDate: string;
  note?: string;
  createdAt: string;
};

type MutationRow = {
  id: string;
  employee_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  effective_date: string;
  note: string | null;
  created_at: string;
};

function toMutation(row: MutationRow): EmployeeMutation {
  return {
    id: row.id,
    employeeId: row.employee_id,
    fieldChanged: row.field_changed as MutationField,
    ...(row.old_value ? { oldValue: row.old_value } : {}),
    ...(row.new_value ? { newValue: row.new_value } : {}),
    effectiveDate: row.effective_date,
    ...(row.note ? { note: row.note } : {}),
    createdAt: row.created_at,
  };
}

/**
 * Records one field-change event for an employee. Call this AFTER updateEmployee
 * succeeds, once per changed field, comparing the old Employee object against the
 * new form values — so Jabatan/Pangkat/Departemen/Lokasi changes are tracked as
 * history instead of silently overwritten.
 */
export async function logEmployeeMutation(input: {
  employeeId: string;
  fieldChanged: MutationField;
  oldValue?: string;
  newValue?: string;
  effectiveDate?: string;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.from("hpm_employee_mutations").insert({
    employee_id: input.employeeId,
    field_changed: input.fieldChanged,
    old_value: input.oldValue || null,
    new_value: input.newValue || null,
    effective_date: input.effectiveDate || new Date().toISOString().slice(0, 10),
    note: input.note || null,
  });
  if (error) throw error;
}

export async function getEmployeeMutations(employeeId: string): Promise<EmployeeMutation[]> {
  const { data, error } = await supabase
    .from("hpm_employee_mutations")
    .select(
      "id, employee_id, field_changed, old_value, new_value, effective_date, note, created_at",
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as MutationRow[]).map(toMutation);
}

// ---------- Locations (cabang/toko/gudang/pabrik) ----------

export type LocationType = "Kantor" | "Cabang" | "Toko" | "Gudang" | "Pabrik" | "Lainnya";

export type WorkLocation = {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  phone: string;
  parentLocationId?: string;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
};

type LocationRow = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  parent_location_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_meters: number;
};

function toLocation(row: LocationRow): WorkLocation {
  return {
    id: row.id,
    name: row.name,
    type: row.type as LocationType,
    address: row.address ?? "",
    phone: row.phone ?? "",
    ...(row.parent_location_id ? { parentLocationId: row.parent_location_id } : {}),
    lat: row.lat,
    lng: row.lng,
    radiusMeters: row.radius_meters,
  };
}

export async function getLocations(): Promise<WorkLocation[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_locations")
    .select("id, name, type, address, phone, parent_location_id, lat, lng, radius_meters")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as LocationRow[]).map(toLocation);
}

export async function addLocation(input: Omit<WorkLocation, "id">): Promise<WorkLocation> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_locations")
    .insert({
      company_id: companyId,
      name: input.name,
      type: input.type,
      address: input.address || null,
      phone: input.phone || null,
      parent_location_id: input.parentLocationId || null,
      lat: input.lat,
      lng: input.lng,
      radius_meters: input.radiusMeters,
    })
    .select("id, name, type, address, phone, parent_location_id, lat, lng, radius_meters")
    .single();
  if (error) throw error;
  return toLocation(data as LocationRow);
}

export async function updateLocation(
  id: string,
  patch: Partial<Omit<WorkLocation, "id">>,
): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_locations"]["Update"] = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.parentLocationId !== undefined)
    dbPatch.parent_location_id = patch.parentLocationId || null;
  if (patch.lat !== undefined) dbPatch.lat = patch.lat;
  if (patch.lng !== undefined) dbPatch.lng = patch.lng;
  if (patch.radiusMeters !== undefined) dbPatch.radius_meters = patch.radiusMeters;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from("hpm_locations").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_locations").delete().eq("id", id);
  if (error) throw error;
}

/**
 * The GPS point + radius attendance is actually checked against for this
 * employee: their assigned branch/store/warehouse (hpm_locations) if set,
 * otherwise the company's own default location (Settings > Titik Lokasi Kantor).
 */
export async function resolveEffectiveLocation(employee: Employee): Promise<{
  name: string;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
}> {
  if (employee.locationId) {
    const locations = await getLocations();
    const loc = locations.find((l) => l.id === employee.locationId);
    if (loc) return { name: loc.name, lat: loc.lat, lng: loc.lng, radiusMeters: loc.radiusMeters };
  }
  const company = await getCompanyProfile();
  return {
    name: company.name || "Kantor Pusat",
    lat: company.officeLat,
    lng: company.officeLng,
    radiusMeters: company.officeRadiusMeters,
  };
}

export async function getSubordinates(supervisorEmployeeId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("hpm_employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("supervisor_id", supervisorEmployeeId);
  if (error) throw error;
  return (data as EmployeeRow[]).map(toEmployee);
}

// ---------- Shift types (jam kerja — bisa lebih dari 3, tiap tipe punya hari sendiri) ----------

export type ShiftType = {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  daysOfWeek: number[]; // 0=Minggu .. 6=Sabtu
  lateGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
};

type ShiftTypeRow = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  late_grace_minutes: number;
  early_leave_grace_minutes: number;
};

function toShiftType(row: ShiftTypeRow): ShiftType {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    daysOfWeek: row.days_of_week ?? [1, 2, 3, 4, 5],
    lateGraceMinutes: row.late_grace_minutes ?? 15,
    earlyLeaveGraceMinutes: row.early_leave_grace_minutes ?? 60,
  };
}

const SHIFT_COLUMNS =
  "id, name, start_time, end_time, days_of_week, late_grace_minutes, early_leave_grace_minutes";

const DEFAULT_SHIFT_SEEDS: Omit<ShiftType, "id">[] = [
  {
    name: "Reguler",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    lateGraceMinutes: 15,
    earlyLeaveGraceMinutes: 60,
  },
  {
    name: "Shift Pagi",
    startTime: "06:00",
    endTime: "14:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    lateGraceMinutes: 15,
    earlyLeaveGraceMinutes: 60,
  },
  {
    name: "Shift Malam",
    startTime: "22:00",
    endTime: "06:00",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    lateGraceMinutes: 15,
    earlyLeaveGraceMinutes: 60,
  },
];

/** Auto-seeds 3 starting shift types (Reguler/Pagi/Malam) the first time this is called for a company — admin can rename, edit, or add more freely afterward. */
export async function getShiftTypes(): Promise<ShiftType[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_shift_types")
    .select(SHIFT_COLUMNS)
    .eq("company_id", companyId)
    .order("start_time", { ascending: true });
  if (error) throw error;
  const existing = (data as ShiftTypeRow[]).map(toShiftType);
  if (existing.length > 0) return existing;

  const { data: seeded, error: seedError } = await supabase
    .from("hpm_shift_types")
    .insert(
      DEFAULT_SHIFT_SEEDS.map((s) => ({
        company_id: companyId,
        name: s.name,
        start_time: s.startTime,
        end_time: s.endTime,
        days_of_week: s.daysOfWeek,
        late_grace_minutes: s.lateGraceMinutes,
        early_leave_grace_minutes: s.earlyLeaveGraceMinutes,
      })),
    )
    .select(SHIFT_COLUMNS);
  if (seedError) throw seedError;
  return (seeded as ShiftTypeRow[]).map(toShiftType);
}

export async function addShiftType(input: Omit<ShiftType, "id">): Promise<ShiftType> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_shift_types")
    .insert({
      company_id: companyId,
      name: input.name,
      start_time: input.startTime,
      end_time: input.endTime,
      days_of_week: input.daysOfWeek,
      late_grace_minutes: input.lateGraceMinutes,
      early_leave_grace_minutes: input.earlyLeaveGraceMinutes,
    })
    .select(SHIFT_COLUMNS)
    .single();
  if (error) throw error;
  return toShiftType(data as ShiftTypeRow);
}

export async function updateShiftType(
  id: string,
  patch: Partial<Omit<ShiftType, "id">>,
): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_shift_types"]["Update"] = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
  if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
  if (patch.daysOfWeek !== undefined) dbPatch.days_of_week = patch.daysOfWeek;
  if (patch.lateGraceMinutes !== undefined) dbPatch.late_grace_minutes = patch.lateGraceMinutes;
  if (patch.earlyLeaveGraceMinutes !== undefined)
    dbPatch.early_leave_grace_minutes = patch.earlyLeaveGraceMinutes;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from("hpm_shift_types").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteShiftType(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_shift_types").delete().eq("id", id);
  if (error) throw error;
}

/** True if `date` (default: today) falls on one of the shift's active days. */
export function isShiftActiveOn(shift: ShiftType, date = new Date()): boolean {
  return shift.daysOfWeek.includes(date.getDay());
}

/**
 * The shift an employee actually follows: their assigned hpm_shift_types row
 * if set, otherwise a synthetic shift built from the company's own default
 * jam kerja (Settings > Jam Kerja) so older employees without an explicit
 * assignment keep working exactly as before.
 */
export async function resolveEffectiveShift(employee: Employee): Promise<ShiftType> {
  if (employee.shiftTypeId) {
    const shifts = await getShiftTypes();
    const shift = shifts.find((s) => s.id === employee.shiftTypeId);
    if (shift) return shift;
  }
  const company = await getCompanyProfile();
  return {
    id: "company-default",
    name: "Default Perusahaan",
    startTime: company.workStartTime,
    endTime: company.workEndTime,
    daysOfWeek: [1, 2, 3, 4, 5],
    lateGraceMinutes: 15,
    earlyLeaveGraceMinutes: 60,
  };
}

/** Bulk-reassign every employee in one department to a shift type — e.g. rotating Security's shift. Logs one mutation entry per affected employee. */
export async function bulkAssignShiftToDepartment(
  department: string,
  shiftTypeId: string,
): Promise<number> {
  const employees = await getEmployees();
  const targets = employees.filter((e) => e.department === department);
  const shifts = await getShiftTypes();
  const newShiftName = shifts.find((s) => s.id === shiftTypeId)?.name ?? shiftTypeId;
  for (const emp of targets) {
    const oldShiftName = shifts.find((s) => s.id === emp.shiftTypeId)?.name;
    await updateEmployee(emp.id, { shiftTypeId });
    await logEmployeeMutation({
      employeeId: emp.id,
      fieldChanged: "shift",
      ...(oldShiftName ? { oldValue: oldShiftName } : {}),
      newValue: newShiftName,
      note: `Perubahan jadwal massal — departemen ${department}`,
    }).catch(() => {
      /* non-fatal — the shift assignment itself already succeeded */
    });
  }
  return targets.length;
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
  lat_out: string | null;
  long_out: string | null;
  distance_out_meters: number | null;
  is_outside_office_out: boolean | null;
  outside_location_note_out: string | null;
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
    latOut: row.lat_out ?? undefined,
    longOut: row.long_out ?? undefined,
    distanceOutMeters: row.distance_out_meters ?? undefined,
    isOutsideOfficeOut: row.is_outside_office_out ?? undefined,
    outsideLocationNoteOut: row.outside_location_note_out ?? undefined,
    photoDataUrl: row.photo_url ?? undefined,
    lateInReason: row.late_in_reason ?? undefined,
    lateOutReason: row.late_out_reason ?? undefined,
    needsSupervisorApproval: row.needs_supervisor_approval ?? false,
    status: (row.status as AttendanceStatus) ?? "PRESENT",
  };
}

const ATTENDANCE_COLUMNS =
  "id, employee_id, date, clock_in, clock_out, lat_in, long_in, distance_meters, is_outside_office, outside_location_note, outside_task_status, lat_out, long_out, distance_out_meters, is_outside_office_out, outside_location_note_out, photo_url, late_in_reason, late_out_reason, needs_supervisor_approval, status";

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

async function getAttendanceForEmployeeInRange(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("hpm_attendance")
    .select(ATTENDANCE_COLUMNS)
    .eq("employee_id", employeeId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

/** Standard scheduled hours for a shift, handling shifts that cross midnight (end time earlier than start time). */
function shiftStandardHours(shift: ShiftType): number {
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let minutes = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export type AttendanceSummary = {
  employeeId: string;
  presentDays: number;
  totalOvertimeHours: number;
};

/**
 * Attendance days + overtime hours for one employee over a period — the raw
 * numbers Finance's payroll needs (tunjangan makan × hari hadir, lembur ×
 * jam), instead of manually-typed flat amounts.
 *
 * Overtime = hours worked beyond the employee's shift's standard daily
 * hours; on a day their shift isn't scheduled at all, every hour worked
 * counts as overtime.
 */
export async function computeAttendanceSummary(
  employee: Employee,
  startDate: string,
  endDate: string,
): Promise<AttendanceSummary> {
  const [records, shift] = await Promise.all([
    getAttendanceForEmployeeInRange(employee.id, startDate, endDate),
    resolveEffectiveShift(employee),
  ]);

  const standardHours = shiftStandardHours(shift);
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }

  let totalOvertimeHours = 0;
  for (const [dateStr, sessions] of byDate) {
    const hoursWorked = sessions.reduce((sum, s) => {
      if (!s.clockIn || !s.clockOut) return sum;
      return sum + (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 3_600_000;
    }, 0);
    // Noon avoids any midnight/timezone boundary shifting the weekday by a day.
    const scheduledToday = isShiftActiveOn(shift, new Date(`${dateStr}T12:00:00`));
    totalOvertimeHours += scheduledToday ? Math.max(0, hoursWorked - standardHours) : hoursWorked;
  }

  return {
    employeeId: employee.id,
    presentDays: byDate.size,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
  };
}

/** Same as computeAttendanceSummary but for every employee at once — powers HRIS's Laporan Akhir and Finance's payroll compile. */
export async function computeAttendanceSummaryForAll(
  startDate: string,
  endDate: string,
): Promise<AttendanceSummary[]> {
  const employees = await getEmployees();
  return Promise.all(employees.map((e) => computeAttendanceSummary(e, startDate, endDate)));
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

export async function clockOut(
  employeeId: string,
  input?: {
    lateOutReason?: string;
    coords?: { lat: string; long: string };
    distanceMeters?: number;
    isOutsideOffice?: boolean;
    outsideLocationNote?: string;
  },
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("hpm_attendance")
    .update({
      clock_out: new Date().toISOString(),
      ...(input?.lateOutReason ? { late_out_reason: input.lateOutReason } : {}),
      ...(input?.coords ? { lat_out: input.coords.lat, long_out: input.coords.long } : {}),
      ...(input?.distanceMeters !== undefined ? { distance_out_meters: input.distanceMeters } : {}),
      ...(input?.isOutsideOffice !== undefined
        ? { is_outside_office_out: input.isOutsideOffice }
        : {}),
      ...(input?.outsideLocationNote
        ? { outside_location_note_out: input.outsideLocationNote }
        : {}),
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

/**
 * Builds one payroll line from an employee's stored rates + the real
 * attendance numbers for the period (from computeAttendanceSummary) —
 * tunjangan makan × hari hadir, lembur × jam, not manually typed amounts.
 * Transport/Jabatan/Kesehatan/Asuransi stay flat monthly. JHT is deducted
 * from the net salary (it's a BPJS Ketenagakerjaan deduction, not a
 * separate monthly allowance) — the once-off pension payout at age 55 is a
 * different calculation (see computePensionPayout).
 */
/**
 * Builds one payroll line from an employee's stored rates + the real
 * attendance numbers for the period (from computeAttendanceSummary) —
 * tunjangan makan × hari hadir, lembur × jam, not manually typed amounts.
 * Transport/Jabatan/Kesehatan/Asuransi stay flat monthly. JHT is a
 * company-wide percentage of basic salary (Pengaturan), not a manual
 * per-employee amount. Bonus/denda are one-off amounts for this specific
 * payroll run. The once-off pension payout at age 55 is a separate
 * calculation (see computePensionPayout).
 */
export function computePayroll(input: {
  employee: Employee;
  period: string;
  presentDays: number;
  overtimeHours: number;
  jhtRatePercent: number;
  bonus?: number;
  penalty?: number;
}): Omit<Payroll, "id" | "createdAt"> {
  const { employee, period, presentDays, overtimeHours, jhtRatePercent } = input;
  const bonus = input.bonus ?? 0;
  const penalty = input.penalty ?? 0;
  const basicSalary = employee.basicSalary ?? 0;
  const overtimePay = Math.round((employee.overtimeRatePerHour ?? 0) * overtimeHours);

  const mealRate = employee.mealAllowance ?? 0;
  const mealTotal = Math.round(mealRate * presentDays);
  const allowanceBreakdown = {
    transport: employee.transportAllowance ?? 0,
    position: employee.positionAllowance ?? 0,
    health: employee.healthAllowance ?? 0,
    insurance: employee.insuranceAllowance ?? 0,
    mealRate,
    mealDays: presentDays,
    mealTotal,
  };
  const allowances = Math.round(
    allowanceBreakdown.transport +
      allowanceBreakdown.position +
      allowanceBreakdown.health +
      allowanceBreakdown.insurance +
      mealTotal,
  );

  const bruto = basicSalary + allowances + overtimePay + bonus;
  const category = TER_CATEGORY[employee.ptkpStatus];
  const rate = terRate(category, bruto);
  const pph21Amount = Math.round(bruto * rate);

  const healthBasis = Math.min(basicSalary, BPJS_HEALTH_CAP);
  const bpjsHealthEmp = Math.round(healthBasis * 0.01);
  // JHT is deducted separately below via the company's configurable jhtRatePercent —
  // bpjsTkEmp here is JP (Jaminan Pensiun) only, so JHT isn't counted twice.
  const jpBasis = Math.min(basicSalary, BPJS_JP_CAP);
  const bpjsTkEmp = Math.round(jpBasis * 0.01);
  const jhtDeduction = Math.round(basicSalary * (jhtRatePercent / 100));

  const netSalary = bruto - pph21Amount - bpjsHealthEmp - bpjsTkEmp - jhtDeduction - penalty;

  return {
    employeeId: employee.id,
    period,
    basicSalary,
    allowances,
    allowanceBreakdown,
    overtimePay,
    bonus,
    penalty,
    bpjsHealthEmp,
    bpjsTkEmp,
    jhtDeduction,
    jhtRatePercent,
    pph21Amount,
    netSalary,
    paymentStatus: "DRAFT",
  };
}

/**
 * One-time retirement payout at age 55 — default government-standard
 * formula (pensionYearsMultiplier × years-of-service + pensionConstant) ×
 * basic salary, e.g. the common "2n+1". Both numbers are configurable in
 * Pengaturan. Returns null if the employee has no date of birth on file.
 */
export function computePensionPayout(
  employee: Employee,
  formula: { pensionYearsMultiplier: number; pensionConstant: number },
  asOfDate = new Date(),
): { age: number; yearsOfService: number; payout: number } | null {
  if (!employee.dateOfBirth) return null;
  const birth = new Date(employee.dateOfBirth);
  const age =
    asOfDate.getFullYear() -
    birth.getFullYear() -
    (asOfDate.getMonth() < birth.getMonth() ||
    (asOfDate.getMonth() === birth.getMonth() && asOfDate.getDate() < birth.getDate())
      ? 1
      : 0);
  const joined = employee.joinDate ? new Date(employee.joinDate) : asOfDate;
  const yearsOfService = Math.max(
    0,
    asOfDate.getFullYear() -
      joined.getFullYear() -
      (asOfDate.getMonth() < joined.getMonth() ||
      (asOfDate.getMonth() === joined.getMonth() && asOfDate.getDate() < joined.getDate())
        ? 1
        : 0),
  );
  const payout = Math.round(
    (formula.pensionYearsMultiplier * yearsOfService + formula.pensionConstant) *
      (employee.basicSalary ?? 0),
  );
  return { age, yearsOfService, payout };
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
