import { supabase } from "@/integrations/supabase/client";
import { getOrCreateCompanyId } from "@/lib/company-data";
import type { Database } from "@/integrations/supabase/types";

// ---------- Org Units (tree) ----------

export type OrgUnit = {
  id: string;
  parentUnitId?: string;
  name: string;
  orderIndex: number;
};

type OrgUnitRow = { id: string; parent_unit_id: string | null; name: string; order_index: number };

function toOrgUnit(row: OrgUnitRow): OrgUnit {
  return {
    id: row.id,
    ...(row.parent_unit_id ? { parentUnitId: row.parent_unit_id } : {}),
    name: row.name,
    orderIndex: row.order_index,
  };
}

export async function getOrgUnits(): Promise<OrgUnit[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_org_units")
    .select("id, parent_unit_id, name, order_index")
    .eq("company_id", companyId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as OrgUnitRow[]).map(toOrgUnit);
}

export async function addOrgUnit(input: {
  name: string;
  parentUnitId?: string | null;
  orderIndex?: number;
}): Promise<OrgUnit> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_org_units")
    .insert({
      company_id: companyId,
      name: input.name,
      parent_unit_id: input.parentUnitId || null,
      order_index: input.orderIndex ?? 0,
    })
    .select("id, parent_unit_id, name, order_index")
    .single();
  if (error) throw error;
  return toOrgUnit(data as OrgUnitRow);
}

export async function updateOrgUnit(
  id: string,
  patch: Partial<{ name: string; parentUnitId: string | null; orderIndex: number }>,
): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_org_units"]["Update"] = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.parentUnitId !== undefined) dbPatch.parent_unit_id = patch.parentUnitId;
  if (patch.orderIndex !== undefined) dbPatch.order_index = patch.orderIndex;
  const { error } = await supabase.from("hpm_org_units").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteOrgUnit(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_org_units").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Job Levels ----------

export type JobLevel = { id: string; name: string; levelOrder: number };
type JobLevelRow = { id: string; name: string; level_order: number };

export async function getJobLevels(): Promise<JobLevel[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_job_levels")
    .select("id, name, level_order")
    .eq("company_id", companyId)
    .order("level_order", { ascending: true });
  if (error) throw error;
  return (data as JobLevelRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    levelOrder: r.level_order,
  }));
}

export async function addJobLevel(name: string, levelOrder: number): Promise<JobLevel> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_job_levels")
    .insert({ company_id: companyId, name, level_order: levelOrder })
    .select("id, name, level_order")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, levelOrder: data.level_order };
}

export async function deleteJobLevel(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_job_levels").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Positions ----------

export type Position = {
  id: string;
  orgUnitId: string;
  name: string;
  jobLevelId?: string;
  reportsToPositionId?: string;
  orderIndex: number;
};

type PositionRow = {
  id: string;
  org_unit_id: string;
  name: string;
  job_level_id: string | null;
  reports_to_position_id: string | null;
  order_index: number;
};

function toPosition(row: PositionRow): Position {
  return {
    id: row.id,
    orgUnitId: row.org_unit_id,
    name: row.name,
    ...(row.job_level_id ? { jobLevelId: row.job_level_id } : {}),
    ...(row.reports_to_position_id ? { reportsToPositionId: row.reports_to_position_id } : {}),
    orderIndex: row.order_index,
  };
}

const POSITION_COLUMNS = "id, org_unit_id, name, job_level_id, reports_to_position_id, order_index";

export async function getPositions(): Promise<Position[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_positions")
    .select(POSITION_COLUMNS)
    .eq("company_id", companyId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as PositionRow[]).map(toPosition);
}

export async function addPosition(input: {
  orgUnitId: string;
  name: string;
  jobLevelId?: string | null;
  reportsToPositionId?: string | null;
  orderIndex?: number;
}): Promise<Position> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_positions")
    .insert({
      company_id: companyId,
      org_unit_id: input.orgUnitId,
      name: input.name,
      job_level_id: input.jobLevelId || null,
      reports_to_position_id: input.reportsToPositionId || null,
      order_index: input.orderIndex ?? 0,
    })
    .select(POSITION_COLUMNS)
    .single();
  if (error) throw error;
  return toPosition(data as PositionRow);
}

