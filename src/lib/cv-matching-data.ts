/**
 * AI CV Parsing & Matching Score — data layer.
 *
 * Two modes, chosen by the user in the UI:
 *  - "demo": parsing is simulated locally (2s delay, mock candidates) so the
 *    module can be presented without spending AI credits.
 *  - "ai": the uploaded file is sent to the `parseCvServerFn` server function
 *    which reads it with a real AI vision model.
 *
 * State lives in localStorage — this is a screening workspace on top of the
 * existing ATS pipeline, not a second source of truth.
 */
import { parseCvServerFn } from "@/lib/parse-cv.functions";

export type ParseMode = "demo" | "ai";

export type ParsedCv = {
  personal_info: { name: string; email: string; phone: string; location: string; linkedin: string };
  skills: { hard_skills: string[]; soft_skills: string[]; tools: string[] };
  experiences: { job_title: string; company: string; duration: string; description: string }[];
  education: { degree: string; institution: string }[];
  summary: string;
  parsing_confidence: number;
};

export type CandidateRecord = {
  id: string;
  fileName: string;
  mode: ParseMode;
  parsed: ParsedCv;
  yearsExperience: number;
  createdAt: string;
  shortlisted?: "SHORTLIST" | "REJECT";
};

export type JobSpec = {
  id: string;
  title: string;
  department: string;
  description: string;
  mustHave: string[];
  niceToHave: string[];
  minExperience: number;
  education: string;
  weights: { skill: number; experience: number; semantic: number; education: number };
  createdAt: string;
};

const CAND_KEY = "aurora.hpm.cv.candidates.v1";
const JOB_KEY = "aurora.hpm.cv.jobs.v1";
const MODE_KEY = "aurora.hpm.cv.mode.v1";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write<T>(key: string, rows: T[]) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(rows));
}

export function getParseMode(): ParseMode {
  if (typeof window === "undefined") return "demo";
  return (localStorage.getItem(MODE_KEY) as ParseMode) || "demo";
}
export function setParseMode(mode: ParseMode) {
  if (typeof window !== "undefined") localStorage.setItem(MODE_KEY, mode);
}

// ---------- Skill normalization ----------

const SKILL_ALIASES: Record<string, string> = {
  "react.js": "React",
  reactjs: "React",
  react: "React",
  "node js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  js: "JavaScript",
  ts: "TypeScript",
  "next js": "Next.js",
  nextjs: "Next.js",
  postgres: "PostgreSQL",
  psql: "PostgreSQL",
  tailwindcss: "Tailwind CSS",
  golang: "Go",
  "ms excel": "Excel",
};

export function normalizeSkill(raw: string): { input: string; normalized: string } {
  const key = raw.trim().toLowerCase();
  const normalized =
    SKILL_ALIASES[key] ??
    raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return { input: raw.trim(), normalized };
}

export function normalizedSkillList(skills: string[]): string[] {
  return Array.from(new Set(skills.map((s) => normalizeSkill(s).normalized)));
}

// ---------- Candidates ----------

export function getCandidates(): CandidateRecord[] {
  return read<CandidateRecord>(CAND_KEY);
}
export function saveCandidate(row: CandidateRecord) {
  write(CAND_KEY, [...getCandidates().filter((c) => c.id !== row.id), row]);
}
export function removeCandidate(id: string) {
  write(
    CAND_KEY,
    getCandidates().filter((c) => c.id !== id),
  );
}
export function setCandidateDecision(id: string, decision: "SHORTLIST" | "REJECT") {
  write(
    CAND_KEY,
    getCandidates().map((c) => (c.id === id ? { ...c, shortlisted: decision } : c)),
  );
}

// ---------- Jobs ----------

export function getJobSpecs(): JobSpec[] {
  return read<JobSpec>(JOB_KEY);
}
export function saveJobSpec(input: Omit<JobSpec, "id" | "createdAt">): JobSpec {
  const job: JobSpec = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  write(JOB_KEY, [...getJobSpecs(), job]);
  return job;
}
export function removeJobSpec(id: string) {
  write(
    JOB_KEY,
    getJobSpecs().filter((j) => j.id !== id),
  );
}

