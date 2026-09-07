import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, CalendarDays } from "lucide-react";
import { StaffTabBar } from "@/components/StaffTabBar";
import { getEmployeeById, type Employee } from "@/lib/hris-data";
import { getStaffSession } from "@/lib/staff-auth";
import type { StaffAccount } from "@/lib/staff-auth";
import { submitLeaveRequest, REASON_CATEGORIES, type ReasonCategory } from "@/lib/leave-data";

export const Route = createFileRoute("/staff/request")({
  head: () => ({
    meta: [{ title: "Ajukan — Human Power Management" }],
  }),
  component: StaffRequestPage,
});

const REQUEST_TYPES = [
  { value: "leave", label: "Cuti / Izin", available: true },
  { value: "personal-data", label: "Ubah Data Pribadi", available: false },
  { value: "reimbursement", label: "Reimbursement", available: false },
  { value: "schedule", label: "Ubah Jadwal", available: false },
] as const;

function StaffRequestPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [requestType, setRequestType] = useState<string>("leave");
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory | "">("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

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
    getEmployeeById(account.employeeId)
      .then(setEmployee)
      .catch(() => setEmployee(null));
  }, [account]);

  if (!account) return null;

  const handleSubmit = async () => {
    if (!employee) return;
    if (!reasonCategory) {
      toast.error("Pilih kategori alasan.");
      return;
    }
    if (endDate < startDate) {
      toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLeaveRequest({
        employeeId: employee.id,
        ...(employee.supervisorId ? { supervisorEmployeeId: employee.supervisorId } : {}),
        reasonCategory,
        ...(note.trim() ? { note: note.trim() } : {}),
        startDate,
        endDate,
      });
      toast.success(
        employee.supervisorId
          ? "Pengajuan terkirim ke atasan. Cek hasilnya di Kotak Masuk."
          : "Pengajuan tersimpan. Karyawan ini belum punya atasan di data — hubungi HR untuk melengkapi struktur organisasi.",
      );
      setReasonCategory("");
      setNote("");
    } catch {
      toast.error("Gagal mengirim pengajuan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold">Ajukan</h1>
      </header>

      <main className="mx-auto max-w-md space-y-5 p-5">
        <section className="glass-panel p-5">
          <Label>Jenis Pengajuan</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} disabled={!t.available}>
                  {t.label} {!t.available ? "(segera hadir)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {requestType === "leave" && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dari Tanggal</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Sampai Tanggal</Label>
                  <Input
                    type="date"
                    className="mt-2"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Kategori Alasan</Label>
                <Select
                  value={reasonCategory}
                  onValueChange={(v) => setReasonCategory(v as ReasonCategory)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catatan Tambahan (opsional)</Label>
                <Textarea
                  className="mt-2"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Detail tambahan kalau perlu"
                />
              </div>
              {employee && !employee.supervisorId && (
                <p className="flex items-center gap-1.5 text-xs text-amber-500">
                  <CalendarDays className="size-3.5" />
                  Kamu belum punya atasan di data HRIS — pengajuan tetap tersimpan tapi belum ada
                  yang menerima notifikasi approval.
                </p>
              )}
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                <Send className="size-4" /> {submitting ? "Mengirim…" : "Kirim Pengajuan"}
              </Button>
            </div>
          )}

          {requestType !== "leave" && (
            <p className="mt-5 text-sm text-muted-foreground">
              Jenis pengajuan ini masuk roadmap Fase 3 — belum tersedia.
            </p>
          )}
        </section>
      </main>

      <StaffTabBar />
    </div>
  );
}
