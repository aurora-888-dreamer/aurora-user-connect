import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserMinus, Cake, FileWarning, Inbox, AlertTriangle } from "lucide-react";
import { getActiveSession } from "@/lib/admin-auth";
import { getHrdDashboardData, type HrdDashboardData } from "@/lib/hrd-dashboard-data";

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

function DashboardComponent() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [data, setData] = useState<HrdDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    setFullName(session.fullName);
    setReady(true);
    getHrdDashboardData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  if (!ready) return null;

  return (
    <AppShell
      title={`Selamat datang, ${fullName}`}
      description="Dashboard HRD — kesehatan organisasi hari ini. Edit profil, ubah PIN, atau tambah admin baru ada di menu Pengaturan."
    >
      {loading || !data ? (
        <p className="text-sm text-muted-foreground">Memuat dashboard…</p>
      ) : (
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
                        <div className="flex items-center gap-2 min-w-0">
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
                            <p className="truncate text-xs text-muted-foreground">
                              {row.department}
                            </p>
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
                        <span
                          className={row.lateToday > row.headcount * 0.2 ? "text-destructive" : ""}
                        >
                          {row.lateToday}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            row.absentToday > row.headcount * 0.2 ? "text-destructive" : ""
                          }
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
              Review SP dan jadwal interview final belum tersedia di sini — perlu modul Surat
              Peringatan dan integrasi lebih lanjut dengan ATS.
            </p>
          </section>
        </div>
      )}
    </AppShell>
  );
}
