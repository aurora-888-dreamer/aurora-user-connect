import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getActiveSession } from "@/lib/aurora-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { LogIn, LogOut, Wallet, UserPlus, ScanFace, KeyRound, Copy } from "lucide-react";
import { AttendanceFlow } from "@/components/AttendanceFlow";
import { FaceCaptureDialog } from "@/components/FaceCaptureDialog";
import {
  addEmployee,
  updateEmployee,
  clockOut,
  computePayroll,
  addPayroll,
  markPayrollPaid,
  getAttendance,
  getEmployees,
  getPayrolls,
  type Employee,
  type EmploymentStatus,
  type PtkpStatus,
  type Payroll,
} from "@/lib/hris-data";
import {
  getStaffAccounts,
  createStaffAccount,
  findStaffAccountByEmployee,
  resetStaffAccountToDefaultPin,
  type StaffAccount,
} from "@/lib/staff-auth";

export const Route = createFileRoute("/hris")({
  head: () => ({
    meta: [
      { title: "Core HRIS Internal — Human Power Management" },
      {
        name: "description",
        content:
          "Core HRIS module: employee database, GPS attendance, payroll PPh 21 TER & BPJS, and KPI reviews.",
      },
      { property: "og:title", content: "Core HRIS Internal — Human Power Management" },
      {
        property: "og:description",
        content: "Employee database, attendance, payroll and performance in one workspace.",
      },
    ],
  }),
  component: HrisPage,
});

const EMPLOYMENT_STATUSES: EmploymentStatus[] = ["PKWT", "PKWTT", "INTERN"];
const PTKP_STATUSES: PtkpStatus[] = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

function HrisPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState(() => getAttendance());
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  useEffect(() => {
    if (!getActiveSession()) {
      navigate({ to: "/" });
      return;
    }
    setReady(true);
    setEmployees(getEmployees());
    setPayrolls(getPayrolls());
  }, [navigate]);

  if (!ready) return null;

  const refresh = () => {
    setEmployees(getEmployees());
    setAttendance(getAttendance());
    setPayrolls(getPayrolls());
  };

  return (
    <AppShell
      title="Core HRIS Internal"
      description="Manajemen karyawan aktif, kepatuhan hukum, dan hak finansial. Akses terbatas untuk karyawan, manager, HRD admin dan payroll officer."
    >
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Database Karyawan</TabsTrigger>
          <TabsTrigger value="attendance">Absensi GPS</TabsTrigger>
          <TabsTrigger value="staff-accounts">Akun Staff</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <EmployeeTab employees={employees} onChange={refresh} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab employees={employees} attendance={attendance} onChange={refresh} />
        </TabsContent>

        <TabsContent value="staff-accounts" className="mt-6">
          <StaffAccountsTab employees={employees} />
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <PayrollTab employees={employees} payrolls={payrolls} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmployeeTab({ employees, onChange }: { employees: Employee[]; onChange: () => void }) {
  const [form, setForm] = useState({
    nik: "",
    fullName: "",
    email: "",
    phone: "",
    department: "",
    employmentStatus: "PKWT" as EmploymentStatus,
    joinDate: new Date().toISOString().slice(0, 10),
    npwp: "",
    ptkpStatus: "TK/0" as PtkpStatus,
    basicSalary: "",
  });
  const [enrollTarget, setEnrollTarget] = useState<Employee | null>(null);

  const handleAdd = () => {
    if (!form.fullName.trim() || !form.nik.trim() || !form.basicSalary) {
      toast.error("Lengkapi NIK, nama, dan gaji pokok.");
      return;
    }
    addEmployee({
      nik: form.nik,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      department: form.department || "General",
      employmentStatus: form.employmentStatus,
      joinDate: form.joinDate,
      npwp: form.npwp,
      ptkpStatus: form.ptkpStatus,
      basicSalary: Number(form.basicSalary),
      isActive: true,
      source: "MANUAL",
    });
    toast.success(`Karyawan ${form.fullName} ditambahkan.`);
    setForm({ ...form, nik: "", fullName: "", email: "", phone: "", basicSalary: "" });
    onChange();
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Tambah Karyawan</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>NIK</Label>
            <Input
              className="mt-2"
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
            />
          </div>
          <div>
            <Label>Nama Lengkap</Label>
            <Input
              className="mt-2"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              className="mt-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>No. HP</Label>
            <Input
              className="mt-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Departemen</Label>
            <Input
              className="mt-2"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Sales"
            />
          </div>
          <div>
            <Label>Status Kepegawaian</Label>
            <Select
              value={form.employmentStatus}
              onValueChange={(v) => setForm({ ...form, employmentStatus: v as EmploymentStatus })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal Bergabung</Label>
            <Input
              type="date"
              className="mt-2"
              value={form.joinDate}
              onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
            />
          </div>
          <div>
            <Label>NPWP (opsional)</Label>
            <Input
              className="mt-2"
              value={form.npwp}
              onChange={(e) => setForm({ ...form, npwp: e.target.value })}
            />
          </div>
          <div>
            <Label>Status PTKP</Label>
            <Select
              value={form.ptkpStatus}
              onValueChange={(v) => setForm({ ...form, ptkpStatus: v as PtkpStatus })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PTKP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gaji Pokok (Rp)</Label>
            <Input
              type="number"
              className="mt-2"
              value={form.basicSalary}
              onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
              placeholder="7500000"
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-5">
          <UserPlus className="size-4" /> Tambah Karyawan
        </Button>
      </section>

      <section className="glass-panel overflow-hidden">
        {employees.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">
            Belum ada karyawan. Tambahkan lewat form di atas.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PTKP</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>FaceID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.nik || "—"}</TableCell>
                  <TableCell>{e.fullName}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.employmentStatus}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.ptkpStatus}</TableCell>
                  <TableCell>{rupiah(e.basicSalary)}</TableCell>
                  <TableCell>
                    {e.source === "ATS_HANDOVER" ? (
                      <Badge className="bg-primary/15 text-primary" variant="secondary">
                        ATS Handover
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.faceDescriptor ? (
                      <Badge className="gap-1 bg-primary/15 text-primary" variant="secondary">
                        <ScanFace className="size-3" /> Terdaftar
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEnrollTarget(e)}>
                        <ScanFace className="size-3.5" /> Daftarkan
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {enrollTarget && (
        <FaceCaptureDialog
          open={!!enrollTarget}
          mode="enroll"
          employeeName={enrollTarget.fullName}
          onClose={() => setEnrollTarget(null)}
          onEnrolled={({ descriptor }) => {
            updateEmployee(enrollTarget.id, { faceDescriptor: descriptor });
            toast.success(`Wajah ${enrollTarget.fullName} berhasil didaftarkan.`);
            setEnrollTarget(null);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function AttendanceTab({
  employees,
  attendance,
  onChange,
}: {
  employees: Employee[];
  attendance: ReturnType<typeof getAttendance>;
  onChange: () => void;
}) {
  const [selected, setSelected] = useState<string>(employees[0]?.id ?? "");

  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0]!.id);
  }, [employees, selected]);

  const employee = employees.find((e) => e.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Absensi Harian — FaceID + GPS (mode kiosk)</h3>
        {employees.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Tambahkan karyawan dulu di tab Database Karyawan.
          </p>
        ) : (
          <>
            <div className="mt-4 max-w-sm">
              <Label>Pilih Karyawan</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} {e.faceDescriptor ? "" : "(belum daftar wajah)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-5">
              <AttendanceFlow employee={employee} onChange={onChange} />
            </div>
          </>
        )}
      </section>

      <section className="glass-panel overflow-hidden">
        {attendance.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada riwayat absensi.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Pulang</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...attendance].reverse().map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    {employees.find((e) => e.id === r.employeeId)?.fullName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.clockIn ? new Date(r.clockIn).toLocaleTimeString("id-ID") : "—"}
                  </TableCell>
                  <TableCell>
                    {r.clockOut ? new Date(r.clockOut).toLocaleTimeString("id-ID") : "—"}
                  </TableCell>
                  <TableCell>
                    {r.isOutsideOffice ? (
                      <span className="text-xs text-destructive" title={r.outsideLocationNote}>
                        Luar kantor · {r.outsideTaskStatus || "—"}
                      </span>
                    ) : r.distanceMeters !== undefined ? (
                      <span className="text-xs text-muted-foreground">Dalam radius kantor</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.photoDataUrl ? (
                      <img
                        src={r.photoDataUrl}
                        alt="Selfie"
                        className="size-8 rounded-full border border-border object-cover"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function StaffAccountsTab({ employees }: { employees: Employee[] }) {
  const [accounts, setAccounts] = useState<StaffAccount[]>(() => getStaffAccounts());
  const [form, setForm] = useState({ employeeId: "", whatsapp: "", email: "" });

  const refresh = () => setAccounts(getStaffAccounts());

  const availableEmployees = employees.filter((e) => !findStaffAccountByEmployee(e.id));

  const handleCreate = () => {
    const employee = employees.find((e) => e.id === form.employeeId);
    if (!employee) {
      toast.error("Pilih karyawan dulu.");
      return;
    }
    if (!form.whatsapp.trim()) {
      toast.error("Nomor WhatsApp wajib diisi (dipakai untuk verifikasi OTP saat login pertama).");
      return;
    }
    const account = createStaffAccount({
      employeeId: employee.id,
      fullName: employee.fullName,
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim() || employee.email,
    });
    toast.success(`Akun staff dibuat: ${account.userId} (PIN default: ${account.pin})`);
    setForm({ employeeId: "", whatsapp: "", email: "" });
    refresh();
  };

  const copyInvite = (account: StaffAccount) => {
    const text = `User ID: ${account.userId}\nPIN awal: ${account.pin}\nLogin di halaman Staff, lalu ikuti langkah verifikasi.`;
    navigator.clipboard?.writeText(text);
    toast.success("Info undangan disalin ke clipboard.");
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Buatkan Akun Staff</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          User ID dibuat otomatis (pola: 5 huruf nama + kode negara + 3 digit akhir WA), PIN awal{" "}
          <code>123456</code> — staff wajib ganti saat login pertama.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Karyawan</Label>
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm({ ...form, employeeId: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih karyawan" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>No. WhatsApp</Label>
            <Input
              className="mt-2"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="08211307710"
            />
          </div>
          <div>
            <Label>Email (untuk lupa PIN)</Label>
            <Input
              className="mt-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleCreate} className="mt-5">
          <KeyRound className="size-4" /> Buatkan Akun Staff
        </Button>
      </section>

      <section className="glass-panel overflow-hidden">
        {accounts.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada akun staff dibuat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.userId}</TableCell>
                  <TableCell>{a.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{a.whatsapp}</TableCell>
                  <TableCell>
                    {a.profileCompleted ? (
                      <Badge className="bg-primary/15 text-primary" variant="secondary">
                        Aktif
                      </Badge>
                    ) : a.waVerified ? (
                      <Badge variant="secondary">Setup belum selesai</Badge>
                    ) : (
                      <Badge variant="outline">Belum login pertama</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyInvite(a)}>
                      <Copy className="size-3.5" /> Salin Info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetStaffAccountToDefaultPin(a.id);
                        toast.success(`PIN ${a.userId} direset ke default (123456).`);
                        refresh();
                      }}
                    >
                      Reset PIN
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function PayrollTab({
  employees,
  payrolls,
  onChange,
}: {
  employees: Employee[];
  payrolls: Payroll[];
  onChange: () => void;
}) {
  const [selected, setSelected] = useState<string>(employees[0]?.id ?? "");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [allowances, setAllowances] = useState("0");
  const [overtimePay, setOvertimePay] = useState("0");

  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0]!.id);
  }, [employees, selected]);

  const employee = employees.find((e) => e.id === selected);
  const preview = employee
    ? computePayroll({
        employee,
        period,
        allowances: Number(allowances) || 0,
        overtimePay: Number(overtimePay) || 0,
      })
    : null;

  const handleGenerate = () => {
    if (!preview) return;
    addPayroll(preview);
    toast.success("Slip gaji dibuat (status DRAFT).");
    onChange();
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Kalkulator Payroll — PPh 21 TER &amp; BPJS</h3>
        {employees.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Tambahkan karyawan dulu di tab Database Karyawan.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Karyawan</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Periode (YYYY-MM)</Label>
                <Input
                  className="mt-2"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>
              <div>
                <Label>Tunjangan (Rp)</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={allowances}
                  onChange={(e) => setAllowances(e.target.value)}
                />
              </div>
              <div>
                <Label>Lembur (Rp)</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={overtimePay}
                  onChange={(e) => setOvertimePay(e.target.value)}
                />
              </div>
            </div>

            {preview && (
              <div className="mt-6 grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:grid-cols-3">
                <Stat
                  label="Gaji Bruto"
                  value={rupiah(preview.basicSalary + preview.allowances + preview.overtimePay)}
                />
                <Stat label="PPh 21 TER" value={`- ${rupiah(preview.pph21Amount)}`} />
                <Stat
                  label="BPJS (Kes + TK)"
                  value={`- ${rupiah(preview.bpjsHealthEmp + preview.bpjsTkEmp)}`}
                />
                <Stat label="Gaji Bersih (Net)" value={rupiah(preview.netSalary)} highlight />
              </div>
            )}

            <Button onClick={handleGenerate} className="mt-5" disabled={!preview}>
              <Wallet className="size-4" /> Buat Slip Gaji
            </Button>
          </>
        )}
      </section>

      <section className="glass-panel overflow-hidden">
        {payrolls.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada slip gaji dibuat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Bruto</TableHead>
                <TableHead>PPh21</TableHead>
                <TableHead>BPJS</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...payrolls].reverse().map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>
                    {employees.find((e) => e.id === p.employeeId)?.fullName ?? "—"}
                  </TableCell>
                  <TableCell>{rupiah(p.basicSalary + p.allowances + p.overtimePay)}</TableCell>
                  <TableCell>{rupiah(p.pph21Amount)}</TableCell>
                  <TableCell>{rupiah(p.bpjsHealthEmp + p.bpjsTkEmp)}</TableCell>
                  <TableCell className="font-semibold">{rupiah(p.netSalary)}</TableCell>
                  <TableCell>
                    <Badge variant={p.paymentStatus === "PAID" ? "default" : "secondary"}>
                      {p.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.paymentStatus === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          markPayrollPaid(p.id);
                          onChange();
                        }}
                      >
                        Tandai Dibayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg ${highlight ? "text-aurora font-bold" : ""}`}>
        {value}
      </p>
    </div>
  );
}

