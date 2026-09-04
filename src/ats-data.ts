/**
 * ATS Recruitment data layer (client-side, localStorage-backed).
 * Mirrors db_ats_recruitment: job_vacancies, applicants. Fase 2 (MVP) scope —
 * AI CV parsing / adaptive tests / interview transcription are Fase 3 and
 * need a real backend + AI API key, so they're left as extension points.
 */
import {
  addEmployee,
  type Employee,
  type EmploymentStatus,
  type PtkpStatus,
} from "@/lib/hris-data";

export type VacancyStatus = "DRAFT" | "OPEN" | "CLOSED";
export type ApplicantStatus =
  "APPLIED" | "SCREENING" | "TESTING" | "INTERVIEW" | "OFFERED" | "HIRED" | "REJECTED";

export const APPLICANT_PIPELINE: ApplicantStatus[] = [
  "APPLIED",
  "SCREENING",
  "TESTING",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
];

export type JobVacancy = {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  status: VacancyStatus;
  createdAt: string;
};

export type Applicant = {
  id: string;
  jobVacancyId: string;
  fullName: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  aiMatchingScore: number;
  status: ApplicantStatus;
  offeredPosition?: string;
  offeredSalary?: number;
  handedOverEmployeeId?: string;
  createdAt: string;
};

const VACANCY_KEY = "aurora.hpm.vacancies.v1";
const APPLICANT_KEY = "aurora.hpm.applicants.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}
function write<T>(key: string, rows: T[]) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(rows));
}

// ---------- Job vacancies ----------

export function getVacancies(): JobVacancy[] {
  return read<JobVacancy>(VACANCY_KEY);
}

export function addVacancy(input: Omit<JobVacancy, "id" | "createdAt">): JobVacancy {
  const rows = getVacancies();
  const vacancy: JobVacancy = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  write(VACANCY_KEY, [...rows, vacancy]);
  return vacancy;
}

export function updateVacancyStatus(id: string, status: VacancyStatus) {
  write(
    VACANCY_KEY,
    getVacancies().map((v) => (v.id === id ? { ...v, status } : v)),
  );
}

// ---------- Applicants ----------

export function getApplicants(): Applicant[] {
  return read<Applicant>(APPLICANT_KEY);
}

function saveApplicants(rows: Applicant[]) {
  write(APPLICANT_KEY, rows);
}

export function addApplicant(input: Omit<Applicant, "id" | "createdAt" | "status">): Applicant {
  const rows = getApplicants();
  const applicant: Applicant = {
    ...input,
    id: crypto.randomUUID(),
    status: "APPLIED",
    createdAt: new Date().toISOString(),
  };
  saveApplicants([...rows, applicant]);
  return applicant;
}

/**
 * Advance an applicant's stage. When the new status is HIRED, this fires the
 * 1-Click Handover Bridge: POST /api/v1/hris/employees/handover-from-ats
 * equivalent — here, a local draft Employee record in Core HRIS.
 */
export function updateApplicantStatus(
  id: string,
  status: ApplicantStatus,
  handoverDetails?: {
    department: string;
    employmentStatus: EmploymentStatus;
    ptkpStatus: PtkpStatus;
  },
): { applicant: Applicant; handedOverEmployee: Employee | null } {
  const rows = getApplicants();
  const target = rows.find((a) => a.id === id);
  if (!target) throw new Error("Applicant not found");

  let handedOverEmployee: Employee | null = null;
  let handedOverEmployeeId = target.handedOverEmployeeId;

  if (status === "HIRED" && !target.handedOverEmployeeId && handoverDetails) {
    handedOverEmployee = addEmployee({
      nik: "",
      fullName: target.fullName,
      email: target.email,
      phone: target.phone,
      department: handoverDetails.department,
      employmentStatus: handoverDetails.employmentStatus,
      joinDate: new Date().toISOString().slice(0, 10),
      npwp: "",
      ptkpStatus: handoverDetails.ptkpStatus,
      basicSalary: target.offeredSalary ?? 0,
      isActive: true,
      source: "ATS_HANDOVER",
    });
    handedOverEmployeeId = handedOverEmployee.id;
  }

  const updated = rows.map((a) =>
    a.id === id ? { ...a, status, ...(handedOverEmployeeId ? { handedOverEmployeeId } : {}) } : a,
  );
  saveApplicants(updated);
  return { applicant: updated.find((a) => a.id === id)!, handedOverEmployee };
}
