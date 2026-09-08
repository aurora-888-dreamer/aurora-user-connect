import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { getEmployees, getAttendance, type Employee, type AttendanceRecord } from "@/lib/hris-data";

export type PeoplePulseRow = {
  employeeId: string;
  fullName: string;
  department: string;
  photoDataUrl?: string;
  clockIn?: string;
  status: "Hadir" | "Telat" | "Belum Absen";
};

export type ContractAlert = { employee: Employee; daysLeft: number };
export type BirthdayAlert = { employee: Employee; daysUntil: number };

export type OrgHealthRow = {
  department: string;
  headcount: number;
  lateToday: number;
  absentToday: number;
  resignedMTD: number;
};

export type HrdDashboardData = {
  headcount: number;
  attendancePercentToday: number;
  turnoverMTD: number;
  peoplePulseToday: PeoplePulseRow[];
  contractAlerts: ContractAlert[];
  birthdayAlerts: BirthdayAlert[];
  orgHealth: OrgHealthRow[];
  pendingLeaveCount: number;
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Next occurrence of a birthdate (month/day) from today, in days — 0 if today. */
function daysUntilNextBirthday(dateOfBirth: string, today: Date): number {
  const dob = new Date(dateOfBirth);
  const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return daysBetween(new Date(today.toDateString()), new Date(next.toDateString()));
}

export async function getHrdDashboardData(): Promise<HrdDashboardData> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = todayStr.slice(0, 7); // YYYY-MM

  const [employees, allAttendance] = await Promise.all([getEmployees(), getAttendance()]);
  const activeEmployees = employees.filter((e) => e.isActive);
  const headcount = activeEmployees.length;

  const todayAttendance = allAttendance.filter((a) => a.date === todayStr);
  const attendanceByEmployee = new Map<string, AttendanceRecord[]>();
  for (const a of todayAttendance) {
    const list = attendanceByEmployee.get(a.employeeId) ?? [];
    list.push(a);
    attendanceByEmployee.set(a.employeeId, list);
  }
  const presentCount = attendanceByEmployee.size;
  const attendancePercentToday = headcount > 0 ? Math.round((presentCount / headcount) * 100) : 0;

  const turnoverMTD = employees.filter(
    (e) => e.resignDate && e.resignDate.startsWith(monthStart),
  ).length;

  const peoplePulseToday: PeoplePulseRow[] = activeEmployees.map((e) => {
    const records = attendanceByEmployee.get(e.id);
    const record = records?.[0];
    return {
      employeeId: e.id,
      fullName: e.fullName,
      department: e.department || "—",
      ...(record?.photoDataUrl ? { photoDataUrl: record.photoDataUrl } : {}),
      ...(record?.clockIn ? { clockIn: record.clockIn } : {}),
      status: !record ? "Belum Absen" : record.status === "LATE" ? "Telat" : "Hadir",
    };
  });

  const contractAlerts: ContractAlert[] = activeEmployees
    .filter((e) => e.contractEndDate)
    .map((e) => ({ employee: e, daysLeft: daysBetween(today, new Date(e.contractEndDate!)) }))
    .filter((a) => a.daysLeft >= 0 && a.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const birthdayAlerts: BirthdayAlert[] = activeEmployees
    .filter((e) => e.dateOfBirth)
    .map((e) => ({ employee: e, daysUntil: daysUntilNextBirthday(e.dateOfBirth!, today) }))
    .filter((a) => a.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const departments = Array.from(
    new Set(activeEmployees.map((e) => e.department || "Tanpa Departemen")),
  );
  const orgHealth: OrgHealthRow[] = departments.map((dept) => {
    const deptEmployees = activeEmployees.filter(
      (e) => (e.department || "Tanpa Departemen") === dept,
    );
    const deptHeadcount = deptEmployees.length;
    let lateToday = 0;
    let absentToday = 0;
    for (const e of deptEmployees) {
      const records = attendanceByEmployee.get(e.id);
      if (!records) absentToday++;
      else if (records.some((r) => r.status === "LATE")) lateToday++;
    }
    const resignedMTD = employees.filter(
      (e) =>
        (e.department || "Tanpa Departemen") === dept &&
        e.resignDate &&
        e.resignDate.startsWith(monthStart),
    ).length;
    return { department: dept, headcount: deptHeadcount, lateToday, absentToday, resignedMTD };
  });

  // Pending leave requests company-wide — count only, list lives in HRIS's own approval views.
  const companyId = await getOrCreateCompanyId();
  const { count } = await supabase
    .from("hpm_leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "PENDING");

  return {
    headcount,
    attendancePercentToday,
    turnoverMTD,
    peoplePulseToday,
    contractAlerts,
    birthdayAlerts,
    orgHealth,
    pendingLeaveCount: count ?? 0,
  };
}
