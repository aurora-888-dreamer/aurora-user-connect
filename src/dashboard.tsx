// src/routes/dashboard.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Briefcase, Users, ArrowRight } from "lucide-react";
import { loadProfile, decryptNik, type AuroraProfile } from "@/lib/device-identity";
import { maskNik } from "@/lib/aurora-id";
import { getEmployees } from "@/lib/hris-data";
import { getApplicants, getVacancies } from "@/lib/ats-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Human Power Management" },
      {
        name: "description",
        content:
          "Your Aurora identity dashboard with quick access to Core HRIS and ATS Recruitment.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AuroraProfile | null>(null);
  const [nikPreview, setNikPreview] = useState("locked");

  useEffect(() => {
    const p = loadProfile();
    if (!p) {
      navigate({ to: "/" });
      return;
    }
    setProfile(p);
    decryptNik(p.nikEncrypted, p.nikIv)
      .then((v) => setNikPreview(maskNik(v)))
      .catch(() => setNikPreview("locked"));
  }, [navigate]);

  if (!profile) return null;

  const employees = getEmployees();
  const vacancies = getVacancies();
  const applicants = getApplicants();
  const openVacancies = vacancies.filter((v) => v.status === "OPEN").length;
  const inPipeline = applicants.filter(
    (a) => a.status !== "HIRED" && a.status !== "REJECTED",
  ).length;

  return (
    <AppShell
      title={`Halo, ${profile.fullName.split(" ")[0]}`}
      description="Ringkasan workspace Aurora — pilih modul untuk mulai bekerja."
    >
      <section className="glass-panel p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your user_id</p>
            <p className="text-aurora mt-2 font-display text-3xl font-bold">{profile.userId}</p>
          </div>
          <Badge className="gap-1.5 bg-primary/15 text-primary" variant="secondary">
            <CheckCircle2 className="size-3.5" />
            {profile.syncedToAurora ? "Synced to Aurora Centre" : "Queued for Aurora Centre"}
          </Badge>
        </div>
        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={profile.fullName} />
          <Field label="WA / HP" value={`+${profile.dial}${profile.phone.replace(/^0/, "")}`} />
          <Field label="Device identity" value={profile.deviceId} />
          <Field label="NIK (encrypted vault)" value={nikPreview} />
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard
          to="/hris"
          icon={Users}
          title="Core HRIS"
          stat={`${employees.length} karyawan aktif`}
          detail="Database karyawan, absensi GPS, payroll PPh 21 TER & BPJS."
        />
        <ModuleCard
          to="/ats"
          icon={Briefcase}
          title="ATS Recruitment"
          stat={`${openVacancies} lowongan terbuka · ${inPipeline} kandidat dalam proses`}
          detail="Job board, pipeline kandidat, dan handover 1-click ke HRIS."
        />
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 font-mono text-sm">{value}</dd>
    </div>
  );
}

function ModuleCard({
  to,
  icon: Icon,
  title,
  stat,
  detail,
}: {
  to: "/hris" | "/ats";
  icon: typeof Users;
  title: string;
  stat: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="glass-panel group flex flex-col justify-between p-6 transition-colors hover:border-primary/40"
    >
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="size-5" />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="mt-2 text-sm font-medium text-foreground/90">{stat}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary">
        Buka modul
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
