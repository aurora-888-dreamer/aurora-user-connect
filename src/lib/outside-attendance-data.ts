import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import { clockIn, clockOut } from "@/lib/hris-data";

export type OutsideAction = "clock_in" | "clock_out";
export type OutsideStage = "HRD" | "SUPERVISOR";
export type OutsideStatus = "PENDING" | "APPROVED" | "REJECTED";

export type OutsideAttendanceRequest = {
  id: string;
  employeeId: string;
  supervisorEmployeeId?: string;
  action: OutsideAction;
  coords?: { lat: string; long: string };
  distanceMeters?: number;
  locationNote?: string;
  taskStatus?: string;
  photoDataUrl?: string;
  stage: OutsideStage;
  status: OutsideStatus;
  decisionNote?: string;
  decidedAt?: string;
  requestedAt: string;
};

type OutsideRow = {
  id: string;
  employee_id: string;
  supervisor_employee_id: string | null;
  action: string;
  lat: string | null;
  long: string | null;
  distance_meters: number | null;
  location_note: string | null;
  task_status: string | null;
  photo_url: string | null;
  stage: string;
  status: string;
  decision_note: string | null;
  decided_at: string | null;
  requested_at: string;
};

const COLUMNS =
  "id, employee_id, supervisor_employee_id, action, lat, long, distance_meters, location_note, task_status, photo_url, stage, status, decision_note, decided_at, requested_at";

function toRequest(row: OutsideRow): OutsideAttendanceRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    ...(row.supervisor_employee_id ? { supervisorEmployeeId: row.supervisor_employee_id } : {}),
    action: row.action as OutsideAction,
    ...(row.lat && row.long ? { coords: { lat: row.lat, long: row.long } } : {}),
    ...(row.distance_meters !== null ? { distanceMeters: Number(row.distance_meters) } : {}),
    ...(row.location_note ? { locationNote: row.location_note } : {}),
    ...(row.task_status ? { taskStatus: row.task_status } : {}),
    ...(row.photo_url ? { photoDataUrl: row.photo_url } : {}),
    stage: row.stage as OutsideStage,
    status: row.status as OutsideStatus,
    ...(row.decision_note ? { decisionNote: row.decision_note } : {}),
    ...(row.decided_at ? { decidedAt: row.decided_at } : {}),
    requestedAt: row.requested_at,
  };
}

/** Staff-side: ask HRD for permission to clock in/out from outside the office area. */
export async function submitOutsideRequest(input: {
  employeeId: string;
  supervisorEmployeeId?: string;
  action: OutsideAction;
  coords?: { lat: string; long: string };
  distanceMeters?: number;
  locationNote?: string;
  taskStatus?: string;
  photoDataUrl?: string;
}): Promise<OutsideAttendanceRequest> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_outside_requests" as never)
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      supervisor_employee_id: input.supervisorEmployeeId ?? null,
      action: input.action,
      lat: input.coords?.lat ?? null,
      long: input.coords?.long ?? null,
      distance_meters: input.distanceMeters ?? null,
      location_note: input.locationNote ?? null,
      task_status: input.taskStatus ?? null,
      photo_url: input.photoDataUrl ?? null,
      stage: "HRD",
      status: "PENDING",
    } as never)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toRequest(data as unknown as OutsideRow);
}

/** Requests waiting on an HRD decision. */
export async function getPendingHrdOutsideRequests(): Promise<OutsideAttendanceRequest[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_outside_requests" as never)
    .select(COLUMNS)
    .eq("company_id", companyId)
    .eq("stage", "HRD")
    .eq("status", "PENDING")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as OutsideRow[]).map(toRequest);
}

/** Requests HRD forwarded to this employee's supervisor for the final call. */
export async function getPendingSupervisorOutsideRequests(
  supervisorEmployeeId: string,
): Promise<OutsideAttendanceRequest[]> {
  const { data, error } = await supabase
    .from("hpm_outside_requests" as never)
    .select(COLUMNS)
    .eq("supervisor_employee_id", supervisorEmployeeId)
    .eq("stage", "SUPERVISOR")
    .eq("status", "PENDING")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as OutsideRow[]).map(toRequest);
}

/** Own requests, newest first. */
export async function getMyOutsideRequests(
  employeeId: string,
): Promise<OutsideAttendanceRequest[]> {
  const { data, error } = await supabase
    .from("hpm_outside_requests" as never)
    .select(COLUMNS)
    .eq("employee_id", employeeId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as OutsideRow[]).map(toRequest);
}

async function applyApprovedAttendance(request: OutsideAttendanceRequest): Promise<void> {
  if (request.action === "clock_in") {
    await clockIn(request.employeeId, {
      ...(request.coords ? { coords: request.coords } : {}),
      ...(request.distanceMeters !== undefined ? { distanceMeters: request.distanceMeters } : {}),
      isOutsideOffice: true,
      ...(request.locationNote ? { outsideLocationNote: request.locationNote } : {}),
      ...(request.taskStatus ? { outsideTaskStatus: request.taskStatus } : {}),
      ...(request.photoDataUrl ? { photoDataUrl: request.photoDataUrl } : {}),
    });
  } else {
    await clockOut(request.employeeId);
  }
}

/**
 * HRD decision: approve (attendance is recorded straight away), reject, or
 * forward the call to the employee's own supervisor.
 */
export async function decideOutsideRequestAsHrd(
  request: OutsideAttendanceRequest,
  decision: "APPROVED" | "REJECTED" | "FORWARD",
  decisionNote?: string,
): Promise<void> {
  if (decision === "FORWARD") {
    if (!request.supervisorEmployeeId) {
      throw new Error("Karyawan ini belum punya atasan di data HRIS — tidak bisa di-forward.");
    }
    const { error } = await supabase
      .from("hpm_outside_requests" as never)
      .update({ stage: "SUPERVISOR", decision_note: decisionNote || null } as never)
      .eq("id", request.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("hpm_outside_requests" as never)
    .update({
      status: decision,
      decision_note: decisionNote || null,
      decided_at: new Date().toISOString(),
    } as never)
    .eq("id", request.id);
  if (error) throw error;

  if (decision === "APPROVED") await applyApprovedAttendance(request);
}

/** Final decision by the employee's supervisor after HRD forwarded it. */
export async function decideOutsideRequestAsSupervisor(
  request: OutsideAttendanceRequest,
  decision: "APPROVED" | "REJECTED",
  decisionNote?: string,
): Promise<void> {
  const { error } = await supabase
    .from("hpm_outside_requests" as never)
    .update({
      status: decision,
      decision_note: decisionNote || null,
      decided_at: new Date().toISOString(),
    } as never)
    .eq("id", request.id);
  if (error) throw error;
  if (decision === "APPROVED") await applyApprovedAttendance(request);
}
