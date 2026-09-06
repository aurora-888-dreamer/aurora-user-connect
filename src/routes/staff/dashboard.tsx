import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCog, Clock } from "lucide-react";
import { AttendanceFlow } from "@/components/AttendanceFlow";
import { getEmployees, getAttendance, type Employee } from "@/lib/hris-data";
import { getStaffSession, setStaffSession, type StaffAccount } from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard Staff — Human Power Management" }],
  }),
  component: StaffDashboardPage,
});

function StaffDashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
    setEmployee(getEmployees().find((e) => e.id === account.employeeId) ?? null);
  }, [account, refreshKey]);

  if (!account) return null;

  const myHistory = getAttendance()
    .filter((r) => r.employeeId === account.employeeId)
    .reverse()
    .slice(0, 5);

  const handleLogout = () => {
    setStaffSession(null);
    navigate({ to: "/staff" });
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">HPM Staff</p>
          <h1 className="text-lg font-bold">{account.fullName}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="size-3.5" /> Keluar
        </Button>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        <section className="glass-panel p-5">
          <h2 className="text-base font-semibold">Absensi Hari Ini</h2>
          <div className="mt-4">
            <AttendanceFlow employee={employee} onChange={() => setRefreshKey((k) => k + 1)} />
          </div>
        </section>

        <Link to="/staff/profile" className="glass-panel flex items-center gap-3 p-4">
          <UserCog className="size-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Edit Profil</p>
            <p className="text-xs text-muted-foreground">Foto, email, dan data lainnya</p>
          </div>
        </Link>

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="size-4 text-primary" />
            Riwayat Absensi Saya
          </h2>
          {myHistory.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myHistory.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <span>{r.date}</span>
                  <span className="text-muted-foreground">
                    {r.clockIn ? new Date(r.clockIn).toLocaleTimeString("id-ID") : "—"} –{" "}
                    {r.clockOut ? new Date(r.clockOut).toLocaleTimeString("id-ID") : "—"}
                  </span>
                  <Badge variant="secondary">{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
