// src/routes/dashboard.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  getActiveSession,
  setActiveSession,
  updateAdminProfile,
  changeAdminPin,
  createAdminUser,
  UserProfile,
  UserRole,
} from "@/lib/admin-auth";
import { getEmployees, type Employee } from "@/lib/hris-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Form State Edit Profile
  const [fullName, setFullName] = useState("");
  const [phoneWA, setPhoneWA] = useState("");

  // Form State Change PIN
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  // Form State Add Admin — grants admin access to an ALREADY-REGISTERED employee, doesn't create a new person.
  const [newUserId, setNewUserId] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [newAdminEmployeeId, setNewAdminEmployeeId] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<UserRole>("OPERATOR");
  const [newAdminDepartment, setNewAdminDepartment] = useState("");

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    setCurrentUser(session);
    setFullName(session.fullName);
    setPhoneWA(session.phoneWA);
    getEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [navigate]);

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
      alert("Profil berhasil diperbarui!");
    } catch {
      alert("Gagal menyimpan profil. Periksa koneksi internet.");
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      alert("PIN Baru harus 6 digit!");
      return;
    }
    try {
      const ok = await changeAdminPin(currentUser.userId, oldPin, newPin);
      if (!ok) {
        alert("PIN Lama tidak sesuai!");
        return;
      }
      setOldPin("");
      setNewPin("");
      alert("PIN berhasil diubah!");
    } catch {
      alert("Gagal mengubah PIN. Periksa koneksi internet.");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmployeeId) {
      alert(
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
      alert(`Pengguna baru ${newUserId.toUpperCase()} berhasil ditambahkan!`);
      setNewUserId("");
      setNewAdminPin("");
      setNewAdminEmployeeId("");
      setNewAdminDepartment("");
    } catch {
      alert("Gagal menambahkan pengguna. User ID mungkin sudah digunakan.");
    }
  };

  return (
    <AppShell
      title={`Selamat datang, ${currentUser.fullName}`}
      description={`${currentUser.userId} · ${currentUser.role} — kelola profil, PIN, atau buka modul HRIS/ATS dari menu di samping.`}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-sm">Nama Lengkap</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">No WhatsApp / HP</label>
                <Input value={phoneWA} onChange={(e) => setPhoneWA(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                Simpan Profil
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Form Change PIN */}
        <Card>
          <CardHeader>
            <CardTitle>Ubah PIN (6 Digit)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="text-sm">PIN Lama</label>
                <Input
                  type="password"
                  maxLength={6}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">PIN Baru</label>
                <Input
                  type="password"
                  maxLength={6}
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

      {/* Form Add Admin (Hanya untuk Role SUPER_ADMIN / ADMIN) */}
      {(currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Pengguna / Admin Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm">Karyawan (dari HRIS)</label>
                <Select value={newAdminEmployeeId} onValueChange={setNewAdminEmployeeId}>
                  <SelectTrigger>
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
                <label className="text-sm">User ID Baru</label>
                <Input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  required
                  className="uppercase"
                />
              </div>
              <div>
                <label className="text-sm">PIN Awal (6 Digit)</label>
                <Input
                  type="password"
                  maxLength={6}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm">Pilih Role</label>
                {willBeTopAdmin ? (
                  <p className="rounded-md border border-primary/40 bg-primary/10 p-2 text-sm text-primary">
                    Otomatis jadi <strong>TOP ADMIN</strong> — level jabatan Direktur, akses penuh
                    ke semua modul kecuali Dev Console.
                  </p>
                ) : (
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
                    className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  >
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OPERATOR">OPERATOR</option>
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm">Departemen Akses (opsional)</label>
                <Input
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
    </AppShell>
  );
}
