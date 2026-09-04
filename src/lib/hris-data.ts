/**
 * Core HRIS data layer (client-side, localStorage-backed).
 * Mirrors the db_core_hris schema from the architecture spec: employees,
 * attendance, payrolls. No server yet — this is the Fase 1 MVP data model,
 * ready to be swapped for real API calls to /api/v1/hris/* later.
 */

export type EmploymentStatus = "PKWT" | "PKWTT" | "INTERN";
export type PtkpStatus = "TK/0" | "TK/1" | "TK/2" | "TK/3" | "K/0" | "K/1" | "K/2" | "K/3";
export type AttendanceStatus = "PRESENT" | "LATE" | "LEAVE" | "ALPHA";
export type PayrollStatus = "DRAFT" | "PAID";

export type Employee = {
  id: string;
  nik: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  employmentStatus: EmploymentStatus;
  joinDate: string;
  npwp: string;
  ptkpStatus: PtkpStatus;
  basicSalary: number;
  isActive: boolean;
  source?: "MANUAL" | "ATS_HANDOVER";
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  latIn?: string;
  longIn?: string;
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

const EMPLOYEES_KEY = "aurora.hpm.employees.v1";
const ATTENDANCE_KEY = "aurora.hpm.attendance.v1";
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

export function getEmployees(): Employee[] {
  return read<Employee>(EMPLOYEES_KEY);
}

export function saveEmployees(rows: Employee[]) {
  write(EMPLOYEES_KEY, rows);
}

export function addEmployee(input: Omit<Employee, "id" | "createdAt">): Employee {
  const rows = getEmployees();
  const employee: Employee = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveEmployees([...rows, employee]);
  return employee;
}

export function updateEmployee(id: string, patch: Partial<Employee>) {
  saveEmployees(getEmployees().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

// ---------- Attendance ----------

export function getAttendance(): AttendanceRecord[] {
  return read<AttendanceRecord>(ATTENDANCE_KEY);
}

function saveAttendance(rows: AttendanceRecord[]) {
  write(ATTENDANCE_KEY, rows);
}

export function todayRecordFor(employeeId: string): AttendanceRecord | null {
  const today = new Date().toISOString().slice(0, 10);
  return getAttendance().find((r) => r.employeeId === employeeId && r.date === today) ?? null;
}

/** Clock in with an optional GPS coordinate; marks LATE if after 09:00 local time. */
export function clockIn(employeeId: string, coords?: { lat: string; long: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const rows = getAttendance();
  if (rows.some((r) => r.employeeId === employeeId && r.date === today)) return;
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const record: AttendanceRecord = {
    id: crypto.randomUUID(),
    employeeId,
    date: today,
    clockIn: now.toISOString(),
    clockOut: null,
    ...(coords ? { latIn: coords.lat, longIn: coords.long } : {}),
    status: isLate ? "LATE" : "PRESENT",
  };
  saveAttendance([...rows, record]);
}

export function clockOut(employeeId: string) {
  const today = new Date().toISOString().slice(0, 10);
  saveAttendance(
    getAttendance().map((r) =>
      r.employeeId === employeeId && r.date === today
        ? { ...r, clockOut: new Date().toISOString() }
        : r,
    ),
  );
}

// ---------- Payroll: PPh 21 TER (PMK 168/2023) + BPJS ----------

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
