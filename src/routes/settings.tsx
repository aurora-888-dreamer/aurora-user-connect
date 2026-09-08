import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { LocateFixed, Save, MapPin, Clock } from "lucide-react";
import {
  getActiveSession,
  setActiveSession,
  updateAdminProfile,
  changeAdminPin,
  createAdminUser,
  type UserProfile,
  type UserRole,
} from "@/lib/admin-auth";
import { getEmployees, type Employee } from "@/lib/hris-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCompanyProfile,
  saveCompanyProfile,
  isOfficeLocationSet,
  DEFAULT_OFFICE_RADIUS_METERS,
  type CompanyProfile,
} from "@/lib/company-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Human Power Management" },
      {
        name: "description",
        content: "Profil perusahaan dan titik lokasi kantor untuk validasi radius absensi GPS.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyProfile | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!getActiveSession()) {
      navigate({ to: "/" });
      return;
    }
    getCompanyProfile()
      .then((profile) => {
        setForm(profile);
        setReady(true);
      })
      .catch(() => toast.error("Gagal memuat pengaturan perusahaan."));
  }, [navigate]);

  if (!ready || !form) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Perangkat ini tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) =>
          f ? { ...f, officeLat: pos.coords.latitude, officeLng: pos.coords.longitude } : f,
        );
        setLocating(false);
        toast.success("Titik lokasi kantor diambil dari posisi Anda saat ini.");
      },
      () => {
        setLocating(false);
        toast.error("Gagal mengambil lokasi. Izinkan akses GPS di browser.");
      },
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama perusahaan wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyProfile(form);
      toast.success("Profil perusahaan disimpan.");
    } catch {
      toast.error("Gagal menyimpan. Periksa koneksi internet dan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Pengaturan"
      description="Profil perusahaan dan titik lokasi kantor. Titik ini jadi acuan radius absensi GPS."
    >
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Profil Perusahaan</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nama Perusahaan</Label>
            <Input
              className="mt-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="PT Aurora Master Digital Kreatif"
            />
          </div>
          <div>
            <Label>Nomor Telepon</Label>
            <Input
              className="mt-2"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Alamat</Label>
            <Input
              className="mt-2"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Nomor WhatsApp</Label>
            <Input
              className="mt-2"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
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
            <Label>Website</Label>
            <Input
              className="mt-2"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://auroramaster.my.id"
            />
          </div>
        </div>
      </section>

      <section className="glass-panel p-7">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <MapPin className="size-4 text-primary" />
          Titik Lokasi Kantor
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Karyawan yang absen di luar radius yang diatur dari titik ini akan diminta konfirmasi dan
          mengisi keterangan lokasi &amp; status tugas.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Latitude</Label>
            <Input
              type="number"
              step="any"
              className="mt-2"
              value={form.officeLat ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  officeLat: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              type="number"
              step="any"
              className="mt-2"
              value={form.officeLng ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  officeLng: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label>Radius Toleransi (meter)</Label>
            <Input
              type="number"
              min={0}
              className="mt-2"
              value={form.officeRadiusMeters}
              onChange={(e) =>
                setForm({
                  ...form,
                  officeRadiusMeters: Number(e.target.value) || DEFAULT_OFFICE_RADIUS_METERS,
                })
              }
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-border p-4">
          <div>
            <Label>Izinkan Absensi di Luar Area</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktif: staff boleh clock-in/out di luar radius asal isi catatan lokasi &amp; status
              tugas (seperti sekarang). Nonaktif: absensi di luar area diblokir — staff harus
              mengajukan permohonan ke HRD dulu.
            </p>
          </div>
          <Switch
            checked={form.allowOutsideAttendance}
            onCheckedChange={(v) => setForm({ ...form, allowOutsideAttendance: v })}
          />
        </div>

        <Button
          variant="outline"
          className="mt-4"
          onClick={handleUseCurrentLocation}
          disabled={locating}
        >
          <LocateFixed className="size-4" />{" "}
          {locating ? "Mengambil lokasi…" : "Ambil dari Lokasi Saya Sekarang"}
        </Button>

        {isOfficeLocationSet(form) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Titik tersimpan: {form.officeLat}, {form.officeLng}
          </p>
        )}
      </section>

      <section className="glass-panel p-7">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Clock className="size-4 text-primary" />
          Jam Kerja
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Dipakai untuk deteksi telat masuk (&gt;15 menit) dan pulang lewat jadwal (&gt;60 menit, di
          luar tugas keluar) — staff akan diminta memberi alasan.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Jam Masuk</Label>
            <Input
              type="time"
              className="mt-2"
              value={form.workStartTime}
              onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
            />
          </div>
          <div>
            <Label>Jam Pulang</Label>
            <Input
              type="time"
              className="mt-2"
              value={form.workEndTime}
              onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="glass-panel p-7">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Clock className="size-4 text-primary" />
          Periode Payroll &amp; Pensiun
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tanggal potong gaji dipakai HRIS (Laporan Akhir) dan Finance supaya periode yang dihitung
          sama persis.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Tanggal Potong Gaji</Label>
            <Input
              type="number"
              min={1}
              max={28}
              className="mt-2"
              value={form.payrollCutoffDay}
              onChange={(e) => setForm({ ...form, payrollCutoffDay: Number(e.target.value) || 1 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Contoh: 20 berarti periode berjalan tgl 20 ke tgl 20 bulan berikutnya. Isi 1 untuk
              bulan kalender biasa.
            </p>
          </div>
          <div>
            <Label>Tarif JHT (% dari gaji pokok)</Label>
            <Input
              type="number"
              step="any"
              className="mt-2"
              value={form.jhtRatePercent}
              onChange={(e) => setForm({ ...form, jhtRatePercent: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Berlaku sama untuk semua karyawan, dipotong otomatis dari gaji bersih saat payroll
              dibuat.
            </p>
          </div>
          <div>
            <Label>Pengali Masa Kerja (n)</Label>
            <Input
              type="number"
              step="any"
              className="mt-2"
              value={form.pensionYearsMultiplier}
              onChange={(e) =>
                setForm({ ...form, pensionYearsMultiplier: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Konstanta</Label>
            <Input
              type="number"
              step="any"
              className="mt-2"
              value={form.pensionConstant}
              onChange={(e) => setForm({ ...form, pensionConstant: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Formula pensiun saat usia 55 tahun: (pengali × masa kerja tahun + konstanta) × gaji pokok.
          Default {form.pensionYearsMultiplier}n+{form.pensionConstant} mengikuti standar
          pemerintah.
        </p>
      </section>

      <Button onClick={handleSave} size="lg" disabled={saving}>
        <Save className="size-4" /> {saving ? "Menyimpan…" : "Simpan Pengaturan"}
      </Button>

      <AccountAndAdminSection />
    </AppShell>
  );
}

function AccountAndAdminSection() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [fullName, setFullName] = useState("");
  const [phoneWA, setPhoneWA] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  const [newUserId, setNewUserId] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [newAdminEmployeeId, setNewAdminEmployeeId] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<UserRole>("OPERATOR");
  const [newAdminDepartment, setNewAdminDepartment] = useState("");

  useEffect(() => {
    const session = getActiveSession();
    if (!session) return;
    setCurrentUser(session);
    setFullName(session.fullName);
    setPhoneWA(session.phoneWA);
    getEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  if (!currentUser) return null;

  const selectedEmployee = employees.find((e) => e.id === newAdminEmployeeId);
  const willBeTopAdmin = selectedEmployee?.positionLevel === "Direktur";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminProfile(currentUser.userId, { fullName, phoneWA });
      const updatedSession = { ...currentUser, fullName, phoneWA };
      setActiveSession(updatedSession);
      setCurrentUser(updatedSession);
      toast.success("Profil berhasil diperbarui!");
    } catch {
      toast.error("Gagal menyimpan profil. Periksa koneksi internet.");
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      toast.error("PIN Baru harus 6 digit!");
      return;
    }
    try {
      const ok = await changeAdminPin(currentUser.userId, oldPin, newPin);
      if (!ok) {
        toast.error("PIN Lama tidak sesuai!");
        return;
      }
      setOldPin("");
      setNewPin("");
      toast.success("PIN berhasil diubah!");
    } catch {
      toast.error("Gagal mengubah PIN. Periksa koneksi internet.");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmployeeId) {
      toast.error(
        "Pilih karyawan dari HRIS dulu — admin cuma bisa diberikan ke orang yang sudah terdaftar.",
      );
      return;
    }
    try {
      await createAdminUser({
        userId: newUserId,
        pin: newAdminPin,
        employeeId: newAdminEmployeeId,
        role: newAdminRole,
        ...(newAdminDepartment ? { department: newAdminDepartment } : {}),
      });
      toast.success(`Pengguna baru ${newUserId.toUpperCase()} berhasil ditambahkan!`);
      setNewUserId("");
      setNewAdminPin("");
      setNewAdminEmployeeId("");
      setNewAdminDepartment("");
    } catch {
      toast.error("Gagal menambahkan pengguna. User ID mungkin sudah digunakan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Akun Saya — Edit Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label>Nama Lengkap</Label>
                <Input
                  className="mt-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label>No WhatsApp / HP</Label>
                <Input
                  className="mt-2"
                  value={phoneWA}
                  onChange={(e) => setPhoneWA(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Simpan Profil
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ubah PIN (6 Digit)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <Label>PIN Lama</Label>
                <Input
                  type="password"
                  maxLength={6}
                  className="mt-2"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                />
              </div>
              <div>
                <Label>PIN Baru</Label>
                <Input
                  type="password"
                  maxLength={6}
                  className="mt-2"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Perbarui PIN
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Pengguna / Admin Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Karyawan (dari HRIS)</Label>
                <Select value={newAdminEmployeeId} onValueChange={setNewAdminEmployeeId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih karyawan yang sudah terdaftar" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Belum ada karyawan — daftarkan dulu di Core HRIS.
                      </div>
                    ) : (
                      employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName} — {e.position || e.department || "belum ada jabatan"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Akses admin cuma bisa diberikan ke orang yang sudah lengkap datanya di HRIS —
                  nama, departemen, dan jabatan otomatis ikut data karyawannya, tidak diketik ulang.
                </p>
                {selectedEmployee && (
                  <p className="mt-2 text-xs">
                    {selectedEmployee.department || "—"} · {selectedEmployee.position || "—"} ·
                    Level: {selectedEmployee.positionLevel}
                  </p>
                )}
              </div>
              <div>
                <Label>User ID Baru</Label>
                <Input
                  className="mt-2 uppercase"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>PIN Awal (6 Digit)</Label>
                <Input
                  type="password"
                  maxLength={6}
                  className="mt-2"
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Pilih Role</Label>
                {willBeTopAdmin ? (
                  <p className="mt-2 rounded-md border border-primary/40 bg-primary/10 p-2 text-sm text-primary">
                    Otomatis jadi <strong>TOP ADMIN</strong> — level jabatan Direktur, akses penuh
                    ke semua modul kecuali Dev Console.
                  </p>
                ) : (
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
                    className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm"
                  >
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OPERATOR">OPERATOR</option>
                  </select>
                )}
              </div>
              <div>
                <Label>Departemen Akses (opsional)</Label>
                <Input
                  className="mt-2"
                  value={newAdminDepartment}
                  onChange={(e) => setNewAdminDepartment(e.target.value)}
                  placeholder='Isi "Finance" untuk akses modul Finance'
                  disabled={willBeTopAdmin}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">
                  Tambah Pengguna
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