// ---------- Mock pool (demo mode) ----------

const MOCK_POOL: { parsed: ParsedCv; years: number }[] = [
  {
    years: 6,
    parsed: {
      personal_info: {
        name: "Rizky Ananda Putra",
        email: "rizky.ananda@mail.com",
        phone: "0812-3344-5566",
        location: "Jakarta Selatan",
        linkedin: "linkedin.com/in/rizkyananda",
      },
      skills: {
        hard_skills: ["react.js", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"],
        soft_skills: ["Komunikasi", "Kepemimpinan tim"],
        tools: ["Figma", "Git", "Jira"],
      },
      experiences: [
        {
          job_title: "Senior Frontend Engineer",
          company: "GoTo",
          duration: "2021 - 2025",
          description: "Membangun dashboard HRIS internal dengan React dan design system.",
        },
        {
          job_title: "Frontend Engineer",
          company: "Tokopedia",
          duration: "2019 - 2021",
          description: "Optimasi performa halaman katalog.",
        },
      ],
      education: [{ degree: "S1 Teknik Informatika", institution: "Universitas Indonesia" }],
      summary:
        "Frontend engineer 6 tahun dengan spesialisasi React dan design system. Berpengalaman memimpin tim kecil. Pernah membangun dashboard HRIS skala enterprise.",
      parsing_confidence: 0.96,
    },
  },
  {
    years: 4,
    parsed: {
      personal_info: {
        name: "Nabila Rahmawati",
        email: "nabila.rahma@mail.com",
        phone: "0813-9988-1122",
        location: "Bandung",
        linkedin: "linkedin.com/in/nabilarahma",
      },
      skills: {
        hard_skills: ["node js", "PostgreSQL", "Redis", "Docker"],
        soft_skills: ["Analitis", "Problem solving"],
        tools: ["Postman", "Grafana"],
      },
      experiences: [
        {
          job_title: "Backend Engineer",
          company: "Bukalapak",
          duration: "2021 - 2025",
          description: "Microservice pembayaran dengan Node.js dan PostgreSQL.",
        },
      ],
      education: [{ degree: "S1 Sistem Informasi", institution: "Telkom University" }],
      summary:
        "Backend engineer 4 tahun fokus di microservice dan basis data. Terbiasa dengan trafik tinggi. Kuat di observability.",
      parsing_confidence: 0.93,
    },
  },
  {
    years: 8,
    parsed: {
      personal_info: {
        name: "Dimas Aryo Wibowo",
        email: "dimas.aryo@mail.com",
        phone: "0817-2211-9090",
        location: "Surabaya",
        linkedin: "linkedin.com/in/dimasaryo",
      },
      skills: {
        hard_skills: ["React", "Node.js", "AWS", "TypeScript", "PostgreSQL"],
        soft_skills: ["Mentoring", "Ownership"],
        tools: ["Terraform", "Git"],
      },
      experiences: [
        {
          job_title: "Fullstack Lead",
          company: "Traveloka",
          duration: "2018 - 2025",
          description: "Memimpin squad fullstack produk internal HR.",
        },
      ],
      education: [{ degree: "S1 Teknik Komputer", institution: "ITS" }],
      summary:
        "Fullstack lead 8 tahun dengan pengalaman end-to-end. Terbiasa memimpin squad lintas fungsi. Kuat di arsitektur cloud.",
      parsing_confidence: 0.97,
    },
  },
  {
    years: 5,
    parsed: {
      personal_info: {
        name: "Siti Nurhaliza Pratiwi",
        email: "siti.pratiwi@mail.com",
        phone: "0821-4455-7788",
        location: "Jakarta Pusat",
        linkedin: "linkedin.com/in/sitipratiwi",
      },
      skills: {
        hard_skills: ["Product Discovery", "Roadmapping", "SQL", "A/B Testing"],
        soft_skills: ["Stakeholder management", "Storytelling"],
        tools: ["Jira", "Amplitude", "Figma"],
      },
      experiences: [
        {
          job_title: "Product Manager",
          company: "Ruangguru",
          duration: "2020 - 2025",
          description: "Mengelola produk HR & payroll internal.",
        },
      ],
      education: [{ degree: "S1 Manajemen", institution: "Universitas Padjadjaran" }],
      summary:
        "Product manager 5 tahun di produk B2B/HR tech. Kuat di riset pengguna dan eksperimen. Terbiasa bekerja dengan tim engineering.",
      parsing_confidence: 0.91,
    },
  },
  {
    years: 2,
    parsed: {
      personal_info: {
        name: "Bagus Setiawan",
        email: "bagus.setiawan@mail.com",
        phone: "0856-1234-8899",
        location: "Yogyakarta",
        linkedin: "linkedin.com/in/bagussetiawan",
      },
      skills: {
        hard_skills: ["JavaScript", "React", "CSS"],
        soft_skills: ["Belajar cepat"],
        tools: ["Git"],
      },
      experiences: [
        {
          job_title: "Junior Frontend Developer",
          company: "Startup lokal",
          duration: "2023 - 2025",
          description: "Membuat landing page dan dashboard sederhana.",
        },
      ],
      education: [{ degree: "D3 Teknik Informatika", institution: "UGM" }],
      summary:
        "Junior frontend 2 tahun dengan dasar React yang solid. Cepat beradaptasi. Cocok untuk peran entry level.",
      parsing_confidence: 0.86,
    },
  },
  {
    years: 7,
    parsed: {
      personal_info: {
        name: "Andini Kusuma Dewi",
        email: "andini.kusuma@mail.com",
        phone: "0878-6677-3344",
        location: "Tangerang",
        linkedin: "linkedin.com/in/andinikusuma",
      },
      skills: {
        hard_skills: ["Go", "Kubernetes", "PostgreSQL", "gRPC"],
        soft_skills: ["Dokumentasi", "Kolaborasi"],
        tools: ["Docker", "Prometheus"],
      },
      experiences: [
        {
          job_title: "Senior Backend Engineer",
          company: "Xendit",
          duration: "2019 - 2025",
          description: "Layanan pembayaran real-time berbasis Go.",
        },
      ],
      education: [{ degree: "S1 Ilmu Komputer", institution: "IPB" }],
      summary:
        "Backend engineer 7 tahun di fintech. Fokus pada keandalan sistem. Berpengalaman dengan Kubernetes di produksi.",
      parsing_confidence: 0.94,
    },
  },
  {
    years: 3,
    parsed: {
      personal_info: {
        name: "Fajar Maulana",
        email: "fajar.maulana@mail.com",
        phone: "0813-5566-2211",
        location: "Semarang",
        linkedin: "linkedin.com/in/fajarmaulana",
      },
      skills: {
        hard_skills: ["React", "Node.js", "MongoDB"],
        soft_skills: ["Inisiatif"],
        tools: ["Git", "Vercel"],
      },
      experiences: [
        {
          job_title: "Fullstack Developer",
          company: "Agency digital",
          duration: "2022 - 2025",
          description: "Membangun aplikasi web klien end-to-end.",
        },
      ],
      education: [{ degree: "S1 Teknik Informatika", institution: "Undip" }],
      summary:
        "Fullstack developer 3 tahun di agency. Terbiasa menangani banyak proyek paralel. Kuat di pengiriman cepat.",
      parsing_confidence: 0.89,
    },
  },
  {
    years: 9,
    parsed: {
      personal_info: {
        name: "Yohanes Kristanto",
        email: "yohanes.k@mail.com",
        phone: "0811-9090-4455",
        location: "Jakarta Barat",
        linkedin: "linkedin.com/in/yohaneskristanto",
      },
      skills: {
        hard_skills: ["Product Strategy", "OKR", "SQL", "Data Analysis"],
        soft_skills: ["Negosiasi", "Leadership"],
        tools: ["Looker", "Jira"],
      },
      experiences: [
        {
          job_title: "Group Product Manager",
          company: "GoTo",
          duration: "2016 - 2025",
          description: "Memimpin portofolio produk HR dan payroll.",
        },
      ],
      education: [{ degree: "S2 MBA", institution: "Universitas Indonesia" }],
      summary:
        "Product leader 9 tahun dengan rekam jejak di HR tech. Terbiasa memimpin beberapa squad. Kuat di strategi dan data.",
      parsing_confidence: 0.98,
    },
  },
];

export const MOCK_POOL_SIZE = MOCK_POOL.length;

/** Simulated parsing — 2 second delay, mock structured data. */
export function parseCvDemo(fileName: string, index: number): Promise<CandidateRecord> {
  const pick = MOCK_POOL[index % MOCK_POOL.length]!;
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          id: crypto.randomUUID(),
          fileName,
          mode: "demo",
          parsed: pick.parsed,
          yearsExperience: pick.years,
          createdAt: new Date().toISOString(),
        }),
      2000,
    ),
  );
}

