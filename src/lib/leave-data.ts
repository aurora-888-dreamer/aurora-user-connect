import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";

export type ReasonCategory = "Sakit" | "Keperluan Keluarga" | "Cuti Tahunan" | "Lainnya";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export const REASON_CATEGORIES: ReasonCategory[] = [
  "Sakit",
  "Keperluan Keluarga",
  "Cuti Tahunan",
  "Lainnya",
];

export type LeaveRequest = {
  id: string;
  employeeId: string;
  supervisorEmployeeId?: string;
  reasonCategory: ReasonCategory;
  note?: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
};

type LeaveRow = {
  id: string;
  employee_id: string;
  supervisor_employee_id: string | null;
  reason_category: string;
  note: string | null;
  start_date: string;
  end_date: string;
  status: string;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
};

function toLeaveRequest(row: LeaveRow): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    ...(row.supervisor_employee_id ? { supervisorEmployeeId: row.supervisor_employee_id } : {}),
    reasonCategory: row.reason_category as ReasonCategory,
    ...(row.note ? { note: row.note } : {}),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as LeaveStatus,
    ...(row.decided_at ? { decidedAt: row.decided_at } : {}),
    ...(row.decision_note ? { decisionNote: row.decision_note } : {}),
    createdAt: row.created_at,
  };
}

const LEAVE_COLUMNS =
  "id, employee_id, supervisor_employee_id, reason_category, note, start_date, end_date, status, decided_at, decision_note, created_at";

export async function submitLeaveRequest(input: {
  employeeId: string;
  supervisorEmployeeId?: string;
  reasonCategory: ReasonCategory;
  note?: string;
  startDate: string;
  endDate: string;
}): Promise<LeaveRequest> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_leave_requests")
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      supervisor_employee_id: input.supervisorEmployeeId || null,
      reason_category: input.reasonCategory,
      note: input.note || null,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select(LEAVE_COLUMNS)
    .single();
  if (error) throw error;
  return toLeaveRequest(data as LeaveRow);
}

/** All of this employee's own requests, newest first — for "Hasil Pengajuan Saya". */
export async function getMyLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("hpm_leave_requests")
    .select(LEAVE_COLUMNS)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LeaveRow[]).map(toLeaveRequest);
}

/** Pending requests waiting on this employee's decision, as their subordinates' supervisor. */
export async function getPendingApprovalsFor(
  supervisorEmployeeId: string,
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("hpm_leave_requests")
    .select(LEAVE_COLUMNS)
    .eq("supervisor_employee_id", supervisorEmployeeId)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as LeaveRow[]).map(toLeaveRequest);
}

export async function decideLeaveRequest(
  id: string,
  status: "APPROVED" | "REJECTED",
  decisionNote?: string,
): Promise<void> {
  const { error } = await supabase
    .from("hpm_leave_requests")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decision_note: decisionNote || null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** HR-side visibility across every request in the company. */
export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_leave_requests")
    .select(LEAVE_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LeaveRow[]).map(toLeaveRequest);
}
