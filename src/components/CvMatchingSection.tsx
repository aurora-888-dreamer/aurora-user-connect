import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EDUCATION_LEVELS,
  getCandidates,
  getJobSpecs,
  getParseMode,
  matchesToCsv,
  normalizeSkill,
  parseCvDemo,
  parseCvWithAi,
  removeCandidate,
  removeJobSpec,
  runMatching,
  saveCandidate,
  saveJobSpec,
  setCandidateDecision,
  setParseMode,
  type CandidateRecord,
  type JobSpec,
  type MatchResult,
  type ParseMode,
} from "@/lib/cv-matching-data";

type UploadItem = {
  id: string;
  fileName: string;
  status: "Uploading" | "Parsing" | "Done" | "Gagal";
  error?: string;
};

export function CvMatchingSection() {
  const [mode, setMode] = useState<ParseMode>("demo");
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [jobs, setJobs] = useState<JobSpec[]>([]);

  useEffect(() => {
    setMode(getParseMode());
    setCandidates(getCandidates());
    setJobs(getJobSpecs());
  }, []);

  const refresh = () => {
    setCandidates(getCandidates());
    setJobs(getJobSpecs());
  };

  const avgConfidence = candidates.length
    ? Math.round(
        (candidates.reduce((s, c) => s + (c.parsed.parsing_confidence ?? 0), 0) /
          candidates.length) *
          100,
      )
    : 0;

  return (
    <div className="space-y-6">
      <section className="glass-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <BrainCircuit className="size-4 text-primary" /> AI Talent Screening
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Baca CV, hitung skor kecocokan, dan urutkan kandidat terbaik untuk tiap posisi.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border p-1">
          {(["demo", "ai"] as ParseMode[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "ghost"}
              onClick={() => {
                setMode(m);
                setParseMode(m);
              }}
            >
              {m === "demo" ? "Mode Demo" : "Baca CV dengan AI"}
            </Button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total CV Terbaca" value={String(candidates.length)} />
        <StatCard label="Rata-rata Keyakinan" value={`${avgConfidence}%`} />
        <StatCard label="Posisi Dikonfigurasi" value={String(jobs.length)} />
      </div>

      <Tabs defaultValue="parser">
        <TabsList>
          <TabsTrigger value="parser">CV Parser</TabsTrigger>
          <TabsTrigger value="jobs">Posisi &amp; Bobot</TabsTrigger>
          <TabsTrigger value="matching">Matching &amp; Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="parser" className="mt-6">
          <ParserTab mode={mode} candidates={candidates} onChange={refresh} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
          <JobsTab jobs={jobs} candidates={candidates} onChange={refresh} />
        </TabsContent>
        <TabsContent value="matching" className="mt-6">
          <MatchingTab jobs={jobs} candidates={candidates} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------------- CV Parser ----------------

function ParserTab({
  mode,
  candidates,
  onChange,
}: {
  mode: ParseMode;
  candidates: CandidateRecord[];
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [selected, setSelected] = useState<CandidateRecord | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!selected && candidates.length) setSelected(candidates[candidates.length - 1]!);
  }, [candidates, selected]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10);
    let index = getCandidates().length;

    for (const file of list) {
      const item: UploadItem = { id: crypto.randomUUID(), fileName: file.name, status: "Uploading" };
      setQueue((q) => [...q, item]);
      await new Promise((r) => setTimeout(r, 350));
      setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "Parsing" } : i)));
      try {
        const record =
          mode === "demo" ? await parseCvDemo(file.name, index++) : await parseCvWithAi(file);
        saveCandidate(record);
        setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "Done" } : i)));
        setSelected(record);
        onChange();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal membaca CV.";
        setQueue((q) =>
          q.map((i) => (i.id === item.id ? { ...i, status: "Gagal", error: message } : i)),
        );
        toast.error(message);
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="glass-panel p-6">
        <h4 className="text-sm font-semibold">Unggah CV (maks. 10 berkas)</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "demo"
            ? "Mode demo: isi CV disimulasikan dengan data contoh."
            : "Mode AI: berkas PDF/gambar dibaca oleh AI sungguhan."}
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <UploadCloud className="size-8 text-primary" />
          <p className="mt-3 text-sm font-medium">Tarik berkas ke sini atau klik untuk memilih</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, atau foto CV</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,image/*"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>

        {queue.length > 0 && (
          <ul className="mt-4 space-y-2">
            {queue.map((q) => (
              <li
                key={q.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{q.fileName}</span>
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {q.status === "Done" ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : q.status === "Gagal" ? (
                    <TriangleAlert className="size-4 text-destructive" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  {q.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {candidates.length > 0 && (
          <div className="mt-6">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kandidat Terbaca
            </h5>
            <ul className="mt-2 space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    selected?.id === c.id ? "border-primary" : "border-border"
                  }`}
                >
                  <button className="truncate text-left" onClick={() => setSelected(c)}>
                    {c.parsed.personal_info?.name || c.fileName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Math.round((c.parsed.parsing_confidence ?? 0) * 100)}%
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      removeCandidate(c.id);
                      if (selected?.id === c.id) setSelected(null);
                      onChange();
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="glass-panel p-6">
        <h4 className="text-sm font-semibold">Hasil Parsing</h4>
        {!selected ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada CV terbaca. Unggah berkas di sebelah kiri.
          </p>
        ) : (
          <ParsedPreview candidate={selected} />
        )}
      </section>
    </div>
  );
}

function ParsedPreview({ candidate }: { candidate: CandidateRecord }) {
  const p = candidate.parsed;
  const normalizations = (p.skills?.hard_skills ?? [])
    .map(normalizeSkill)
    .filter((n) => n.input.toLowerCase() !== n.normalized.toLowerCase());

  return (
    <div className="mt-4 space-y-5">
      <div className="rounded-xl border border-border p-4">
        <p className="text-lg font-semibold">{p.personal_info?.name || "-"}</p>
        <p className="text-sm text-muted-foreground">
          {p.personal_info?.email} · {p.personal_info?.phone}
        </p>
        <p className="text-sm text-muted-foreground">{p.personal_info?.location}</p>
        <Badge variant="secondary" className="mt-2">
          Keyakinan {Math.round((p.parsing_confidence ?? 0) * 100)}% ·{" "}
          {candidate.mode === "ai" ? "Dibaca AI" : "Demo"}
        </Badge>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ringkasan AI
        </p>
        <p className="mt-1 text-sm">{p.summary}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skill</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(p.skills?.hard_skills ?? []).map((s) => (
            <Badge key={s}>{normalizeSkill(s).normalized}</Badge>
          ))}
          {(p.skills?.tools ?? []).map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
        </div>
        {normalizations.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {normalizations.map((n) => (
              <li key={n.input} className="flex items-center gap-1">
                <Wand2 className="size-3" /> "{n.input}" dinormalkan menjadi "{n.normalized}"
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pengalaman ({candidate.yearsExperience} tahun)
        </p>
        <ul className="mt-2 space-y-2">
          {(p.experiences ?? []).map((e, i) => (
            <li key={i} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">
                {e.job_title} — {e.company}
              </p>
              <p className="text-xs text-muted-foreground">{e.duration}</p>
              <p className="mt-1 text-xs">{e.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pendidikan
        </p>
        <ul className="mt-1 text-sm">
          {(p.education ?? []).map((e, i) => (
            <li key={i}>
              {e.degree} — {e.institution}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------- Jobs ----------------

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-2"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            onChange([...values, draft.trim()]);
            setDraft("");
          }
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v, i) => (
          <Badge
            key={`${v}-${i}`}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
          >
            {v} ✕
          </Badge>
        ))}
      </div>
    </div>
  );
}

function JobsTab({
  jobs,
  candidates,
  onChange,
}: {
  jobs: JobSpec[];
  candidates: CandidateRecord[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "",
    description: "",
    mustHave: [] as string[],
    niceToHave: [] as string[],
    minExperience: 3,
    education: "S1",
    weights: { skill: 40, experience: 30, semantic: 20, education: 10 },
  });

  const total =
    form.weights.skill + form.weights.experience + form.weights.semantic + form.weights.education;

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Judul posisi wajib diisi.");
      return;
    }
    if (total !== 100) {
      toast.error("Total bobot harus 100%.");
      return;
    }
    saveJobSpec({ ...form, department: form.department || "General" });
    toast.success(`Posisi "${form.title}" tersimpan.`);
    setOpen(false);
    setForm({
      title: "",
      department: "",
      description: "",
      mustHave: [],
      niceToHave: [],
      minExperience: 3,
      education: "S1",
      weights: { skill: 40, experience: 30, semantic: 20, education: 10 },
    });
    onChange();
  };

  const weightRow = (key: keyof typeof form.weights, label: string) => (
    <div key={key}>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{form.weights[key]}%</span>
      </div>
      <Slider
        className="mt-2"
        value={[form.weights[key]]}
        max={100}
        step={5}
        onValueChange={([v]) => setForm({ ...form, weights: { ...form.weights, [key]: v ?? 0 } })}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Buat Posisi
        </Button>
      </div>

      <section className="glass-panel overflow-hidden">
        {jobs.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">
            Belum ada posisi. Buat posisi untuk mulai menghitung skor kecocokan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posisi</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Skill Wajib</TableHead>
                <TableHead>Kandidat</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title}</TableCell>
                  <TableCell>{j.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {j.mustHave.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{candidates.length}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => {
                        removeJobSpec(j.id);
                        onChange();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Posisi</DialogTitle>
            <DialogDescription>
              Tentukan syarat dan bobot penilaian untuk menghitung skor kecocokan kandidat.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Judul Posisi</Label>
                <Input
                  className="mt-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Departemen</Label>
                <Input
                  className="mt-2"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Deskripsi Pekerjaan</Label>
              <Textarea
                className="mt-2"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <TagInput
              label="Skill Wajib (tekan Enter)"
              values={form.mustHave}
              onChange={(v) => setForm({ ...form, mustHave: v })}
              placeholder="React"
            />
            <TagInput
              label="Skill Tambahan (tekan Enter)"
              values={form.niceToHave}
              onChange={(v) => setForm({ ...form, niceToHave: v })}
              placeholder="GraphQL"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <Label>Minimal Pengalaman</Label>
                  <span className="font-medium">{form.minExperience} tahun</span>
                </div>
                <Slider
                  className="mt-3"
                  value={[form.minExperience]}
                  max={15}
                  step={1}
                  onValueChange={([v]) => setForm({ ...form, minExperience: v ?? 0 })}
                />
              </div>
              <div>
                <Label>Pendidikan Minimal</Label>
                <Select
                  value={form.education}
                  onValueChange={(v) => setForm({ ...form, education: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Bobot Penilaian</p>
                <Badge variant={total === 100 ? "default" : "destructive"}>Total {total}%</Badge>
              </div>
              <div className="mt-4 space-y-4">
                {weightRow("skill", "Skill")}
                {weightRow("experience", "Pengalaman")}
                {weightRow("semantic", "Kesesuaian Konteks")}
                {weightRow("education", "Pendidikan")}
              </div>
            </div>

            <Button onClick={submit}>Simpan Posisi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Matching ----------------

function scoreColor(score: number) {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
}

function MatchingTab({
  jobs,
  candidates,
  onChange,
}: {
  jobs: JobSpec[];
  candidates: CandidateRecord[];
  onChange: () => void;
}) {
  const [jobId, setJobId] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [detail, setDetail] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (!jobId && jobs.length) setJobId(jobs[0]!.id);
  }, [jobs, jobId]);

  const job = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);

  const run = async () => {
    if (!job) {
      toast.error("Pilih posisi terlebih dahulu.");
      return;
    }
    if (!candidates.length) {
      toast.error("Belum ada CV yang terbaca.");
      return;
    }
    setRunning(true);
    setProgress(0);
    for (let i = 1; i <= 5; i++) {
      await new Promise((r) => setTimeout(r, 180));
      setProgress(i * 20);
    }
    setResults(runMatching(job, candidates));
    setRunning(false);
  };

  const shown = (results ?? []).filter((r) => (onlyHigh ? r.overall > 75 : true));

  const exportCsv = () => {
    if (!job || !results?.length) return;
    const blob = new Blob([matchesToCsv(job, shown)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matching-${job.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label>Posisi</Label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Pilih posisi" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void run()} disabled={running}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Jalankan AI Matching
        </Button>
        <Button variant="outline" onClick={() => setOnlyHigh((v) => !v)}>
          {onlyHigh ? "Tampilkan semua" : "Hanya skor > 75"}
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={!results?.length}>
          <Download className="size-4" /> CSV
        </Button>
      </section>

      {running && <Progress value={progress} />}

      <section className="glass-panel overflow-hidden">
        {!results ? (
          <p className="p-7 text-sm text-muted-foreground">
            Pilih posisi lalu jalankan matching untuk melihat peringkat kandidat.
          </p>
        ) : shown.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Tidak ada kandidat sesuai filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kandidat</TableHead>
                <TableHead>Skor</TableHead>
                <TableHead>Rincian</TableHead>
                <TableHead>Kekuatan / Kekurangan</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.candidate.id}>
                  <TableCell>
                    <p className="font-medium">{r.candidate.parsed.personal_info?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.candidate.yearsExperience} tahun ·{" "}
                      {r.candidate.parsed.personal_info?.location}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xl font-bold ${scoreColor(r.overall)}`}>
                      {r.overall}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </TableCell>
                  <TableCell className="w-48">
                    <MiniBar label="Skill" value={r.breakdown.skill} />
                    <MiniBar label="Exp" value={r.breakdown.experience} />
                    <MiniBar label="Konteks" value={r.breakdown.semantic} />
                    <MiniBar label="Edu" value={r.breakdown.education} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.strengths.slice(0, 2).map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                      {r.gaps.slice(0, 1).map((g) => (
                        <Badge key={g} variant="destructive">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetail(r)}>
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setCandidateDecision(r.candidate.id, "SHORTLIST");
                          toast.success(`${r.candidate.parsed.personal_info?.name} di-shortlist.`);
                          onChange();
                        }}
                      >
                        Shortlist
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCandidateDecision(r.candidate.id, "REJECT");
                          toast.info(`${r.candidate.parsed.personal_info?.name} ditolak.`);
                          onChange();
                        }}
                      >
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          {detail && job && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.candidate.parsed.personal_info?.name}</DialogTitle>
                <DialogDescription>Penilaian untuk posisi {job.title}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 lg:grid-cols-2">
                <ParsedPreview candidate={detail.candidate} />
                <div className="space-y-5">
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className={`text-4xl font-bold ${scoreColor(detail.overall)}`}>
                      {detail.overall}
                      <span className="text-base text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <div className="space-y-3">
                    <MiniBar label="Skill" value={detail.breakdown.skill} />
                    <MiniBar label="Pengalaman" value={detail.breakdown.experience} />
                    <MiniBar label="Kesesuaian konteks" value={detail.breakdown.semantic} />
                    <MiniBar label="Pendidikan" value={detail.breakdown.education} />
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="size-4 text-primary" /> Kenapa cocok?
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{detail.explanation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Kekuatan
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {detail.strengths.map((s) => (
                        <li key={s} className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-primary" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Kekurangan
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {detail.gaps.map((g) => (
                        <li key={g} className="flex items-center gap-2">
                          <TriangleAlert className="size-4 text-destructive" /> {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {detail.bonus.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {detail.bonus.map((b) => (
                        <Badge key={b.label} variant={b.value > 0 ? "default" : "destructive"}>
                          {b.value > 0 ? "+" : ""}
                          {b.value} {b.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Syarat vs Kandidat
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {job.mustHave.map((s) => {
                        const has = [
                          ...(detail.candidate.parsed.skills?.hard_skills ?? []),
                          ...(detail.candidate.parsed.skills?.tools ?? []),
                        ].some(
                          (c) =>
                            normalizeSkill(c).normalized.toLowerCase() ===
                            normalizeSkill(s).normalized.toLowerCase(),
                        );
                        return (
                          <li key={s} className="flex items-center gap-2">
                            {has ? (
                              <CheckCircle2 className="size-4 text-primary" />
                            ) : (
                              <TriangleAlert className="size-4 text-destructive" />
                            )}
                            {s}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
