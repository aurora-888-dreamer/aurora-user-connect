import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import {
  getPayrolls,
  getEmployees,
  computeAttendanceSummaryForAll,
  type Payroll,
  type Employee,
} from "@/lib/hris-data";
import { getCompanyProfile, getPreviousPayrollPeriod } from "@/lib/company-data";

// ---------- Kasbon ----------

export type KasbonStatus = "OUTSTANDING" | "PAID_OFF";
export type Kasbon = {
  id: string;
  employeeId: string;
  amount: number;
  reason?: string;
  status: KasbonStatus;
  requestedAt: string;
};

type KasbonRow = {
  id: string;
  employee_id: string;
  amount: number;
  reason: string | null;
  status: string;
  requested_at: string;
};

function toKasbon(row: KasbonRow): Kasbon {
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: row.amount,
    ...(row.reason ? { reason: row.reason } : {}),
    status: row.status as KasbonStatus,
    requestedAt: row.requested_at,
  };
}

export async function getKasbonList(): Promise<Kasbon[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_kasbon")
    .select("id, employee_id, amount, reason, status, requested_at")
    .eq("company_id", companyId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data as KasbonRow[]).map(toKasbon);
}

export async function addKasbon(input: {
  employeeId: string;
  amount: number;
  reason?: string;
}): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  const { error } = await supabase.from("hpm_kasbon").insert({
    company_id: companyId,
    employee_id: input.employeeId,
    amount: input.amount,
    reason: input.reason || null,
  });
  if (error) throw error;
}