export async function updatePosition(
  id: string,
  patch: Partial<{
    name: string;
    orgUnitId: string;
    jobLevelId: string | null;
    reportsToPositionId: string | null;
    orderIndex: number;
  }>,
): Promise<void> {
  const dbPatch: Database["public"]["Tables"]["hpm_positions"]["Update"] = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.orgUnitId !== undefined) dbPatch.org_unit_id = patch.orgUnitId;
  if (patch.jobLevelId !== undefined) dbPatch.job_level_id = patch.jobLevelId;
  if (patch.reportsToPositionId !== undefined)
    dbPatch.reports_to_position_id = patch.reportsToPositionId;
  if (patch.orderIndex !== undefined) dbPatch.order_index = patch.orderIndex;
  const { error } = await supabase.from("hpm_positions").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deletePosition(id: string): Promise<void> {
  const { error } = await supabase.from("hpm_positions").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Ranks & Salary Grades (optional, toggled on/off per company) ----------

export type NamedItem = { id: string; name: string; orderIndex: number };

async function getNamedList(table: "hpm_ranks" | "hpm_salary_grades"): Promise<NamedItem[]> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from(table)
    .select("id, name, order_index")
    .eq("company_id", companyId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({ id: r.id, name: r.name, orderIndex: r.order_index }));
}

async function addNamedItem(
  table: "hpm_ranks" | "hpm_salary_grades",
  name: string,
  orderIndex: number,
): Promise<NamedItem> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from(table)
    .insert({ company_id: companyId, name, order_index: orderIndex })
    .select("id, name, order_index")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, orderIndex: data.order_index };
}

async function deleteNamedItem(
  table: "hpm_ranks" | "hpm_salary_grades",
  id: string,
): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export const getRanks = () => getNamedList("hpm_ranks");
export const addRank = (name: string, orderIndex: number) =>
  addNamedItem("hpm_ranks", name, orderIndex);
export const deleteRank = (id: string) => deleteNamedItem("hpm_ranks", id);

export const getSalaryGrades = () => getNamedList("hpm_salary_grades");
export const addSalaryGrade = (name: string, orderIndex: number) =>
  addNamedItem("hpm_salary_grades", name, orderIndex);
export const deleteSalaryGrade = (id: string) => deleteNamedItem("hpm_salary_grades", id);

// ---------- Company org config ----------

export type OrgType =
  | "Private Company"
  | "Government"
  | "BUMN/BUMD"
  | "School/University"
  | "Hospital/Healthcare"
  | "Non-Profit/Foundation"
  | "Other";

export const ORG_TYPES: OrgType[] = [
  "Private Company",
  "Government",
  "BUMN/BUMD",
  "School/University",
  "Hospital/Healthcare",
  "Non-Profit/Foundation",
  "Other",
];

export type OrgConfig = {
  orgType?: OrgType;
  jobLevelEnabled: boolean;
  rankGradeEnabled: boolean;
  salaryGradeEnabled: boolean;
};

export async function getOrgConfig(): Promise<OrgConfig> {
  const companyId = await getOrCreateCompanyId();
  const { data, error } = await supabase
    .from("hpm_companies")
    .select("org_type, job_level_enabled, rank_grade_enabled, salary_grade_enabled")
    .eq("id", companyId)
    .single();
  if (error) throw error;
  return {
    ...(data.org_type ? { orgType: data.org_type as OrgType } : {}),
    jobLevelEnabled: data.job_level_enabled,
    rankGradeEnabled: data.rank_grade_enabled,
    salaryGradeEnabled: data.salary_grade_enabled,
  };
}

export async function saveOrgConfig(config: OrgConfig): Promise<void> {
  const companyId = await getOrCreateCompanyId();
  const { error } = await supabase
    .from("hpm_companies")
    .update({
      org_type: config.orgType || null,
      job_level_enabled: config.jobLevelEnabled,
      rank_grade_enabled: config.rankGradeEnabled,
      salary_grade_enabled: config.salaryGradeEnabled,
    })
    .eq("id", companyId);
  if (error) throw error;
}

