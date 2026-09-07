import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Megaphone, Clock3, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AttendanceFlow } from "@/components/AttendanceFlow";
import { StaffTabBar } from "@/components/StaffTabBar";
import { getEmployeeById, type Employee } from "@/lib/hris-data";
import { getCompanyProfile, type CompanyProfile } from "@/lib/company-data";
import { getAnnouncements, type Announcement } from "@/lib/announcements-data";
import { getMyLeaveRequests, type LeaveRequest } from "@/lib/leave-data";
import {
  getStaffSession,
  setStaffSession,
  refreshStaffSession,
  type StaffAccount,
} from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/dashboard")({
  head: () => ({
    meta: [{ title: "Beranda — Human Power Management" }],
  }),
  component: StaffDashboardPage,
});

function StaffDashboardPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
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
    // Pick up any changes made from another device (e.g. HR reset the PIN).
    refreshStaffSession()
      .then((fresh) => fresh && setAccount(fresh))
      .catch(() => {
        /* keep the cached session if the refresh fails (e.g. offline) */
      });
    getCompanyProfile()
      .then(setCompany)
      .catch(() => setCompany(null));
    getAnnouncements()
      .then((rows) => setAnnouncements(rows.slice(0, 2)))
      .catch(() => setAnnouncements([]));
  }, [navigate]);

  useEffect(() => {
    if (!account) return;
    getMyLeaveRequests(account.employeeId)
      .then((rows) => setMyRequests(rows.slice(0, 3)))
      .catch(() => setMyRequests([]));
  }, [account]);

  useEffect(() => {
    if (!account) return;
    getEmployeeById(account.employeeId)
      .then((row) =>
        // FaceID lives on the staff account, but AttendanceFlow expects it on the employee object.
        setEmployee(row ? { ...row, faceDescriptor: account.faceDescriptor } : null),
      )
      .catch(() => setEmployee(null));
  }, [account, refreshKey]);

  if (!account) return null;

  const handleLogout = () => {
    setStaffSession(null);
    navigate({ to: "/staff" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">HPM Staff</p>
          <h1 className="text-lg font-bold">{account.fullName}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        {company?.workStartTime && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            Shift {company.workStartTime}–{company.workEndTime}
          </p>
        )}

        <section className="glass-panel p-5">
          <h2 className="text-base font-semibold">Absensi Hari Ini</h2>
          <div className="mt-4">
            <AttendanceFlow
              employee={employee}
              compact
              onChange={async () => {
                const fresh = await refreshStaffSession();
                if (fresh) setAccount(fresh);
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        </section>

        {announcements.length > 0 && (
          <section className="glass-panel p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Megaphone className="size-4 text-primary" /> Pengumuman
            </h2>
            <ul className="mt-3 space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
            <Link to="/staff/inbox" className="mt-3 block text-center text-xs text-primary">
              Lihat semua pengumuman
            </Link>
          </section>
        )}

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Bell className="size-4 text-primary" /> Pengajuan Saya
          </h2>
          {myRequests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada pengajuan.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">Cuti/Izin — {r.reasonCategory}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.startDate} s/d {r.endDate}
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === "APPROVED"
                        ? "default"
                        : r.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link to="/staff/request" className="mt-3 block text-center text-xs text-primary">
            Ajukan Baru
          </Link>
        </section>
      </main>

      <StaffTabBar />
    </div>
  );
}
