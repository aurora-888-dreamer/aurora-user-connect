import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  ScanFace,
  IdCard,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  getStaffSession,
  updateStaffAccount,
  type StaffAccount,
  type KtpExtracted,
} from "@/lib/staff-auth";
import { FaceCaptureDialog } from "@/components/FaceCaptureDialog";
import { getEmployeeById } from "@/lib/hris-data";
import { readKtpPhoto, niksMatch } from "@/lib/ktp-ocr";

export const Route = createFileRoute("/staff/profile")({
  head: () => ({
    meta: [{ title: "Profil Saya — Human Power Management" }],
  }),
  component: StaffProfilePage,
});

function StaffProfilePage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFaceDialog, setShowFaceDialog] = useState(false);

  const [ktpFileUrl, setKtpFileUrl] = useState<string | null>(null);
  const [ktpBusy, setKtpBusy] = useState(false);
  const [ktpPreview, setKtpPreview] = useState<{
    dataUrl: string;
    extracted: KtpExtracted | null;
    match: boolean;
  } | null>(null);
  const ktpInputRef = useRef<HTMLInputElement>(null);

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
    setEmail(session.email);
    setKtpFileUrl(session.ktpPhoto ?? null);
  }, [navigate]);

  if (!account) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStaffAccount(account.id, { email: email.trim() });
      toast.success("Profil disimpan.");
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleKtpFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setKtpBusy(true);
      setKtpPreview(null);
      try {
        // Preview only — nothing is saved to the account/HRIS yet.
        const { extracted } = await readKtpPhoto(dataUrl);
        if (!extracted) {
          toast.error(
            "Foto tidak terbaca sebagai KTP. Coba foto ulang, pastikan cahaya cukup & teks jelas.",
          );
          setKtpPreview({ dataUrl, extracted: null, match: false });
          return;
        }
        const employee = account.employeeId ? await getEmployeeById(account.employeeId) : null;
        const match = niksMatch(extracted.nik, employee?.nik);
        setKtpPreview({ dataUrl, extracted, match });
        if (!match) {
          toast.error(
            "NIK di foto KTP tidak cocok dengan data karyawan. Silakan ambil ulang foto yang benar.",
          );
        }
      } catch {
        toast.error("Gagal membaca KTP lewat AI. Coba lagi sebentar.");
        setKtpPreview({ dataUrl, extracted: null, match: false });
      } finally {
        setKtpBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmKtp = async () => {
    if (!ktpPreview || !ktpPreview.match) return;
    setKtpBusy(true);
    try {
      await updateStaffAccount(account.id, {
        ktpPhoto: ktpPreview.dataUrl,
        ktpExtracted: ktpPreview.extracted ?? undefined,
        ktpNikMatch: ktpPreview.match,
      });
      setKtpFileUrl(ktpPreview.dataUrl);
      setAccount({
        ...account,
        ktpPhoto: ktpPreview.dataUrl,
        ktpExtracted: ktpPreview.extracted ?? undefined,
        ktpNikMatch: ktpPreview.match,
      });
      setKtpPreview(null);
      toast.success("Foto KTP disimpan & dikirim ke HRIS.");
    } catch {
      toast.error("Gagal menyimpan foto KTP. Coba lagi.");
    } finally {
      setKtpBusy(false);
    }
  };

  const handleRetakeKtp = () => {
    setKtpPreview(null);
    ktpInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background p-5">
      <Link
        to="/staff/dashboard"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Kembali
      </Link>

      <div className="glass-panel mx-auto max-w-md space-y-5 p-6">
        <h1 className="text-lg font-bold">Edit Profil</h1>

        <div>
          <Label className="flex items-center gap-1.5">
            Nama Lengkap <Lock className="size-3 text-muted-foreground" />
          </Label>
          <Input className="mt-2" value={account.fullName} disabled />
        </div>
        <div>
          <Label className="flex items-center gap-1.5">
            No. WhatsApp <Lock className="size-3 text-muted-foreground" />
          </Label>
          <Input className="mt-2" value={account.whatsapp} disabled />
        </div>
        <p className="text-xs text-muted-foreground">
          Nama dan No. WhatsApp terkunci untuk keamanan. Hubungi HR kalau perlu diubah.
        </p>

        <div>
          <Label>Email</Label>
          <Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>User ID</Label>
          <Input className="mt-2 font-mono" value={account.userId} disabled />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>

      {/* ---------- FaceID: viewable + replaceable ---------- */}
      <div className="glass-panel mx-auto mt-5 max-w-md space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ScanFace className="size-5 text-primary" /> FaceID
        </h2>
        <p className="text-xs text-muted-foreground">
          Ini foto referensi yang dipakai sistem untuk mencocokkan wajah setiap Clock In/Out. Kalau
          absensi sering ditolak/salah, coba ganti dengan foto yang lebih jelas.
        </p>

        <div className="mx-auto aspect-square w-40 overflow-hidden rounded-2xl border border-border bg-muted">
          {account.facePhoto ? (
            <img
              src={account.facePhoto}
              alt="Foto FaceID terdaftar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Belum ada foto
            </div>
          )}
        </div>

        <Button className="w-full" variant="outline" onClick={() => setShowFaceDialog(true)}>
          {account.facePhoto ? "Ganti FaceID" : "Daftarkan FaceID"}
        </Button>

        {showFaceDialog && (
          <FaceCaptureDialog
            open
            mode="enroll"
            employeeName={account.fullName}
            onClose={() => setShowFaceDialog(false)}
            onEnrolled={async ({ descriptor, photoDataUrl }) => {
              await updateStaffAccount(account.id, {
                faceDescriptor: descriptor,
                facePhoto: photoDataUrl,
                faceEnrolled: true,
              });
              setAccount({
                ...account,
                faceDescriptor: descriptor,
                facePhoto: photoDataUrl,
                faceEnrolled: true,
              });
              setShowFaceDialog(false);
              toast.success("FaceID diperbarui.");
            }}
          />
        )}
      </div>

      {/* ---------- KTP: capture/upload + AI read + preview-before-save ---------- */}
      <div className="glass-panel mx-auto mt-5 max-w-md space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <IdCard className="size-5 text-primary" /> Foto KTP
        </h2>
        <p className="text-xs text-muted-foreground">
          Foto/screenshot KTP dibaca otomatis oleh AI. Hasilnya di-preview dulu di sini — baru
          tersimpan &amp; terkirim ke HRIS kalau kamu konfirmasi.
        </p>

        {!ktpPreview ? (
          <>
            <div className="mx-auto aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-muted">
              {ktpFileUrl ? (
                <img src={ktpFileUrl} alt="Foto KTP" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Belum ada foto KTP
                </div>
              )}
            </div>

            <Button
              className="w-full"
              variant="outline"
              disabled={ktpBusy}
              onClick={() => ktpInputRef.current?.click()}
            >
              {ktpBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {ktpFileUrl ? "Ganti Foto KTP" : "Ambil / Unggah Foto KTP"}
            </Button>

            {account.ktpExtracted && (
              <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                {account.ktpNikMatch ? (
                  <p className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="size-4" /> NIK cocok dengan data karyawan
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="size-4" /> NIK TIDAK cocok — hubungi HR untuk perbaiki
                    data NIK
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
                <p>
                  <span className="text-muted-foreground">Alamat:</span>{" "}
                  {account.ktpExtracted.address || "-"}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={ktpPreview.dataUrl}
                alt="Preview foto KTP"
                className="h-full w-full object-cover"
              />
            </div>

            {ktpBusy && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Membaca KTP dengan AI…
              </p>
            )}

            {!ktpBusy && ktpPreview.extracted && (
              <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                <p className="font-medium">Preview hasil baca AI — periksa dulu sebelum simpan:</p>
                <p>
                  <span className="text-muted-foreground">NIK:</span>{" "}
                  <span className="font-mono">{ktpPreview.extracted.nik || "-"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Nama:</span>{" "}
                  {ktpPreview.extracted.fullName || "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Alamat:</span>{" "}
                  {ktpPreview.extracted.address || "-"}
                </p>
                {ktpPreview.match ? (
                  <p className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="size-4" /> NIK cocok dengan data karyawan — aman
                    disimpan
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="size-4" /> NIK tidak cocok data karyawan. Jangan
                    disimpan — ambil ulang foto yang benar, atau hubungi HR kalau data NIK di HRIS
                    yang salah.
                  </p>
                )}
              </div>
            )}

            {!ktpBusy && !ktpPreview.extracted && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="size-4" /> Foto tidak terbaca sebagai KTP. Ambil ulang
                dengan pencahayaan yang lebih baik.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRetakeKtp}
                disabled={ktpBusy}
              >
                <RotateCcw className="size-4" /> Ambil Ulang
              </Button>
              {ktpPreview.match && (
                <Button className="flex-1" onClick={handleConfirmKtp} disabled={ktpBusy}>
                  {ktpBusy ? "Menyimpan…" : "Konfirmasi & Simpan"}
                </Button>
              )}
            </div>
          </div>
        )}

        <input
          ref={ktpInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleKtpFileChosen}
        />
      </div>
    </div>
  );
}