// ---------- Structure Templates (from the design doc) ----------

type UnitTemplate = {
  name: string;
  positionChain: string[];
  children?: UnitTemplate[];
};

export type StructureTemplateKey =
  | "simple"
  | "standard"
  | "corporate"
  | "functional"
  | "government"
  | "government_functional"
  | "school"
  | "custom";

export const STRUCTURE_TEMPLATES: Record<
  StructureTemplateKey,
  { label: string; description: string; root: UnitTemplate }
> = {
  simple: {
    label: "1. Simple",
    description: "Owner/Head → Manager → Staff",
    root: { name: "Organisasi", positionChain: ["Owner / Head", "Manager", "Staff"] },
  },
  standard: {
    label: "2. Standard Company",
    description: "Director → Manager → Supervisor → Staff",
    root: { name: "Organisasi", positionChain: ["Director", "Manager", "Supervisor", "Staff"] },
  },
  corporate: {
    label: "3. Corporate",
    description: "Board → Director → Division Head → Manager → Supervisor → Staff",
    root: {
      name: "Organisasi",
      positionChain: ["Board", "Director", "Division Head", "Manager", "Supervisor", "Staff"],
    },
  },
  functional: {
    label: "4. Functional",
    description: "Head → Department Head → Specialist/Staff",
    root: { name: "Organisasi", positionChain: ["Head", "Department Head", "Specialist / Staff"] },
  },
  government: {
    label: "5. Government",
    description: "Head → Division/Department → Section → Staff",
    root: {
      name: "Kantor Pusat",
      positionChain: ["Head"],
      children: [
        {
          name: "Divisi/Department",
          positionChain: ["Division Head"],
          children: [{ name: "Seksi", positionChain: ["Section Head", "Staff"] }],
        },
      ],
    },
  },
  government_functional: {
    label: "6. Government + Functional",
    description: "Head → Structural Positions + Functional Positions",
    root: {
      name: "Kantor Pusat",
      positionChain: ["Head"],
      children: [
        { name: "Struktural", positionChain: ["Division Head", "Section Head", "Staff"] },
        { name: "Fungsional", positionChain: ["Pejabat Fungsional"] },
      ],
    },
  },
  school: {
    label: "7. School / University",
    description: "Head → Division/Unit → Coordinator → Teacher/Lecturer/Staff",
    root: {
      name: "Sekolah",
      positionChain: ["Head"],
      children: [
        { name: "Divisi/Unit", positionChain: ["Coordinator", "Teacher / Lecturer / Staff"] },
      ],
    },
  },
  custom: {
    label: "8. Custom",
    description: "Admin menentukan sendiri seluruh level dan hubungan",
    root: { name: "Organisasi", positionChain: [] },
  },
};

async function seedUnit(
  tpl: UnitTemplate,
  parentUnitId: string | null,
  chainTailPositionId: string | null,
  orderIndex: number,
): Promise<void> {
  const unit = await addOrgUnit({ name: tpl.name, parentUnitId, orderIndex });
  let reportsTo = chainTailPositionId;
  let posOrder = 0;
  for (const posName of tpl.positionChain) {
    const pos = await addPosition({
      orgUnitId: unit.id,
      name: posName,
      reportsToPositionId: reportsTo,
      orderIndex: posOrder++,
    });
    reportsTo = pos.id;
  }
  let childOrder = 0;
  for (const child of tpl.children ?? []) {
    await seedUnit(child, unit.id, reportsTo, childOrder++);
  }
}

/** Seeds the org tree from one or more templates — each selected template becomes its own top-level branch (e.g. "Akademik" + "Korporat" side by side for a mixed School+Corporate setup). Fully editable afterward. */
export async function applyStructureTemplates(keys: StructureTemplateKey[]): Promise<void> {
  let order = 0;
  for (const key of keys) {
    await seedUnit(STRUCTURE_TEMPLATES[key].root, null, null, order++);
  }
}
