import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserMinus,
  Cake,
  FileWarning,
  Inbox,
  AlertTriangle,
  Wallet,
  Landmark,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getActiveSession, isFinanceDept, isTopAdmin, isDeveloperAdmin } from "@/lib/admin-auth";
import { getHrdDashboardData, type HrdDashboardData } from "@/lib/hrd-dashboard-data";
import {
  getFinanceDashboardData,
  type FinanceDashboardData,
  type PayrollStageCounts,
} from "@/lib/finance-dashboard-data";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

type DashboardKind = "hrd" | "finance";

function DashboardComponent() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [view, setView] = useState<DashboardKind>("hrd");
  const [fullAccess, setFullAccess] = useState(false);
  const [financeOnly, setFinanceOnly] = useState(false);

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    setFullName(session.fullName);
    const hasFullAccess = isTopAdmin(session) || isDeveloperAdmin(session);
    setFullAccess(hasFullAccess);
    if (!hasFullAccess && isFinanceDept(session)) {
      setFinanceOnly(true);
      setView("finance");
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  return (
    <AppShell
      title={`Selamat datang, ${fullName}`}
      description={
        financeOnly
          ? "Dashboard Finance Payroll — akurasi biaya & compliance. Edit profil/PIN ada di menu Pengaturan."
          : "Dashboard HRD — kesehatan organisasi hari ini. Edit profil/PIN ada di menu Pengaturan."
      }
    >
      {fullAccess && (
        <div className="mb-2 flex gap-2">
          <Button
            size="sm"
            variant={view === "hrd" ? "default" : "outline"}
            onClick={() => setView("hrd")}
          >
            Dashboard HRD
          </Button>
          <Button
            size="sm"
            variant={view === "finance" ? "default" : "outline"}
            onClick={() => setView("finance")}
          >
            Dashboard Finance
          </Button>
        </div>
      )}

      {view === "hrd" ? <HrdDashboardView /> : <FinanceDashboardView />}
    </AppShell>
  );
}

