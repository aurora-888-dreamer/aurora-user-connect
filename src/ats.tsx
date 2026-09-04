import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Briefcase, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import {
  APPLICANT_PIPELINE,
  addApplicant,
  addVacancy,
  getApplicants,
  getVacancies,
  updateApplicantStatus,
  updateVacancyStatus,
  type Applicant,
  type ApplicantStatus,
  type JobVacancy,
  type VacancyStatus,
} from "@/lib/ats-data";
import type { EmploymentStatus, PtkpStatus } from "@/lib/hris-data";

export const Route = createFileRoute("/ats")({
  head: () => ({
    meta: [
      { title: "ATS Recruitment — Human Power Management" },
      {
        name: "description",
        content:
          "Advanced ATS module: job board, AI CV parsing, adaptive online tests and AI interview summary with 1-click handover to Core HRIS.",
      },
      { property: "og:title", content: "ATS Recruitment — Human Power Management" },
      {
        property: "og:description",
        content: "Talent sourcing, testing and interview evaluation with handover bridge to HRIS.",
      },
    ],
  }),
  component: AtsPage,
});

function AtsPage() {
  const [vacancies, setVacancies] = useState<JobVacancy[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  useEffect(() => {
    setVacancies(getVacancies());
    setApplicants(getApplicants());
  }, []);

  const refresh = () => {
    setVacancies(getVacancies());
    setApplicants(getApplicants());
  };

  return (
    <AppShell
      title="ATS Rekrutmen Eksternal"
      description="Pencarian bakat, tes seleksi, wawancara dan evaluasi kandidat. Status HIRED memicu Handover API ke Core HRIS."
    >
      <Tabs defaultValue="vacancies">
        <TabsList>
          <TabsTrigger value="vacancies">Job Board</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Kandidat</TabsTrigger>
        </TabsList>

        <TabsContent value="vacancies" className="mt-6">
          <VacancyTab vacancies={vacancies} onChange={refresh} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <PipelineTab vacancies={vacancies} applicants={applicants} onChange={refresh} />
        </TabsContent>
      </Tabs>

      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Fase Berikutnya</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">AI CV Parsing &amp; Matching Score</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Butuh integrasi API (OpenAI/Whisper) — skor kecocokan saat ini diisi manual per
              kandidat.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Psikotes Adaptif &amp; AI Interview Summary</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fase 3 sesuai roadmap — modul DISC Engine dan transkripsi wawancara menyusul.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

const VACANCY_STATUSES: VacancyStatus[] = ["DRAFT", "OPEN", "CLOSED"];

function VacancyTab({ vacancies, onChange }: { vacancies: JobVacancy[]; onChange: () => void }) {
  const [form, setForm] = useState({
    title: "",
    department: "",
    description: "",
    requirements: "",
  });

  const handleAdd = () => {
    if (!form.title.trim()) {
      toast.error("Judul lowongan wajib diisi.");
      return;
    }
    addVacancy({
      title: form.title,
      department: form.department || "General",
      description: form.description,
      requirements: form.requirements,
      status: "OPEN",
    });
    toast.success(`Lowongan "${form.title}" dipublikasikan.`);
    setForm({ title: "", department: "", description: "", requirements: "" });
    onChange();
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Buka Lowongan Baru</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Judul Posisi</Label>
            <Input
              className="mt-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Senior Sales Executive"
            />
          </div>
          <div>
            <Label>Departemen</Label>
            <Input
              className="mt-2"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Sales"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Deskripsi</Label>
            <Textarea
              className="mt-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Kualifikasi</Label>
            <Textarea
              className="mt-2"
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-5">
          <Briefcase className="size-4" /> Publikasikan Lowongan
        </Button>
      </section>

      <section className="glass-panel overflow-hidden">
        {vacancies.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">
            Belum ada lowongan. Buat lewat form di atas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posisi</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vacancies.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>{v.department}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{v.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={v.status}
                      onValueChange={(s) => {
                        updateVacancyStatus(v.id, s as VacancyStatus);
                        onChange();
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VACANCY_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function PipelineTab({
  vacancies,
  applicants,
  onChange,
}: {
  vacancies: JobVacancy[];
  applicants: Applicant[];
  onChange: () => void;
}) {
  const [vacancyId, setVacancyId] = useState(vacancies[0]?.id ?? "");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    resumeUrl: "",
    aiMatchingScore: "",
  });
  const [handover, setHandover] = useState<{
    department: string;
    employmentStatus: EmploymentStatus;
    ptkpStatus: PtkpStatus;
  }>({
    department: "General",
    employmentStatus: "PKWT",
    ptkpStatus: "TK/0",
  });

  useEffect(() => {
    if (!vacancyId && vacancies.length > 0) setVacancyId(vacancies[0]!.id);
  }, [vacancies, vacancyId]);

  const handleAddApplicant = () => {
    if (!vacancyId) {
      toast.error("Buat lowongan terlebih dahulu di tab Job Board.");
      return;
    }
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error("Nama dan email pelamar wajib diisi.");
      return;
    }
    addApplicant({
      jobVacancyId: vacancyId,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      resumeUrl: form.resumeUrl,
      aiMatchingScore: Number(form.aiMatchingScore) || 0,
    });
    toast.success(`Kandidat ${form.fullName} ditambahkan ke pipeline.`);
    setForm({ fullName: "", email: "", phone: "", resumeUrl: "", aiMatchingScore: "" });
    onChange();
  };

  const advance = (applicant: Applicant) => {
    const idx = APPLICANT_PIPELINE.indexOf(applicant.status);
    const next =
      idx >= 0 && idx < APPLICANT_PIPELINE.length - 1 ? APPLICANT_PIPELINE[idx + 1] : null;
    if (!next) return;
    const { handedOverEmployee } = updateApplicantStatus(
      applicant.id,
      next,
      next === "HIRED" ? handover : undefined,
    );
    if (handedOverEmployee) {
      toast.success(
        `Handover berhasil — ${applicant.fullName} dibuat sebagai draft karyawan di Core HRIS.`,
      );
    } else {
      toast.success(`${applicant.fullName} pindah ke tahap ${next}.`);
    }
    onChange();
  };

  const reject = (applicant: Applicant) => {
    updateApplicantStatus(applicant.id, "REJECTED" as ApplicantStatus);
    toast.info(`${applicant.fullName} ditandai REJECTED.`);
    onChange();
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Tambah Pelamar</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <Label>Lowongan</Label>
            <Select value={vacancyId} onValueChange={setVacancyId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih lowongan" />
              </SelectTrigger>
              <SelectContent>
                {vacancies.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Lengkap</Label>
            <Input
              className="mt-2"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>No. HP</Label>
            <Input
              className="mt-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>URL CV</Label>
            <Input
              className="mt-2"
              value={form.resumeUrl}
              onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Skor Kecocokan (0–100)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.aiMatchingScore}
              onChange={(e) => setForm({ ...form, aiMatchingScore: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleAddApplicant} className="mt-5">
          <UserPlus className="size-4" /> Tambah ke Pipeline
        </Button>
      </section>

      <section className="glass-panel p-7">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-4 text-primary" />
          Detail Penawaran untuk Handover (HIRED)
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Diisi sebelum kandidat mencapai status HIRED, agar draft karyawan yang terbentuk di Core
          HRIS sudah benar.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Departemen Penempatan</Label>
            <Input
              className="mt-2"
              value={handover.department}
              onChange={(e) => setHandover({ ...handover, department: e.target.value })}
            />
          </div>
          <div>
            <Label>Status Kepegawaian</Label>
            <Select
              value={handover.employmentStatus}
              onValueChange={(v) =>
                setHandover({ ...handover, employmentStatus: v as EmploymentStatus })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["PKWT", "PKWTT", "INTERN"] as EmploymentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status PTKP</Label>
            <Select
              value={handover.ptkpStatus}
              onValueChange={(v) => setHandover({ ...handover, ptkpStatus: v as PtkpStatus })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"] as PtkpStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        {applicants.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada kandidat di pipeline.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Lowongan</TableHead>
                <TableHead>Skor AI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicants.map((a) => {
                const vacancy = vacancies.find((v) => v.id === a.jobVacancyId);
                const isFinal = a.status === "HIRED" || a.status === "REJECTED";
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.fullName}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell>{vacancy?.title ?? "—"}</TableCell>
                    <TableCell>{a.aiMatchingScore}%</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "HIRED"
                            ? "default"
                            : a.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!isFinal && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => advance(a)}>
                            {APPLICANT_PIPELINE[APPLICANT_PIPELINE.indexOf(a.status) + 1]}
                            <ArrowRight className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject(a)}>
                            Tolak
                          </Button>
                        </div>
                      )}
                      {a.status === "HIRED" && a.handedOverEmployeeId && (
                        <span className="text-xs text-primary">✓ Sudah di Core HRIS</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