export async function markKasbonPaidOff(id: string): Promise<void> {
  const { error } = await supabase
    .from("hpm_kasbon")
    .update({ status: "PAID_OFF", paid_off_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------- Compliance Checklist ----------

export type ComplianceStatus = "BELUM_LUNAS" | "PROSES" | "LUNAS";
export type ComplianceItem = {
  id: string;
  category: string;
  period: string;
  deadline?: string;
  amount?: number;
  status: ComplianceStatus;
  note?: string;
};

type ComplianceRow = {
  id: string;
  category: string;
  period: string;
  deadline: string | null;
  amount: number | null;
  status: string;
  note: string | null;
};

function toCompliance(row: ComplianceRow): ComplianceItem {
  return {
    id: row.id,
    category: row.category,
    period: row.period,
    ...(row.deadline ? { deadline: row.deadline } : {}),
    ...(row.amount !== null ? { amount: row.amount } : {}),
    status: row.status as ComplianceStatus,
    ...(row.note ? { note: row.note } : {}),
  };
}

export const COMPLIANCE_CATEGORIES = ["BPJS Kesehatan", "BPJS TK", "PPh21", "THR", "Wajib Lapor"];

export async function getComplianceItems(period: string): Promise<ComplianceItem[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_compliance_items")
    .select("id, category, period, deadline, amount, status, note")
    .eq("company_id", companyId)
    .eq("period", period)
    .order("category", { ascending: true });
  if (error) throw error;
  return (data as ComplianceRow[]).map(toCompliance);
}

export async function upsertComplianceItem(input: {
  id?: string;
  category: string;
  period: string;
  deadline?: string;
  amount?: number;
  status: ComplianceStatus;
  note?: string;
}): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  if (input.id) {
    const { error } = await supabase
      .from("hpm_compliance_items")
      .update({
        deadline: input.deadline || null,
        amount: input.amount ?? null,
        status: input.status,
        note: input.note || null,
      })
      .eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("hpm_compliance_items").insert({
      company_id: companyId,
      category: input.category,
      period: input.period,
      deadline: input.deadline || null,
      amount: input.amount ?? null,
      status: input.status,
      note: input.note || null,
    });
    if (error) throw error;
  }
}

// ---------- Dashboard aggregation ----------

export type CostBreakdown = {
  basicSalary: number;
  allowances: number;
  overtime: number;
  bpjs: number;
  pph21: number;
};

export type PayrollStageCounts = Record<Payroll["paymentStatus"], number>;

export type OvertimeAnomaly = { employee: Employee; hours: number };
export type KasbonAnomaly = { employee: Employee; kasbonTotal: number; basicSalary: number };

export type FinanceDashboardData = {
  currentPeriodLabel: string;
  totalPayrollThisMonth: number;
  totalOvertimeThisMonth: number;
  totalKasbonOutstanding: number;
  complianceLunasCount: number;
  complianceTotalCount: number;
  stageCounts: PayrollStageCounts;
  costBreakdown: CostBreakdown;
  overtimeAnomalies: OvertimeAnomaly[];
  kasbonAnomalies: KasbonAnomaly[];
  history6Months: { period: string; total: number }[];
};

export async function getFinanceDashboardData(): Promise<FinanceDashboardData> {
  const [payrolls, employees, kasbonList, company] = await Promise.all([
    Promise.resolve(getPayrolls()),
    getEmployees(),
    getKasbonList(),
    getCompanyProfile(),
  ]);

  const currentPeriod = getPreviousPayrollPeriod(company.payrollCutoffDay);
  const thisMonthPayrolls = payrolls.filter((p) => p.period === currentPeriod.label);

  const totalPayrollThisMonth = thisMonthPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const totalOvertimeThisMonth = thisMonthPayrolls.reduce((sum, p) => sum + p.overtimePay, 0);

  const outstandingKasbon = kasbonList.filter((k) => k.status === "OUTSTANDING");
  const totalKasbonOutstanding = outstandingKasbon.reduce((sum, k) => sum + k.amount, 0);

  const complianceItems = await getComplianceItems(currentPeriod.label);
  const complianceLunasCount = complianceItems.filter((c) => c.status === "LUNAS").length;

  const stageCounts: PayrollStageCounts = {
    DRAFT: 0,
    PENDING_APPROVAL: 0,
    APPROVED: 0,
    PAID: 0,
  };
  for (const p of thisMonthPayrolls) stageCounts[p.paymentStatus]++;

  const costBreakdown = thisMonthPayrolls.reduce<CostBreakdown>(
    (acc, p) => ({
      basicSalary: acc.basicSalary + p.basicSalary,
      allowances: acc.allowances + p.allowances,
      overtime: acc.overtime + p.overtimePay,
      bpjs: acc.bpjs + p.bpjsHealthEmp + p.bpjsTkEmp + p.jhtDeduction,
      pph21: acc.pph21 + p.pph21Amount,
    }),
    { basicSalary: 0, allowances: 0, overtime: 0, bpjs: 0, pph21: 0 },
  );

  // Anomaly: overtime > 40 jam bulan ini.
  const summaries = await computeAttendanceSummaryForAll(currentPeriod.start, currentPeriod.end);
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const overtimeAnomalies: OvertimeAnomaly[] = summaries
    .filter((s) => s.totalOvertimeHours > 40)
    .map((s) => ({ employee: employeeById.get(s.employeeId)!, hours: s.totalOvertimeHours }))
    .filter((a) => a.employee);

  // Anomaly: kasbon outstanding > 2x gaji pokok.
  const kasbonByEmployee = new Map<string, number>();
  for (const k of outstandingKasbon) {
    kasbonByEmployee.set(k.employeeId, (kasbonByEmployee.get(k.employeeId) ?? 0) + k.amount);
  }
  const kasbonAnomalies: KasbonAnomaly[] = Array.from(kasbonByEmployee.entries())
    .map(([employeeId, kasbonTotal]) => {
      const employee = employeeById.get(employeeId);
      return employee ? { employee, kasbonTotal, basicSalary: employee.basicSalary ?? 0 } : null;
    })
    .filter(
      (a): a is KasbonAnomaly => !!a && a.basicSalary > 0 && a.kasbonTotal > a.basicSalary * 2,
    );

  // Riwayat 6 bulan — dikelompokkan per label periode yang sama persis dengan payroll.period.
  const totalsByPeriod = new Map<string, number>();
  for (const p of payrolls) {
    totalsByPeriod.set(p.period, (totalsByPeriod.get(p.period) ?? 0) + p.netSalary);
  }
  const history6Months = Array.from(totalsByPeriod.entries())
    .map(([period, total]) => ({ period, total }))
    .slice(-6);

  return {
    currentPeriodLabel: currentPeriod.label,
    totalPayrollThisMonth,
    totalOvertimeThisMonth,
    totalKasbonOutstanding,
    complianceLunasCount,
    complianceTotalCount: complianceItems.length,
    stageCounts,
    costBreakdown,
    overtimeAnomalies,
    kasbonAnomalies,
    history6Months,
  };
}
