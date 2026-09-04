// src/routes/dashboard.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import {
  getActiveSession,
  setActiveSession,
  getStoredUsers,
  saveUsers,
  UserProfile,
  UserRole,
} from "@/lib/aurora-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Form State Edit Profile
  const [fullName, setFullName] = useState("");
  const [phoneWA, setPhoneWA] = useState("");

  // Form State Change PIN
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  // Form State Add Admin
  const [newUserId, setNewUserId] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<UserRole>("OPERATOR");

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    setCurrentUser(session);
    setFullName(session.fullName);
    setPhoneWA(session.phoneWA);
  }, [navigate]);

  if (!currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getStoredUsers();
    const updatedUsers = users.map((u) =>
      u.userId === currentUser.userId ? { ...u, fullName, phoneWA } : u,
    );
    saveUsers(updatedUsers);
    const updatedSession = { ...currentUser, fullName, phoneWA };
    setActiveSession(updatedSession);
    setCurrentUser(updatedSession);
    alert("Profil berhasil diperbarui!");
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPin !== currentUser.pin) {
      alert("PIN Lama tidak sesuai!");
      return;
    }
    if (newPin.length !== 6) {
      alert("PIN Baru harus 6 digit!");
      return;
    }
    const users = getStoredUsers();
    const updatedUsers = users.map((u) =>
      u.userId === currentUser.userId ? { ...u, pin: newPin } : u,
    );
    saveUsers(updatedUsers);
    const updatedSession = { ...currentUser, pin: newPin };
    setActiveSession(updatedSession);
    setCurrentUser(updatedSession);
    setOldPin("");
    setNewPin("");
    alert("PIN berhasil diubah!");
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getStoredUsers();
    if (users.some((u) => u.userId.toUpperCase() === newUserId.toUpperCase())) {
      alert("User ID sudah digunakan!");
      return;
    }
    const newUser: UserProfile = {
      userId: newUserId.toUpperCase(),
      pin: newAdminPin,
      fullName: newAdminName,
      phoneWA: "",
      role: newAdminRole,
    };
    saveUsers([...users, newUser]);
    alert(`Pengguna baru ${newUserId} berhasil ditambahkan!`);
    setNewUserId("");
    setNewAdminPin("");
    setNewAdminName("");
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
                <label className="text-sm">Nama Lengkap</label>
                <Input
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm">Pilih Role (3 Pilihan)</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                >
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OPERATOR">OPERATOR</option>
                </select>
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