function estimateYears(parsed: ParsedCv): number {
  let total = 0;
  for (const exp of parsed.experiences ?? []) {
    const years = (exp.duration ?? "").match(/(19|20)\d{2}/g);
    if (years && years.length >= 2) total += Math.max(0, Number(years[1]) - Number(years[0]));
    else if (years?.length === 1) total += Math.max(0, new Date().getFullYear() - Number(years[0]));
  }
  return total;
}

/** Real parsing — sends the file to the AI vision model via a server function. */
export async function parseCvWithAi(file: File): Promise<CandidateRecord> {
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.readAsDataURL(file);
  });

  const res = await parseCvServerFn({
    data: { fileDataUrl, fileName: file.name, mimeType: file.type },
  });
  if (!res?.parsedJson) throw new Error("AI tidak dapat membaca berkas ini sebagai CV.");
  const parsed = JSON.parse(res.parsedJson) as ParsedCv;

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mode: "ai",
    parsed: {
      personal_info: parsed.personal_info ?? {
        name: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
      },
      skills: parsed.skills ?? { hard_skills: [], soft_skills: [], tools: [] },
      experiences: parsed.experiences ?? [],
      education: parsed.education ?? [],
      summary: parsed.summary ?? "",
      parsing_confidence: parsed.parsing_confidence ?? 0.9,
    },
    yearsExperience: estimateYears(parsed),
    createdAt: new Date().toISOString(),
  };
}

