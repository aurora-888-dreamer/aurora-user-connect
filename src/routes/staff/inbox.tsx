import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Megaphone, ClipboardCheck, Bell, Check, X } from "lucide-react";
import { StaffTabBar } from "@/components/StaffTabBar";
import { ChatSection } from "@/components/ChatSection";
import { getAnnouncements, type Announcement } from "@/lib/announcements-data";
import { getSubordinates, type Employee } from "@/lib/hris-data";
import { getStaffSession } from "@/lib/staff-auth";
import type { StaffAccount } from "@/lib/staff-auth";
import {
  getPendingApprovalsFor,
  getMyLeaveRequests,
  decideLeaveRequest,
  type LeaveRequest,
} from "@/lib/leave-data";

export const Route = createFileRoute("/staff/inbox")({
  head: () => ({
    meta: [{ title: "Kotak Masuk — Human Power Management" }],
  }),
  component: StaffInboxPage,
});

function StaffInboxPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [subordinateNames, setSubordinateNames] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
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

  const reload = (employeeId: string) => {
    setLoading(true);
    Promise.all([
      getAnnouncements(),
      getSubordinates(employeeId),
      getPendingApprovalsFor(employeeId),
      getMyLeaveRequests(employeeId),
    ])
      .then(([a, subs, pendingApprovals, mine]) => {
        setAnnouncements(a);
        setSubordinates(subs);
        setSubordinateNames(Object.fromEntries(subs.map((s) => [s.id, s.fullName])));
        setPending(pendingApprovals);
        setMyRequests(mine);
      })
      .catch(() => {
        setAnnouncements([]);
        setSubordinates([]);
        setPending([]);
        setMyRequests([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!account) return;
    reload(account.employeeId);
  }, [account]);

  if (!account) return null;

  const isSupervisor = subordinates.length > 0;

  const handleDecide = async (id: string, status: "APPROVED" | "REJECTED") => {
    setDecidingId(id);
    try {
      await decideLeaveRequest(id, status, decisionNotes[id]);
      toast.success(status === "APPROVED" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
      reload(account.employeeId);
    } catch {
      toast.error("Gagal memproses. Coba lagi.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold">Kotak Masuk</h1>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        <section className="glass-panel p-5">
          <ChatSection
            me={{
              type: "staff",
              id: account.id,
              userId: account.userId,
              fullName: account.fullName,
            }}
          />
        </section>

        {/* Role-based visibility: only shows for accounts with subordinates */}
        {isSupervisor && (
          <section className="glass-panel p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ClipboardCheck className="size-4 text-primary" /> Perlu Persetujuan
            </h2>
            {loading ? (
              <p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
            ) : pending.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Tidak ada pengajuan menunggu.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {pending.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">
                      {subordinateNames[r.employeeId] ?? "Karyawan"} — Cuti/Izin
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.startDate} s/d {r.endDate} · {r.reasonCategory}
                    </p>
                    {r.note && <p className="mt-1 text-xs text-muted-foreground">"{r.note}"</p>}
                    <Textarea
                      className="mt-2"
                      rows={2}
                      placeholder="Catatan keputusan (opsional)"
                      value={decisionNotes[r.id] ?? ""}
                      onChange={(e) =>
                        setDecisionNotes({ ...decisionNotes, [r.id]: e.target.value })
                      }
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={decidingId === r.id}
                        onClick={() => handleDecide(r.id, "APPROVED")}
                      >
                        <Check className="size-3.5" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={decidingId === r.id}
                        onClick={() => handleDecide(r.id, "REJECTED")}
                      >
                        <X className="size-3.5" /> Tolak
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Bell className="size-4 text-primary" /> Hasil Pengajuan Saya
          </h2>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
          ) : myRequests.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada pengajuan.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myRequests.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Cuti/Izin — {r.reasonCategory}</p>
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
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.startDate} s/d {r.endDate}
                  </p>
                  {r.decisionNote && (
                    <p className="mt-1 text-xs text-muted-foreground">Catatan: {r.decisionNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-panel p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Megaphone className="size-4 text-primary" /> Pengumuman
          </h2>
          {loading ? (
            <p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
          ) : announcements.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada pengumuman.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-[0.65rem] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("id-ID")}
                  </p>
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