function HrdDashboardView() {
  const [data, setData] = useState<HrdDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHrdDashboardData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <p className="text-sm text-muted-foreground">Memuat dashboard…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Headcount"
          value={String(data.headcount)}
          hint="Karyawan aktif"
        />
        <KpiCard
          icon={UserCheck}
          label="Kehadiran Hari Ini"
          value={`${data.attendancePercentToday}%`}
          hint={`dari ${data.headcount} karyawan aktif`}
        />
        <KpiCard
          icon={UserMinus}
          label="Turnover MTD"
          value={String(data.turnoverMTD)}
          hint="Resign bulan ini"
        />
        <KpiCard
          icon={Inbox}
          label="Pengajuan Menunggu"
          value={String(data.pendingLeaveCount)}
          hint="Cuti/izin belum diputuskan"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="size-4 text-primary" /> People Pulse Today
          </h3>
          <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto">
            {data.peoplePulseToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada karyawan aktif.</p>
            ) : (
              data.peoplePulseToday
                .sort(
                  (a, b) =>
                    (a.status === "Belum Absen" ? 1 : 0) - (b.status === "Belum Absen" ? 1 : 0),
                )
                .map((row) => (
                  <div
                    key={row.employeeId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {row.photoDataUrl ? (
                        <img
                          src={row.photoDataUrl}
                          alt=""
                          className="size-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[0.6rem] text-muted-foreground">
                          {row.fullName.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.department}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge
                        variant={
                          row.status === "Hadir"
                            ? "secondary"
                            : row.status === "Telat"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {row.status}
                      </Badge>
                      {row.clockIn && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(row.clockIn).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="glass-panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-500" /> Alert Center
          </h3>
          <div className="mt-3 space-y-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileWarning className="size-3.5" /> Kontrak Akan Berakhir
              </p>
              {data.contractAlerts.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tidak ada dalam 60 hari ke depan.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {data.contractAlerts.map((a) => (
                    <li
                      key={a.employee.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <span>{a.employee.fullName}</span>
                      <Badge variant={a.daysLeft <= 7 ? "destructive" : "secondary"}>
                        {a.daysLeft} hari lagi
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Cake className="size-3.5" /> Ulang Tahun
              </p>
              {data.birthdayAlerts.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Tidak ada dalam 30 hari ke depan.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {data.birthdayAlerts.map((a) => (
                    <li
                      key={a.employee.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <span>{a.employee.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.daysUntil === 0 ? "Hari ini!" : `${a.daysUntil} hari lagi`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Habis probation, dokumen tidak lengkap, dan SP butuh review belum tersedia — perlu
              modul tambahan untuk data itu.
            </p>
          </div>
        </section>
      </div>

      <section className="glass-panel p-5">
        <h3 className="text-sm font-semibold">Org Health Heatmap</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Per departemen — merah kalau telat/absen hari ini cukup banyak.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Departemen</th>
                <th className="py-2 pr-4">Headcount</th>
                <th className="py-2 pr-4">Telat Hari Ini</th>
                <th className="py-2 pr-4">Belum Absen</th>
                <th className="py-2 pr-4">Resign MTD</th>
              </tr>
            </thead>
            <tbody>
              {data.orgHealth.map((row) => (
                <tr key={row.department} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 font-medium">{row.department}</td>
                  <td className="py-2 pr-4">{row.headcount}</td>
                  <td className="py-2 pr-4">
                    <span className={row.lateToday > row.headcount * 0.2 ? "text-destructive" : ""}>
                      {row.lateToday}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={row.absentToday > row.headcount * 0.2 ? "text-destructive" : ""}
                    >
                      {row.absentToday}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{row.resignedMTD}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Inbox className="size-4 text-primary" /> Quick Action Inbox
        </h3>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
          <span>{data.pendingLeaveCount} pengajuan cuti/izin menunggu keputusan</span>
          <Link to="/hris" className="text-primary hover:underline">
            Buka HRIS →
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Review SP dan jadwal interview final belum tersedia di sini — perlu modul Surat Peringatan
          dan integrasi lebih lanjut dengan ATS.
        </p>
      </section>
    </div>
  );
}

const STAGE_STEPS: { key: keyof PayrollStageCounts; label: string }[] = [
  { key: "DRAFT", label: "Tarik Absen + Hitung Lembur + Potongan" },
  { key: "PENDING_APPROVAL", label: "Menunggu Approval Direksi" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "PAID", label: "Transfer Bank" },
];

function FinanceDashboardView() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFinanceDashboardData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <p className="text-sm text-muted-foreground">Memuat dashboard…</p>;

  const totalCost =
    data.costBreakdown.basicSalary +
    data.costBreakdown.allowances +
    data.costBreakdown.overtime +
    data.costBreakdown.bpjs +
    data.costBreakdown.pph21;
  const pct = (n: number) => (totalCost > 0 ? Math.round((n / totalCost) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Total Payroll"
          value={rupiah(data.totalPayrollThisMonth)}
          hint={data.currentPeriodLabel}
        />
        <KpiCard
          icon={TrendingUp}
          label="Total Lembur"
          value={rupiah(data.totalOvertimeThisMonth)}
          hint={data.currentPeriodLabel}
        />
        <KpiCard
          icon={Landmark}
          label="Kasbon Outstanding"
          value={rupiah(data.totalKasbonOutstanding)}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Compliance"
          value={`${data.complianceLunasCount}/${data.complianceTotalCount}`}
          hint="Item lunas bulan ini"
        />
      </div>

      <section className="glass-panel p-5">
        <h3 className="text-sm font-semibold">
          Payroll Status Stepper — {data.currentPeriodLabel}
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STAGE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              <div className="rounded-lg border border-border px-3 py-2 text-center text-xs">
                <p className="font-semibold">{data.stageCounts[step.key]}</p>
                <p className="mt-0.5 max-w-[9rem] text-muted-foreground">{step.label}</p>
              </div>
              {i < STAGE_STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <h3 className="text-sm font-semibold">Breakdown Biaya</h3>
          {totalCost === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada payroll periode ini.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              {[
                ["Gaji Pokok", data.costBreakdown.basicSalary],
                ["Tunjangan", data.costBreakdown.allowances],
                ["Lembur", data.costBreakdown.overtime],
                ["BPJS + JHT", data.costBreakdown.bpjs],
                ["PPh21", data.costBreakdown.pph21],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="flex justify-between">
                    <span>{label}</span>
                    <span className="text-muted-foreground">
                      {rupiah(value as number)} ({pct(value as number)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${pct(value as number)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-amber-500" /> Anomali Terdeteksi
          </h3>
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Lembur &gt; 40 jam/bulan</p>
              {data.overtimeAnomalies.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Tidak ada.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {data.overtimeAnomalies.map((a) => (
                    <li
                      key={a.employee.id}
                      className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-1.5 text-sm"
                    >
                      <span>{a.employee.fullName}</span>
                      <Badge variant="destructive">{a.hours} jam</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Kasbon &gt; 2× gaji pokok</p>
              {data.kasbonAnomalies.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Tidak ada.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {data.kasbonAnomalies.map((a) => (
                    <li
                      key={a.employee.id}
                      className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-1.5 text-sm"
                    >
                      <span>{a.employee.fullName}</span>
                      <Badge variant="destructive">{rupiah(a.kasbonTotal)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Deteksi gaji prorata tidak wajar belum tersedia — perlu logika proration yang belum
              dibangun.
            </p>
          </div>
        </section>
      </div>

      <section className="glass-panel p-5">
        <h3 className="text-sm font-semibold">Riwayat Payroll</h3>
        {data.history6Months.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada riwayat payroll.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {data.history6Months.map((h) => (
              <div
                key={h.period}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>{h.period}</span>
                <span className="font-medium">{rupiah(h.total)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Kelola Kasbon dan Compliance Checklist secara detail ada di menu Finance.
        </p>
        <Link to="/finance" className="mt-1 inline-block text-sm text-primary hover:underline">
          Buka Finance →
        </Link>
      </section>
    </div>
  );
}
