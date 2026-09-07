import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Landmark, ShieldCheck } from "lucide-react";
import { getActiveSession, isFinanceDept, isFinanceHead, type UserProfile } from "@/lib/aurora-id";
import { getEmployees, updateEmployee, type Employee } from "@/lib/hris-data";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Human Power Management" },
      {
        name: "description",
        content: "Data gaji, tunjangan, dan rekening karyawan — khusus departemen Finance.",
      },
    ],
  }),
  component: FinancePage,
});

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

function FinancePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | null>(null);

  useEffect(() => {
    const s = getActiveSession();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    if (!isFinanceDept(s)) {
      toast.error("Halaman ini khusus departemen Finance.");
      navigate({ to: "/dashboard" });
      return;
    }
    setSession(s);
  }, [navigate]);

  const refresh = () => {
    setLoading(true);
    getEmployees()
      .then(setEmployees)
      .catch(() => toast.error("Gagal memuat data karyawan."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session) refresh();
  }, [session]);

  if (!session) return null;

  const headFinance = isFinanceHead(session);

  return (
    <AppShell
      title="Finance"
      description={
        headFinance
          ? "Head/Director Finance — bisa mengatur gaji dan tunjangan tiap karyawan."
          : "Admin Finance — lihat data gaji, tunjangan, dan rekening karyawan."
      }
    >
      <div className="glass-panel flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Modul ini terpisah dari Core HRIS &amp; ATS Recruitment — departemen Finance tidak memiliki
        akses ke keduanya.
      </div>

      <section className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-7 text-sm text-muted-foreground">Memuat…</p>
        ) : employees.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada data karyawan.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Pangkat</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Total Tunjangan</TableHead>
                <TableHead>Rekening Bank</TableHead>
                {headFinance && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => {
                const totalAllowance =
                  (e.transportAllowance ?? 0) +
                  (e.mealAllowance ?? 0) +
                  (e.positionAllowance ?? 0) +
                  (e.healthAllowance ?? 0) +
                  (e.insuranceAllowance ?? 0) +
                  (e.pensionContribution ?? 0);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.fullName}</TableCell>
                    <TableCell>{e.position || "—"}</TableCell>
                    <TableCell>{e.rank || "—"}</TableCell>
                    <TableCell>{rupiah(e.basicSalary)}</TableCell>
                    <TableCell>{rupiah(totalAllowance)}</TableCell>
                    <TableCell className="text-xs">
                      {e.bankName ? (
                        <>
                          <p>{e.bankName}</p>
                          <p className="font-mono text-muted-foreground">
                            {e.bankAccountNumber} — {e.bankAccountHolder}
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline">Belum diisi</Badge>
                      )}
                    </TableCell>
                    {headFinance && (
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditing(e)}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {editing && (
        <FinanceEditDialog
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </AppShell>
  );
}

function FinanceEditDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    basicSalary: String(employee.basicSalary),
    transportAllowance: String(employee.transportAllowance ?? 0),
    mealAllowance: String(employee.mealAllowance ?? 0),
    positionAllowance: String(employee.positionAllowance ?? 0),
    healthAllowance: String(employee.healthAllowance ?? 0),
    insuranceAllowance: String(employee.insuranceAllowance ?? 0),
    overtimeRatePerHour: String(employee.overtimeRatePerHour ?? 0),
    pensionContribution: String(employee.pensionContribution ?? 0),
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updateEmployee(employee.id, {
        basicSalary: Number(form.basicSalary) || 0,
        transportAllowance: Number(form.transportAllowance) || 0,
        mealAllowance: Number(form.mealAllowance) || 0,
        positionAllowance: Number(form.positionAllowance) || 0,
        healthAllowance: Number(form.healthAllowance) || 0,
        insuranceAllowance: Number(form.insuranceAllowance) || 0,
        overtimeRatePerHour: Number(form.overtimeRatePerHour) || 0,
        pensionContribution: Number(form.pensionContribution) || 0,
      });
      toast.success(`Gaji & tunjangan ${employee.fullName} diperbarui.`);
      onSaved();
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" /> {employee.fullName}
          </DialogTitle>
          <DialogDescription>
            BPJS, PPh 21, dan pensiun wajib tetap dihitung otomatis pakai formula pemerintah (bukan
            diisi manual di sini). Bonus kinerja dihitung terpisah — belum di sini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Gaji Pokok (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.basicSalary}
              onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
            />
          </div>
          <div>
            <Label>Tunjangan Transport (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.transportAllowance}
              onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })}
            />
          </div>
          <div>
            <Label>Tunjangan Makan (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.mealAllowance}
              onChange={(e) => setForm({ ...form, mealAllowance: e.target.value })}
            />
          </div>
          <div>
            <Label>Tunjangan Jabatan (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.positionAllowance}
              onChange={(e) => setForm({ ...form, positionAllowance: e.target.value })}
            />
          </div>
          <div>
            <Label>Tunjangan Kesehatan (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.healthAllowance}
              onChange={(e) => setForm({ ...form, healthAllowance: e.target.value })}
            />
          </div>
          <div>
            <Label>Tunjangan Asuransi (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.insuranceAllowance}
              onChange={(e) => setForm({ ...form, insuranceAllowance: e.target.value })}
            />
          </div>
          <div>
            <Label>Rate Lembur / Jam (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.overtimeRatePerHour}
              onChange={(e) => setForm({ ...form, overtimeRatePerHour: e.target.value })}
            />
          </div>
          <div>
            <Label>Kontribusi Pensiun (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.pensionContribution}
              onChange={(e) => setForm({ ...form, pensionContribution: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