// ---------- Matching ----------

export type MatchBreakdown = {
  skill: number;
  experience: number;
  semantic: number;
  education: number;
};
export type MatchResult = {
  candidate: CandidateRecord;
  overall: number;
  breakdown: MatchBreakdown;
  strengths: string[];
  gaps: string[];
  bonus: { label: string; value: number }[];
  explanation: string;
};

const BONUS_COMPANIES = ["GoTo", "Tokopedia", "Traveloka", "Xendit"];
export const EDUCATION_LEVELS = ["SMA/SMK", "D3", "S1", "S2", "S3"];

function pct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function matchCandidate(job: JobSpec, candidate: CandidateRecord): MatchResult {
  const candSkills = normalizedSkillList([
    ...(candidate.parsed.skills?.hard_skills ?? []),
    ...(candidate.parsed.skills?.tools ?? []),
  ]).map((s) => s.toLowerCase());

  const must = normalizedSkillList(job.mustHave).map((s) => s.toLowerCase());
  const nice = normalizedSkillList(job.niceToHave).map((s) => s.toLowerCase());

  const mustHit = must.filter((s) => candSkills.includes(s));
  const niceHit = nice.filter((s) => candSkills.includes(s));
  const skillScore = must.length
    ? pct(
        (mustHit.length / must.length) * 85 +
          (nice.length ? (niceHit.length / nice.length) * 15 : 15),
      )
    : 70;

  const expScore = job.minExperience ? pct((candidate.yearsExperience / job.minExperience) * 100) : 80;

  // "Semantic" proxy: overlap between job description words and CV text.
  const jdWords = new Set(
    job.description
      .toLowerCase()
      .split(/[^a-z0-9.+#]+/)
      .filter((w) => w.length > 3),
  );
  const cvText = [
    candidate.parsed.summary,
    ...(candidate.parsed.experiences ?? []).map((e) => `${e.job_title} ${e.description}`),
  ]
    .join(" ")
    .toLowerCase();
  const hits = Array.from(jdWords).filter((w) => cvText.includes(w)).length;
  const semanticScore = jdWords.size ? pct(50 + (hits / jdWords.size) * 50) : 70;

  const candEdu = (candidate.parsed.education?.[0]?.degree ?? "").toUpperCase();
  const candLevel = EDUCATION_LEVELS.findIndex((r) => candEdu.includes(r.split("/")[0]!));
  const needLevel = EDUCATION_LEVELS.indexOf(job.education);
  const eduScore =
    candLevel < 0 || needLevel < 0
      ? 70
      : candLevel >= needLevel
        ? 100
        : pct(100 - (needLevel - candLevel) * 30);

  const w = job.weights;
  const base =
    (skillScore * w.skill +
      expScore * w.experience +
      semanticScore * w.semantic +
      eduScore * w.education) /
    100;

  const bonus: { label: string; value: number }[] = [];
  const company = (candidate.parsed.experiences ?? []).find((e) =>
    BONUS_COMPANIES.some((c) => (e.company ?? "").toLowerCase().includes(c.toLowerCase())),
  );
  if (company) bonus.push({ label: `Ex ${company.company}`, value: 10 });
  const loc = (candidate.parsed.personal_info?.location ?? "").toLowerCase();
  if (loc && !loc.includes("jakarta")) bonus.push({ label: "Luar Jakarta", value: -5 });

  const overall = pct(base + bonus.reduce((s, b) => s + b.value, 0));

  const strengths: string[] = [];
  if (mustHit.length) strengths.push(`Menguasai ${mustHit.length}/${must.length} skill wajib`);
  if (candidate.yearsExperience >= job.minExperience)
    strengths.push(`${candidate.yearsExperience} tahun pengalaman relevan`);
  if (company) strengths.push(`Pengalaman di ${company.company}`);
  if (niceHit.length) strengths.push(`Bonus ${niceHit.length} skill nice-to-have`);

  const gaps: string[] = [];
  const missing = must.filter((s) => !candSkills.includes(s));
  if (missing.length) gaps.push(`Belum ada: ${missing.slice(0, 3).join(", ")}`);
  if (candidate.yearsExperience < job.minExperience)
    gaps.push(`Pengalaman kurang ${job.minExperience - candidate.yearsExperience} tahun`);
  if (eduScore < 100) gaps.push(`Pendidikan di bawah syarat (${job.education})`);

  const explanation = `Kandidat punya ${candidate.yearsExperience} tahun pengalaman dan memenuhi ${mustHit.length} dari ${must.length} skill wajib untuk posisi ${job.title}. ${candidate.parsed.summary}`;

  return {
    candidate,
    overall,
    breakdown: {
      skill: skillScore,
      experience: expScore,
      semantic: semanticScore,
      education: eduScore,
    },
    strengths: strengths.slice(0, 3),
    gaps: gaps.slice(0, 3),
    bonus,
    explanation,
  };
}

export function runMatching(job: JobSpec, candidates: CandidateRecord[]): MatchResult[] {
  return candidates.map((c) => matchCandidate(job, c)).sort((a, b) => b.overall - a.overall);
}

export function matchesToCsv(job: JobSpec, results: MatchResult[]): string {
  const header = [
    "Nama",
    "Posisi",
    "Overall",
    "Skill",
    "Experience",
    "Semantic",
    "Education",
    "Status",
  ];
  const rows = results.map((r) => [
    r.candidate.parsed.personal_info?.name ?? "-",
    job.title,
    String(r.overall),
    String(r.breakdown.skill),
    String(r.breakdown.experience),
    String(r.breakdown.semantic),
    String(r.breakdown.education),
    r.candidate.shortlisted ?? "-",
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}
