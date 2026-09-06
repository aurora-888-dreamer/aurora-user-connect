import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LocateFixed, Save, MapPin } from "lucide-react";
import { getActiveSession } from "@/lib/aurora-id";
import {
  getCompanyProfile,
  saveCompanyProfile,
  isOfficeLocationSet,
  OFFICE_RADIUS_METERS,
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
  const [form, setForm] = useState<CompanyProfile>(getCompanyProfile());
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!getActiveSession()) {
      navigate({ to: "/" });
      return;
    }
    setReady(true);
    setForm(getCompanyProfile());
  }, [navigate]);

  if (!ready) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Perangkat ini tidak mendukung GPS.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, officeLat: pos.coords.latitude, officeLng: pos.coords.longitude }));
        setLocating(false);
        toast.success("Titik lokasi kantor diambil dari posisi Anda saat ini.");
      },
      () => {
        setLocating(false);
        toast.error("Gagal mengambil lokasi. Izinkan akses GPS di browser.");
      },
    );
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Nama perusahaan wajib diisi.");
      return;
    }
    saveCompanyProfile(form);
    toast.success("Profil perusahaan disimpan.");
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
          Karyawan yang absen di luar radius {OFFICE_RADIUS_METERS} meter dari titik ini akan
          diminta konfirmasi dan mengisi keterangan lokasi &amp; status tugas.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

      <Button onClick={handleSave} size="lg">
        <Save className="size-4" /> Simpan Pengaturan
      </Button>
    </AppShell>
  );
}

