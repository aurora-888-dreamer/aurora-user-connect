import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Receipt } from "lucide-react";
import { StaffTabBar } from "@/components/StaffTabBar";
import { getAttendanceForEmployee, type AttendanceRecord } from "@/lib/hris-data";
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
  }, [navigate]);

  useEffect(() => {
    if (!account) return;
    getAttendanceForEmployee(account.employeeId)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRecords = records.filter((r) => r.date.startsWith(thisMonth));
  const lateCount = thisMonthRecords.filter((r) => r.status === "LATE").length;
  const alphaCount = thisMonthRecords.filter((r) => r.status === "ALPHA").length;
  const presentDays = new Set(thisMonthRecords.map((r) => r.date)).size;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold">Riwayat</h1>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        <section className="glass-panel p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">Ringkasan Bulan Ini</h2>
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
        </section>

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Receipt className="size-4 text-primary" /> Slip Gaji
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Segera hadir — perlu migrasi data payroll ke database pusat dulu supaya bisa diakses
            dari HP kamu.
          </p>
        </section>

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="size-4 text-primary" /> Log Absensi
          </h2>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
          ) : records.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {records.map((r) => (
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
          )}
        </section>
      </main>

      <StaffTabBar />
    </div>
  );
}
