import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Receipt } from "lucide-react";
import { StaffTabBar } from "@/components/StaffTabBar";
import { getAttendanceForEmployee, type AttendanceRecord } from "@/lib/hris-data";
import { getCompanyProfile, getPayrollPeriod } from "@/lib/company-data";
import { getStaffSession } from "@/lib/staff-auth";
import type { StaffAccount } from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/history")({
  head: () => ({
    meta: [{ title: "Riwayat — Human Power Management" }],
  }),
  component: StaffHistoryPage,
});

function StaffHistoryPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [cutoffDay, setCutoffDay] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStaffSession();
    if (!session) {
      navigate({ to: "/staff" });
      return;
    }
    if (!session.profileCompleted) {
      navigate({ to: "/staff/setup" });
      return;
    }
    setAccount(session);
    getCompanyProfile()
      .then((c) => setCutoffDay(c.payrollCutoffDay))
      .catch(() => setCutoffDay(1));
  }, [navigate]);

  useEffect(() => {
    if (!account) return;
    getAttendanceForEmployee(account.employeeId)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;

  // Grouped per periode gaji (bukan bulan kalender) — sesuai tanggal potong
  // yang diatur HRIS di Pengaturan, supaya log ini sinkron dengan periode
  // yang dipakai payroll.
  const periodGroups = new Map<string, { label: string; records: AttendanceRecord[] }>();
  for (const r of records) {
    const period = getPayrollPeriod(cutoffDay, new Date(`${r.date}T12:00:00`));
    const key = period.start;
    const group = periodGroups.get(key) ?? { label: period.label, records: [] };
    group.records.push(r);
    periodGroups.set(key, group);
  }
  const sortedPeriods = Array.from(periodGroups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const currentPeriodKey = getPayrollPeriod(cutoffDay).start;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold">Riwayat</h1>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="size-4 text-primary" /> Slip Gaji
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Segera hadir — perlu migrasi data payroll ke database pusat dulu supaya bisa diakses
            dari HP kamu.
          </p>
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : sortedPeriods.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
        ) : (
          sortedPeriods.map(([key, group]) => {
            const lateCount = group.records.filter((r) => r.status === "LATE").length;
            const alphaCount = group.records.filter((r) => r.status === "ALPHA").length;
            const presentDays = new Set(group.records.map((r) => r.date)).size;
            return (
              <section key={key} className="glass-panel p-5">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Clock className="size-4 text-primary" /> {group.label}
                  </h2>
                  {key === currentPeriodKey && <Badge variant="secondary">Periode berjalan</Badge>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{presentDays}</p>
                    <p className="text-xs text-muted-foreground">Hadir</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{lateCount}</p>
                    <p className="text-xs text-muted-foreground">Telat</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{alphaCount}</p>
                    <p className="text-xs text-muted-foreground">Alpha</p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {group.records.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.date}</span>
                        <Badge variant="secondary">{r.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {r.clockIn ? new Date(r.clockIn).toLocaleTimeString("id-ID") : "—"} –{" "}
                        {r.clockOut ? new Date(r.clockOut).toLocaleTimeString("id-ID") : "—"}
                      </p>
                      {r.isOutsideOffice && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="size-3" /> Di luar kantor
                          {r.outsideTaskStatus ? ` — ${r.outsideTaskStatus}` : ""}
                        </p>
                      )}
                      {r.photoDataUrl && (
                        <img
                          src={r.photoDataUrl}
                          alt="Selfie absensi"
                          className="mt-2 size-10 rounded-full border border-border object-cover"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>

      <StaffTabBar />
    </div>
  );
}
