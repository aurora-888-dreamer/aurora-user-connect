import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getActiveSession } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Wallet,
  UserPlus,
  ScanFace,
  KeyRound,
  Megaphone,
  MapPinned,
  Clock3,
  Copy,
  Pencil,
  Trash2,
  ImageIcon,
  History,
  IdCard,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AttendanceFlow } from "@/components/AttendanceFlow";
import { ContactListSection } from "@/components/ContactListSection";
import {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  clockOut,
  computePayroll,
  addPayroll,
  markPayrollPaid,
  getAttendance,
  getEmployees,
  joinFaceDescriptors,
  getPayrolls,
  type Employee,
  type EmploymentStatus,
  type PtkpStatus,
  type Payroll,
  type AttendanceRecord,
  type MaritalStatus,
  type FamilyData,
  type Religion,
  RELIGIONS,
  type PositionLevel,
  POSITION_LEVELS,
  type BloodType,
  BLOOD_TYPES,
  getLocations,
  addLocation,
  updateLocation,
  deleteLocation,
  type WorkLocation,
  type LocationType,
  getEmployeeMutations,
  logEmployeeMutation,
  type EmployeeMutation,
  type MutationField,
  getShiftTypes,
  addShiftType,
  updateShiftType,
  deleteShiftType,
  bulkAssignShiftToDepartment,
  type ShiftType,
  computeAttendanceSummaryForAll,
  computeAttendanceSummary,
  type AttendanceSummary,
} from "@/lib/hris-data";
import { getCompanyProfile, getPreviousPayrollPeriod } from "@/lib/company-data";
import {
  getStaffAccounts,
  createStaffAccount,
  resetStaffAccountToDefaultPin,
  type StaffAccount,
} from "@/lib/staff-auth";
import {
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/announcements-data";

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
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [rawEmployees, attendanceRows, accounts] = await Promise.all([
        getEmployees(),
        getAttendance(),
        getStaffAccounts(),
      ]);
      const withFaces = await joinFaceDescriptors(rawEmployees);
      setEmployees(withFaces);
      setAttendance(attendanceRows);
      setStaffAccounts(accounts);
      setPayrolls(getPayrolls());
    } catch {
      toast.error("Gagal memuat data dari server. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getActiveSession()) {
      navigate({ to: "/" });
      return;
    }
    setReady(true);
    refresh();
  }, [navigate]);

  if (!ready) return null;

  return (
    <AppShell
      title="Core HRIS Internal"
      description="Manajemen karyawan aktif, kepatuhan hukum, dan hak finansial. Akses terbatas untuk karyawan, manager, HRD admin dan payroll officer."
    >
      {loading && employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      ) : (
        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">Database Karyawan</TabsTrigger>
            <TabsTrigger value="locations">Lokasi</TabsTrigger>
            <TabsTrigger value="shifts">Jam Kerja</TabsTrigger>
            <TabsTrigger value="attendance">Absensi GPS</TabsTrigger>
            <TabsTrigger value="final-report">Laporan Akhir</TabsTrigger>
            <TabsTrigger value="staff-accounts">Akun Staff</TabsTrigger>
            <TabsTrigger value="announcements">Pengumuman</TabsTrigger>
            <TabsTrigger value="contacts">Contact List</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6">
            <EmployeeTab employees={employees} accounts={staffAccounts} onChange={refresh} />
          </TabsContent>

          <TabsContent value="locations" className="mt-6">
            <LocationsTab />
          </TabsContent>

          <TabsContent value="shifts" className="mt-6">
            <ShiftsTab employees={employees} onChange={refresh} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceTab employees={employees} attendance={attendance} onChange={refresh} />
          </TabsContent>

          <TabsContent value="final-report" className="mt-6">
            <FinalReportTab employees={employees} />
          </TabsContent>

          <TabsContent value="staff-accounts" className="mt-6">
            <StaffAccountsTab employees={employees} accounts={staffAccounts} onChange={refresh} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <AnnouncementsTab />
          </TabsContent>

          <TabsContent value="contacts" className="mt-6">
            <ContactListSection />
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <PayrollTab employees={employees} payrolls={payrolls} onChange={refresh} />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

const MARITAL_STATUSES: MaritalStatus[] = ["Menikah", "Belum Menikah", "Cerai Hidup", "Cerai Mati"];

const emptyForm = {
  nik: "",
  fullName: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  rank: "",
  positionLevel: "Staff" as PositionLevel,
  bloodType: "" as BloodType | "",
  locationId: "",
  shiftTypeId: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  employmentStatus: "PKWT" as EmploymentStatus,
  joinDate: new Date().toISOString().slice(0, 10),
  npwp: "",
  ptkpStatus: "TK/0" as PtkpStatus,
  supervisorId: "",
  religion: "" as Religion | "",
  maritalStatus: "" as MaritalStatus | "",
  spouseName: "",
  spouseWhatsapp: "",
  children: [] as { name: string; whatsapp: string }[],
  fatherName: "",
  fatherWhatsapp: "",
  motherName: "",
  motherWhatsapp: "",
  siblings: [] as { name: string; whatsapp: string }[],
};

function EmployeeFormDialog({
  open,
  onClose,
  editing,
  employees,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Employee | null;
  employees: Employee[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);

  useEffect(() => {
    if (!open) return;
    getLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
    getShiftTypes()
      .then(setShiftTypes)
      .catch(() => setShiftTypes([]));
    const fd = editing?.familyData;
    setForm(
      editing
        ? {
            nik: editing.nik,
            fullName: editing.fullName,
            email: editing.email,
            phone: editing.phone,
            department: editing.department,
            position: editing.position,
            rank: editing.rank,
            positionLevel: editing.positionLevel ?? "Staff",
            bloodType: editing.bloodType ?? "",
            locationId: editing.locationId ?? "",
            shiftTypeId: editing.shiftTypeId ?? "",
            bankName: editing.bankName ?? "",
            bankAccountNumber: editing.bankAccountNumber ?? "",
            bankAccountHolder: editing.bankAccountHolder ?? "",
            employmentStatus: editing.employmentStatus,
            joinDate: editing.joinDate || new Date().toISOString().slice(0, 10),
            npwp: editing.npwp,
            ptkpStatus: editing.ptkpStatus,
            supervisorId: editing.supervisorId ?? "",
            religion: fd?.religion ?? "",
            maritalStatus: fd?.maritalStatus ?? "",
            spouseName: fd?.spouse?.name ?? "",
            spouseWhatsapp: fd?.spouse?.whatsapp ?? "",
            children:
              fd?.children?.map((c) => ({ name: c.name ?? "", whatsapp: c.whatsapp ?? "" })) ?? [],
            fatherName: fd?.father?.name ?? "",
            fatherWhatsapp: fd?.father?.whatsapp ?? "",
            motherName: fd?.mother?.name ?? "",
            motherWhatsapp: fd?.mother?.whatsapp ?? "",
            siblings:
              fd?.siblings?.map((s) => ({ name: s.name ?? "", whatsapp: s.whatsapp ?? "" })) ?? [],
          }
        : emptyForm,
    );
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.nik.trim()) {
      toast.error("Lengkapi NIK dan nama.");
      return;
    }
    setSubmitting(true);
    try {
      const familyData: FamilyData = {
        ...(form.religion ? { religion: form.religion } : {}),
        ...(form.maritalStatus ? { maritalStatus: form.maritalStatus } : {}),
        ...(form.maritalStatus === "Menikah"
          ? {
              ...(form.spouseName || form.spouseWhatsapp
                ? { spouse: { name: form.spouseName, whatsapp: form.spouseWhatsapp } }
                : {}),
              ...(form.children.length > 0 ? { children: form.children } : {}),
            }
          : {
              ...(form.fatherName || form.fatherWhatsapp
                ? { father: { name: form.fatherName, whatsapp: form.fatherWhatsapp } }
                : {}),
              ...(form.motherName || form.motherWhatsapp
                ? { mother: { name: form.motherName, whatsapp: form.motherWhatsapp } }
                : {}),
              ...(form.siblings.length > 0 ? { siblings: form.siblings } : {}),
            }),
      };
      const payload = {
        nik: form.nik,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        department: form.department || "General",
        position: form.position,
        rank: form.rank,
        positionLevel: form.positionLevel,
        ...(form.bloodType ? { bloodType: form.bloodType } : {}),
        ...(form.locationId ? { locationId: form.locationId } : {}),
        ...(form.shiftTypeId ? { shiftTypeId: form.shiftTypeId } : {}),
        bankName: form.bankName,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountHolder: form.bankAccountHolder,
        employmentStatus: form.employmentStatus,
        joinDate: form.joinDate,
        npwp: form.npwp,
        ptkpStatus: form.ptkpStatus,
        isActive: true,
        source: "MANUAL" as const,
        ...(form.supervisorId ? { supervisorId: form.supervisorId } : {}),
        ...(Object.keys(familyData).length > 0 ? { familyData } : {}),
      };
      if (editing) {
        await updateEmployee(editing.id, payload);
        // Jabatan/Pangkat/Departemen/Lokasi bisa berubah sewaktu-waktu — catat
        // sebagai riwayat mutasi, bukan cuma ditimpa diam-diam.
        const mutationChecks: {
          field: MutationField;
          oldVal: string;
          newVal: string;
          label: string;
        }[] = [
          {
            field: "department",
            oldVal: editing.department,
            newVal: payload.department,
            label: "",
          },
          { field: "position", oldVal: editing.position, newVal: payload.position, label: "" },
          { field: "rank", oldVal: editing.rank, newVal: payload.rank, label: "" },
          {
            field: "location",
            oldVal: locations.find((l) => l.id === editing.locationId)?.name ?? "",
            newVal: locations.find((l) => l.id === payload.locationId)?.name ?? "",
            label: "",
          },
          {
            field: "shift",
            oldVal: shiftTypes.find((s) => s.id === editing.shiftTypeId)?.name ?? "",
            newVal: shiftTypes.find((s) => s.id === payload.shiftTypeId)?.name ?? "",
            label: "",
          },
        ];
        for (const check of mutationChecks) {
          if (check.oldVal !== check.newVal) {
            await logEmployeeMutation({
              employeeId: editing.id,
              fieldChanged: check.field,
              ...(check.oldVal ? { oldValue: check.oldVal } : {}),
              ...(check.newVal ? { newValue: check.newVal } : {}),
            }).catch(() => {
              /* non-fatal — the main data update already succeeded */
            });
          }
        }
        toast.success(`Data ${form.fullName} diperbarui.`);
      } else {
        await addEmployee(payload);
        toast.success(`Karyawan ${form.fullName} ditambahkan.`);
      }
      onSaved();
      onClose();
    } catch {
      toast.error(
        editing
          ? "Gagal menyimpan perubahan. Coba lagi."
          : "Gagal menambahkan karyawan. Coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const supervisorOptions = employees.filter((e) => e.id !== editing?.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit Karyawan — ${editing.fullName}` : "Tambah Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Perbarui data karyawan ini." : "Isi data karyawan baru."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Label>Jabatan</Label>
            <Input
              className="mt-2"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="Staff / Supervisor / Manager"
            />
          </div>
          <div>
            <Label>Pangkat / Golongan</Label>
            <Input
              className="mt-2"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
              placeholder="Golongan III/A"
            />
          </div>
          <div>
            <Label>Level Jabatan</Label>
            <Select
              value={form.positionLevel}
              onValueChange={(v) => setForm({ ...form, positionLevel: v as PositionLevel })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Menentukan siapa di Finance yang boleh lihat gajinya.
            </p>
          </div>
          <div>
            <Label>Golongan Darah</Label>
            <Select
              value={form.bloodType || "none"}
              onValueChange={(v) =>
                setForm({ ...form, bloodType: v === "none" ? "" : (v as BloodType) })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih golongan darah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum diisi</SelectItem>
                {BLOOD_TYPES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lokasi Kerja</Label>
            <Select
              value={form.locationId || "default"}
              onValueChange={(v) => setForm({ ...form, locationId: v === "default" ? "" : v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Kantor Pusat (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Kantor Pusat (default)</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Shift Kerja</Label>
            <Select
              value={form.shiftTypeId || "default"}
              onValueChange={(v) => setForm({ ...form, shiftTypeId: v === "default" ? "" : v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Default Perusahaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Perusahaan</SelectItem>
                {shiftTypes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Atasan Langsung</Label>
            <Select
              value={form.supervisorId || "none"}
              onValueChange={(v) => setForm({ ...form, supervisorId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Tidak ada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tidak ada</SelectItem>
                {supervisorOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName} {e.position ? `— ${e.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <div className="mt-2 border-t border-border pt-4">
          <h4 className="text-sm font-semibold">Data Rekening Bank (untuk pembayaran gaji)</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Nama Bank</Label>
              <Input
                className="mt-2"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="BCA"
              />
            </div>
            <div>
              <Label>Nomor Rekening</Label>
              <Input
                className="mt-2"
                value={form.bankAccountNumber}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              />
            </div>
            <div>
              <Label>Atas Nama</Label>
              <Input
                className="mt-2"
                value={form.bankAccountHolder}
                onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 border-t border-border pt-4">
          <h4 className="text-sm font-semibold">Data Keluarga</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Agama</Label>
              <Select
                value={form.religion || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, religion: v === "none" ? "" : (v as Religion) })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Pilih agama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum diisi</SelectItem>
                  {RELIGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status Perkawinan</Label>
              <Select
                value={form.maritalStatus || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, maritalStatus: v === "none" ? "" : (v as MaritalStatus) })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum diisi</SelectItem>
                  {MARITAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.maritalStatus === "Menikah" ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nama Pasangan</Label>
                  <Input
                    className="mt-2"
                    value={form.spouseName}
                    onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>No. WhatsApp Pasangan</Label>
                  <Input
                    className="mt-2"
                    value={form.spouseWhatsapp}
                    onChange={(e) => setForm({ ...form, spouseWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Anak</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({ ...form, children: [...form.children, { name: "", whatsapp: "" }] })
                    }
                  >
                    <UserPlus className="size-3.5" /> Tambah Anak
                  </Button>
                </div>
                {form.children.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Belum ada data anak.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {form.children.map((child, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={child.name}
                          onChange={(e) => {
                            const next = [...form.children];
                            next[i] = { name: e.target.value, whatsapp: next[i]?.whatsapp ?? "" };
                            setForm({ ...form, children: next });
                          }}
                          placeholder="Nama anak"
                        />
                        <Input
                          value={child.whatsapp}
                          onChange={(e) => {
                            const next = [...form.children];
                            next[i] = { name: next[i]?.name ?? "", whatsapp: e.target.value };
                            setForm({ ...form, children: next });
                          }}
                          placeholder="No. WhatsApp"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm({ ...form, children: form.children.filter((_, j) => j !== i) })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : form.maritalStatus ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nama Ayah</Label>
                  <Input
                    className="mt-2"
                    value={form.fatherName}
                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>No. WhatsApp Ayah</Label>
                  <Input
                    className="mt-2"
                    value={form.fatherWhatsapp}
                    onChange={(e) => setForm({ ...form, fatherWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <Label>Nama Ibu</Label>
                  <Input
                    className="mt-2"
                    value={form.motherName}
                    onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>No. WhatsApp Ibu</Label>
                  <Input
                    className="mt-2"
                    value={form.motherWhatsapp}
                    onChange={(e) => setForm({ ...form, motherWhatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Saudara Kandung</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({ ...form, siblings: [...form.siblings, { name: "", whatsapp: "" }] })
                    }
                  >
                    <UserPlus className="size-3.5" /> Tambah Saudara
                  </Button>
                </div>
                {form.siblings.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Belum ada data saudara kandung.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {form.siblings.map((sib, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={sib.name}
                          onChange={(e) => {
                            const next = [...form.siblings];
                            next[i] = { name: e.target.value, whatsapp: next[i]?.whatsapp ?? "" };
                            setForm({ ...form, siblings: next });
                          }}
                          placeholder="Nama saudara"
                        />
                        <Input
                          value={sib.whatsapp}
                          onChange={(e) => {
                            const next = [...form.siblings];
                            next[i] = { name: next[i]?.name ?? "", whatsapp: e.target.value };
                            setForm({ ...form, siblings: next });
                          }}
                          placeholder="No. WhatsApp"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm({ ...form, siblings: form.siblings.filter((_, j) => j !== i) })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Nama &amp; nomor WhatsApp di atas juga dipakai sebagai kontak darurat.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Karyawan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeePhotosDialog({
  employee,
  account,
  onClose,
}: {
  employee: Employee;
  account: StaffAccount | undefined;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Foto — {employee.fullName}</DialogTitle>
          <DialogDescription>
            Foto FaceID dan KTP yang didaftarkan staff sendiri lewat HP-nya.
          </DialogDescription>
        </DialogHeader>
        {!account ? (
          <p className="text-sm text-muted-foreground">
            Karyawan ini belum punya akun staff — belum ada foto tersimpan.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <ScanFace className="size-4 text-primary" /> Foto FaceID
              </p>
              <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                {account.facePhoto ? (
                  <img
                    src={account.facePhoto}
                    alt="Foto FaceID"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Belum ada
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <IdCard className="size-4 text-primary" /> Foto KTP
              </p>
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
                {account.ktpPhoto ? (
                  <img
                    src={account.ktpPhoto}
                    alt="Foto KTP"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Belum ada
                  </div>
                )}
              </div>
              {account.ktpExtracted && (
                <div className="mt-3 space-y-1 text-xs">
                  {account.ktpNikMatch ? (
                    <p className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="size-3.5" /> NIK cocok data karyawan
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="size-3.5" /> NIK tidak cocok
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">NIK di KTP:</span>{" "}
                    <span className="font-mono">{account.ktpExtracted.nik || "-"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Nama di KTP:</span>{" "}
                    {account.ktpExtracted.fullName || "-"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MUTATION_FIELD_LABELS: Record<MutationField, string> = {
  department: "Departemen",
  position: "Jabatan",
  rank: "Pangkat",
  location: "Lokasi Kerja",
  shift: "Shift Kerja",
};

function EmployeeMutationsDialog({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [items, setItems] = useState<EmployeeMutation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployeeMutations(employee.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Riwayat Mutasi — {employee.fullName}</DialogTitle>
          <DialogDescription>
            Perubahan Jabatan, Pangkat, Departemen, dan Lokasi Kerja tercatat di sini.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada riwayat mutasi.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {items.map((m) => (
              <li key={m.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{MUTATION_FIELD_LABELS[m.fieldChanged]}</span>
                  <span className="text-xs text-muted-foreground">{m.effectiveDate}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {m.oldValue || "—"} <span className="mx-1">→</span> {m.newValue || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeTab({
  employees,
  accounts,
  onChange,
}: {
  employees: Employee[];
  accounts: StaffAccount[];
  onChange: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [viewingPhotosFor, setViewingPhotosFor] = useState<Employee | null>(null);
  const [viewingMutationsFor, setViewingMutationsFor] = useState<Employee | null>(null);

  const accountByEmployeeId = new Map(accounts.map((a) => [a.employeeId, a]));

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteEmployee(deleting.id);
      toast.success(`${deleting.fullName} dihapus dari database karyawan.`);
      setDeleting(null);
      onChange();
    } catch {
      toast.error("Gagal menghapus karyawan. Coba lagi.");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Database Karyawan</h3>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus className="size-4" /> Tambah Karyawan
        </Button>
      </div>

      <section className="glass-panel overflow-hidden">
        {employees.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">
            Belum ada karyawan. Tambahkan lewat tombol di atas.
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
                <TableHead>Level</TableHead>
                <TableHead>FaceID</TableHead>
                <TableHead />
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
                  <TableCell className="text-xs">{e.positionLevel}</TableCell>
                  <TableCell>
                    {e.faceDescriptor ? (
                      <Badge className="gap-1 bg-primary/15 text-primary" variant="secondary">
                        <ScanFace className="size-3" /> Terdaftar
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Lihat foto FaceID & KTP"
                        onClick={() => setViewingPhotosFor(e)}
                      >
                        <ImageIcon className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Riwayat Mutasi"
                        onClick={() => setViewingMutationsFor(e)}
                      >
                        <History className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Edit"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Hapus"
                        onClick={() => setDeleting(e)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        FaceID hanya bisa didaftarkan oleh staff sendiri, di HP mereka, saat login pertama (menu{" "}
        <strong>Akun Staff</strong> untuk membuatkan akunnya). Admin tidak bisa mendaftarkan wajah
        karyawan dari sini.
      </p>

      <EmployeeFormDialog
        open={formOpen}
        editing={editing}
        employees={employees}
        onClose={() => setFormOpen(false)}
        onSaved={onChange}
      />

      {viewingPhotosFor && (
        <EmployeePhotosDialog
          employee={viewingPhotosFor}
          account={accountByEmployeeId.get(viewingPhotosFor.id)}
          onClose={() => setViewingPhotosFor(null)}
        />
      )}

      {viewingMutationsFor && (
        <EmployeeMutationsDialog
          employee={viewingMutationsFor}
          onClose={() => setViewingMutationsFor(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Data karyawan ini akan dihapus permanen dari database.
              {deleting && accountByEmployeeId.has(deleting.id)
                ? " Karyawan ini punya akun staff — akun staffnya tidak ikut terhapus, tapi jadi tidak terhubung ke data karyawan manapun."
                : ""}{" "}
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy ? "Menghapus…" : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AttendanceTab({
  employees,
  attendance,
  onChange,
}: {
  employees: Employee[];
  attendance: AttendanceRecord[];
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

function FinalReportTab({ employees }: { employees: Employee[] }) {
  const [period, setPeriod] = useState<{ start: string; end: string; label: string } | null>(null);
  const [cutoffDay, setCutoffDay] = useState(1);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPeriodAndSummaries = (start: string, end: string, label: string) => {
    setLoading(true);
    computeAttendanceSummaryForAll(start, end)
      .then(setSummaries)
      .catch(() => toast.error("Gagal menghitung laporan."))
      .finally(() => setLoading(false));
    setPeriod({ start, end, label });
  };

  useEffect(() => {
    getCompanyProfile()
      .then((c) => {
        setCutoffDay(c.payrollCutoffDay);
        const prev = getPreviousPayrollPeriod(c.payrollCutoffDay);
        loadPeriodAndSummaries(prev.start, prev.end, prev.label);
      })
      .catch(() => toast.error("Gagal memuat pengaturan periode payroll."));
  }, []);

  const summaryByEmployeeId = new Map(summaries.map((s) => [s.employeeId, s]));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Laporan Akhir Kehadiran &amp; Lembur</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Periode potong tanggal {cutoffDay} (atur di menu Pengaturan). Data ini yang dipakai
          Finance untuk hitung tunjangan makan × hari hadir dan lembur × jam — tidak perlu dikirim
          manual, Finance mengambil dari angka yang sama.
        </p>
      </div>

      {period && (
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dari</Label>
              <Input
                type="date"
                className="mt-2"
                value={period.start}
                onChange={(e) => loadPeriodAndSummaries(e.target.value, period.end, "Kustom")}
              />
            </div>
            <div>
              <Label>Sampai</Label>
              <Input
                type="date"
                className="mt-2"
                value={period.end}
                onChange={(e) => loadPeriodAndSummaries(period.start, e.target.value, "Kustom")}
              />
            </div>
          </div>
          <Badge variant="secondary" className="mt-6">
            {period.label}
          </Badge>
        </div>
      )}

      <section className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-7 text-sm text-muted-foreground">Menghitung…</p>
        ) : employees.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada karyawan.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Hari Hadir</TableHead>
                <TableHead>Jam Lembur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => {
                const s = summaryByEmployeeId.get(e.id);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.fullName}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{s?.presentDays ?? 0} hari</TableCell>
                    <TableCell>{s?.totalOvertimeHours ?? 0} jam</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function StaffAccountsTab({
  employees,
  accounts,
  onChange,
}: {
  employees: Employee[];
  accounts: StaffAccount[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({ employeeId: "", whatsapp: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const assignedEmployeeIds = new Set(accounts.map((a) => a.employeeId));
  const availableEmployees = employees.filter((e) => !assignedEmployeeIds.has(e.id));

  const selectedEmployee = employees.find((e) => e.id === form.employeeId) ?? null;

  // WA & Email selalu ikut data karyawan yang didaftarkan di "Database Karyawan" —
  // supaya tidak ada dua sumber data yang bisa beda-beda (lihat handleEmployeeSelect).
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setForm({
      employeeId,
      whatsapp: employee?.phone ?? "",
      email: employee?.email ?? "",
    });
  };

  const handleCreate = async () => {
    const employee = employees.find((e) => e.id === form.employeeId);
    if (!employee) {
      toast.error("Pilih karyawan dulu.");
      return;
    }
    if (!form.whatsapp.trim()) {
      toast.error(
        "No. WhatsApp karyawan ini belum diisi di Database Karyawan. Lengkapi dulu di sana (dipakai untuk verifikasi OTP saat login pertama).",
      );
      return;
    }
    setSubmitting(true);
    try {
      const account = await createStaffAccount({
        employeeId: employee.id,
        fullName: employee.fullName,
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim() || employee.email,
      });
      toast.success(`Akun staff dibuat: ${account.userId} (PIN default: 123456)`);
      setForm({ employeeId: "", whatsapp: "", email: "" });
      onChange();
    } catch {
      toast.error("Gagal membuat akun staff. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyInvite = (account: StaffAccount) => {
    const text = `User ID: ${account.userId}\nPIN awal: 123456\nLogin di halaman Staff, lalu ikuti langkah verifikasi.`;
    navigator.clipboard?.writeText(text);
    toast.success("Info undangan disalin ke clipboard.");
  };

  const handleResetPin = async (account: StaffAccount) => {
    setResettingId(account.id);
    try {
      await resetStaffAccountToDefaultPin(account.id);
      toast.success(`PIN ${account.userId} direset ke default (123456).`);
      onChange();
    } catch {
      toast.error("Gagal mereset PIN. Coba lagi.");
    } finally {
      setResettingId(null);
    }
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
            <Select value={form.employeeId} onValueChange={handleEmployeeSelect}>
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
              disabled
              placeholder="Pilih karyawan dulu"
            />
          </div>
          <div>
            <Label>Email (untuk lupa PIN)</Label>
            <Input className="mt-2" value={form.email} disabled placeholder="Pilih karyawan dulu" />
          </div>
        </div>
        {selectedEmployee && !selectedEmployee.phone && (
          <p className="mt-2 text-xs text-destructive">
            Karyawan ini belum punya No. WhatsApp di Database Karyawan. Lengkapi dulu di tab
            "Database Karyawan" sebelum membuat akun staff-nya.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          No. WhatsApp &amp; Email otomatis diambil dari data karyawan supaya selalu sama dengan
          yang didaftarkan di "Database Karyawan". Untuk mengubahnya, edit dulu data karyawan di
          sana.
        </p>
        <Button onClick={handleCreate} className="mt-5" disabled={submitting}>
          <KeyRound className="size-4" /> {submitting ? "Membuat…" : "Buatkan Akun Staff"}
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
                      disabled={resettingId === a.id}
                      onClick={() => handleResetPin(a)}
                    >
                      {resettingId === a.id ? "Mereset…" : "Reset PIN"}
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

function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    setLoading(true);
    getAnnouncements()
      .then(setItems)
      .catch(() => toast.error("Gagal memuat pengumuman."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleAdd = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Judul dan isi pengumuman wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await addAnnouncement({ title: title.trim(), body: body.trim() });
      toast.success("Pengumuman dipublikasikan — langsung tampil di app staff.");
      setTitle("");
      setBody("");
      refresh();
    } catch {
      toast.error("Gagal membuat pengumuman. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      toast.success("Pengumuman dihapus.");
      refresh();
    } catch {
      toast.error("Gagal menghapus. Coba lagi.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Buat Pengumuman</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tampil di Beranda (1-2 terbaru) dan Kotak Masuk semua staff.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Judul</Label>
            <Input
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rapat guru — Senin 08:00"
            />
          </div>
          <div>
            <Label>Isi Pengumuman</Label>
            <Textarea
              className="mt-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-5" disabled={submitting}>
          <Megaphone className="size-4" /> {submitting ? "Mempublikasikan…" : "Publikasikan"}
        </Button>
      </section>

      <section className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-7 text-sm text-muted-foreground">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada pengumuman.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const LOCATION_TYPES: LocationType[] = ["Kantor", "Cabang", "Toko", "Gudang", "Pabrik", "Lainnya"];

function LocationsTab() {
  const [items, setItems] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkLocation | "new" | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "Cabang" as LocationType,
    address: "",
    phone: "",
    parentLocationId: "",
    lat: "",
    lng: "",
    radiusMeters: "30",
  });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const refresh = () => {
    setLoading(true);
    getLocations()
      .then(setItems)
      .catch(() => toast.error("Gagal memuat data lokasi."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const openNew = (parentLocationId?: string) => {
    setForm({
      name: "",
      type: parentLocationId ? "Toko" : "Cabang",
      address: "",
      phone: "",
      parentLocationId: parentLocationId ?? "",
      lat: "",
      lng: "",
      radiusMeters: "30",
    });
    setEditing("new");
  };

  const openEdit = (loc: WorkLocation) => {
    setForm({
      name: loc.name,
      type: loc.type,
      address: loc.address,
      phone: loc.phone,
      parentLocationId: loc.parentLocationId ?? "",
      lat: loc.lat !== null ? String(loc.lat) : "",
      lng: loc.lng !== null ? String(loc.lng) : "",
      radiusMeters: String(loc.radiusMeters),
    });
    setEditing(loc);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Perangkat ini tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Gagal mengambil lokasi.");
      },
    );
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama lokasi wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        address: form.address,
        phone: form.phone,
        ...(form.parentLocationId ? { parentLocationId: form.parentLocationId } : {}),
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        radiusMeters: Number(form.radiusMeters) || 30,
      };
      if (editing && editing !== "new") {
        await updateLocation(editing.id, payload);
        toast.success("Lokasi diperbarui.");
      } else {
        await addLocation(payload);
        toast.success("Lokasi ditambahkan.");
      }
      setEditing(null);
      refresh();
    } catch {
      toast.error("Gagal menyimpan lokasi. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id);
      toast.success("Lokasi dihapus.");
      refresh();
    } catch {
      toast.error(
        "Gagal menghapus. Pastikan tidak ada karyawan atau sub-lokasi yang masih terhubung ke lokasi ini.",
      );
    }
  };

  const topLevel = items.filter((l) => !l.parentLocationId);
  const childrenOf = (parentId: string) => items.filter((l) => l.parentLocationId === parentId);

  // Parent options exclude the location being edited itself (can't be its own parent).
  const parentOptions = items.filter(
    (l) => l !== editing && l.id !== (editing !== "new" ? editing?.id : ""),
  );

  const LocationCard = ({ loc, isChild }: { loc: WorkLocation; isChild?: boolean }) => (
    <div className={isChild ? "ml-6 border-l-2 border-border pl-4" : ""}>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{loc.name}</p>
            <Badge variant="secondary">{loc.type}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {loc.address || "Alamat belum diisi"}
            {loc.phone ? ` · ${loc.phone}` : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {loc.lat !== null
              ? `${loc.lat.toFixed(5)}, ${loc.lng?.toFixed(5)}`
              : "GPS belum diatur"}{" "}
            · radius {loc.radiusMeters}m
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openNew(loc.id)}
            title="Tambah Sub-Lokasi"
          >
            <UserPlus className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEdit(loc)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDelete(loc.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {childrenOf(loc.id).length > 0 && (
        <div className="mt-2 space-y-2">
          {childrenOf(loc.id).map((child) => (
            <LocationCard key={child.id} loc={child} isChild />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Cabang / Toko / Gudang / Pabrik</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiap lokasi punya titik GPS &amp; radius sendiri sebagai basis absensi karyawan yang
            di-assign ke situ. Cabang bisa punya Sub-Cabang/Toko/Gudang di dalamnya — pakai tombol{" "}
            <UserPlus className="inline size-3.5" /> di tiap lokasi. Kantor Pusat (menu Pengaturan)
            tetap jadi default kalau karyawan tidak di-assign ke lokasi manapun.
          </p>
        </div>
        <Button onClick={() => openNew()}>
          <MapPinned className="size-4" /> Tambah Lokasi
        </Button>
      </div>

      <section className="space-y-3">
        {loading ? (
          <p className="glass-panel p-7 text-sm text-muted-foreground">Memuat…</p>
        ) : topLevel.length === 0 ? (
          <p className="glass-panel p-7 text-sm text-muted-foreground">
            Belum ada lokasi tambahan.
          </p>
        ) : (
          topLevel.map((loc) => <LocationCard key={loc.id} loc={loc} />)
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Tambah Lokasi" : "Edit Lokasi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nama Lokasi</Label>
                <Input
                  className="mt-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Cabang Bandung"
                />
              </div>
              <div>
                <Label>Tipe</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as LocationType })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Lokasi Induk (opsional)</Label>
              <Select
                value={form.parentLocationId || "none"}
                onValueChange={(v) => setForm({ ...form, parentLocationId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Tidak ada — lokasi utama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada — lokasi utama</SelectItem>
                  {parentOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih Cabang induknya kalau ini Sub-Cabang/Toko/Gudang di dalam cabang tertentu.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Alamat</Label>
                <Input
                  className="mt-2"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Nomor Telepon</Label>
                <Input
                  className="mt-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="021xxxxxxx"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  className="mt-2"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  className="mt-2"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
              <div>
                <Label>Radius (meter)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-2"
                  value={form.radiusMeters}
                  onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleUseCurrentLocation} disabled={locating}>
              <MapPinned className="size-4" />{" "}
              {locating ? "Mengambil lokasi…" : "Ambil dari Lokasi Saya Sekarang"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function ShiftsTab({ employees, onChange }: { employees: Employee[]; onChange: () => void }) {
  const [items, setItems] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShiftType | "new" | null>(null);
  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    lateGraceMinutes: "15",
    earlyLeaveGraceMinutes: "60",
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk department reassignment
  const [bulkDept, setBulkDept] = useState("");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const refresh = () => {
    setLoading(true);
    getShiftTypes()
      .then(setItems)
      .catch(() => toast.error("Gagal memuat data shift."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const openNew = () => {
    setForm({
      name: "",
      startTime: "09:00",
      endTime: "17:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      lateGraceMinutes: "15",
      earlyLeaveGraceMinutes: "60",
    });
    setEditing("new");
  };

  const openEdit = (s: ShiftType) => {
    setForm({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      daysOfWeek: s.daysOfWeek,
      lateGraceMinutes: String(s.lateGraceMinutes),
      earlyLeaveGraceMinutes: String(s.earlyLeaveGraceMinutes),
    });
    setEditing(s);
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama shift wajib diisi.");
      return;
    }
    if (form.daysOfWeek.length === 0) {
      toast.error("Pilih minimal satu hari aktif.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        daysOfWeek: form.daysOfWeek,
        lateGraceMinutes: Number(form.lateGraceMinutes) || 15,
        earlyLeaveGraceMinutes: Number(form.earlyLeaveGraceMinutes) || 60,
      };
      if (editing && editing !== "new") {
        await updateShiftType(editing.id, payload);
        toast.success("Shift diperbarui.");
      } else {
        await addShiftType(payload);
        toast.success("Shift ditambahkan.");
      }
      setEditing(null);
      refresh();
    } catch {
      toast.error("Gagal menyimpan shift. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShiftType(id);
      toast.success("Shift dihapus.");
      refresh();
    } catch {
      toast.error("Gagal menghapus. Pastikan tidak ada karyawan yang masih pakai shift ini.");
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkDept || !bulkShiftId) {
      toast.error("Pilih departemen dan shift tujuan.");
      return;
    }
    setBulkBusy(true);
    try {
      const count = await bulkAssignShiftToDepartment(bulkDept, bulkShiftId);
      toast.success(`Jadwal ${count} karyawan di departemen ${bulkDept} diperbarui.`);
      onChange();
    } catch {
      toast.error("Gagal menerapkan perubahan massal. Coba lagi.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tipe Jam Kerja / Shift</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            3 shift awal (Reguler, Pagi, Malam) sudah dibuatkan otomatis — ubah atau tambah sesuai
            kebutuhan. Tiap shift punya jam &amp; hari aktif sendiri.
          </p>
        </div>
        <Button onClick={openNew}>
          <Clock3 className="size-4" /> Tambah Shift
        </Button>
      </div>

      <section className="glass-panel overflow-hidden">
        {loading ? (
          <p className="p-7 text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Hari Aktif</TableHead>
                <TableHead>Toleransi</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.startTime}–{s.endTime}
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Telat {s.lateGraceMinutes}m / Pulang {s.earlyLeaveGraceMinutes}m
                  </TableCell>
                  <TableCell className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Ubah Jadwal per Departemen</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Berguna untuk rotasi shift departemen tertentu (misal Security) — terapkan satu shift ke
          semua karyawan di departemen itu sekaligus.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Departemen</Label>
            <Select value={bulkDept} onValueChange={setBulkDept}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih departemen" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Shift Tujuan</Label>
            <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih shift" />
              </SelectTrigger>
              <SelectContent>
                {items.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleBulkAssign} disabled={bulkBusy} className="w-full">
              {bulkBusy ? "Menerapkan…" : "Terapkan"}
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Tambah Shift" : "Edit Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Shift</Label>
              <Input
                className="mt-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Shift Sore"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jam Mulai</Label>
                <Input
                  type="time"
                  className="mt-2"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Jam Selesai</Label>
                <Input
                  type="time"
                  className="mt-2"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Hari Aktif</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      form.daysOfWeek.includes(day)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Toleransi Telat (menit)</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={form.lateGraceMinutes}
                  onChange={(e) => setForm({ ...form, lateGraceMinutes: e.target.value })}
                />
              </div>
              <div>
                <Label>Toleransi Pulang (menit)</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={form.earlyLeaveGraceMinutes}
                  onChange={(e) => setForm({ ...form, earlyLeaveGraceMinutes: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [cutoffDay, setCutoffDay] = useState(1);
  const [jhtRatePercent, setJhtRatePercent] = useState(1);
  const [period, setPeriod] = useState<{ start: string; end: string; label: string } | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [bonus, setBonus] = useState("0");
  const [penalty, setPenalty] = useState("0");

  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0]!.id);
  }, [employees, selected]);

  useEffect(() => {
    getCompanyProfile()
      .then((c) => {
        setCutoffDay(c.payrollCutoffDay);
        setJhtRatePercent(c.jhtRatePercent);
        setPeriod(getPreviousPayrollPeriod(c.payrollCutoffDay));
      })
      .catch(() => toast.error("Gagal memuat pengaturan periode payroll."));
  }, []);

  const employee = employees.find((e) => e.id === selected);

  useEffect(() => {
    if (!employee || !period) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    computeAttendanceSummary(employee, period.start, period.end)
      .then(setSummary)
      .catch(() => {
        toast.error("Gagal menghitung kehadiran & lembur.");
        setSummary(null);
      })
      .finally(() => setLoadingSummary(false));
  }, [employee, period]);

  const preview =
    employee && period && summary
      ? computePayroll({
          employee,
          period: period.label,
          presentDays: summary.presentDays,
          overtimeHours: summary.totalOvertimeHours,
          jhtRatePercent,
          bonus: Number(bonus) || 0,
          penalty: Number(penalty) || 0,
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
        <p className="mt-1 text-sm text-muted-foreground">
          Tunjangan makan dan lembur dihitung otomatis dari kehadiran beneran (lihat tab Laporan
          Akhir) — bukan input manual. Periode potong tanggal {cutoffDay}, JHT {jhtRatePercent}%
          dari gaji pokok (keduanya diatur di menu Pengaturan).
        </p>
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
                <Label>Periode</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={period?.start ?? ""}
                    onChange={(e) =>
                      setPeriod({
                        start: e.target.value,
                        end: period?.end ?? e.target.value,
                        label: "Kustom",
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={period?.end ?? ""}
                    onChange={(e) =>
                      setPeriod({
                        start: period?.start ?? e.target.value,
                        end: e.target.value,
                        label: "Kustom",
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Hari Hadir</Label>
                <Input
                  className="mt-2"
                  disabled
                  value={loadingSummary ? "…" : `${summary?.presentDays ?? 0} hari`}
                />
              </div>
              <div>
                <Label>Jam Lembur</Label>
                <Input
                  className="mt-2"
                  disabled
                  value={loadingSummary ? "…" : `${summary?.totalOvertimeHours ?? 0} jam`}
                />
              </div>
              <div>
                <Label>Bonus (Rp) +</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Denda (Rp) −</Label>
                <Input
                  type="number"
                  className="mt-2"
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {preview && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-border p-4 text-sm">
                  <p className="mb-2 font-medium">Rincian Tunjangan — dari mana angkanya:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>Transport (tetap/bulan): {rupiah(preview.allowanceBreakdown.transport)}</li>
                    <li>Jabatan (tetap/bulan): {rupiah(preview.allowanceBreakdown.position)}</li>
                    <li>Kesehatan (tetap/bulan): {rupiah(preview.allowanceBreakdown.health)}</li>
                    <li>Asuransi (tetap/bulan): {rupiah(preview.allowanceBreakdown.insurance)}</li>
                    <li>
                      Makan: {rupiah(preview.allowanceBreakdown.mealRate)}/hari ×{" "}
                      {preview.allowanceBreakdown.mealDays} hari hadir ={" "}
                      {rupiah(preview.allowanceBreakdown.mealTotal)}
                    </li>
                    <li className="pt-1 font-medium text-foreground">
                      Total Tunjangan: {rupiah(preview.allowances)}
                    </li>
                  </ul>
                </div>

                <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:grid-cols-3">
                  <Stat
                    label="Gaji Bruto"
                    value={rupiah(
                      preview.basicSalary +
                        preview.allowances +
                        preview.overtimePay +
                        preview.bonus,
                    )}
                  />
                  <Stat label="PPh 21 TER" value={`- ${rupiah(preview.pph21Amount)}`} />
                  <Stat
                    label={`BPJS + JHT (${preview.jhtRatePercent}%)`}
                    value={`- ${rupiah(preview.bpjsHealthEmp + preview.bpjsTkEmp + preview.jhtDeduction)}`}
                  />
                  {preview.bonus > 0 && <Stat label="Bonus" value={`+ ${rupiah(preview.bonus)}`} />}
                  {preview.penalty > 0 && (
                    <Stat label="Denda" value={`- ${rupiah(preview.penalty)}`} />
                  )}
                  <Stat label="Gaji Bersih (Net)" value={rupiah(preview.netSalary)} highlight />
                </div>
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
                <TableHead>BPJS + JHT</TableHead>
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
                  <TableCell>{rupiah(p.bpjsHealthEmp + p.bpjsTkEmp + p.jhtDeduction)}</TableCell>
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
