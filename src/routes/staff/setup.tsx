import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, KeyRound, ScanFace, ShieldCheck } from "lucide-react";
import { FaceCaptureDialog } from "@/components/FaceCaptureDialog";
import {
  getStaffSession,
  updateStaffAccount,
  requestStaffOtp,
  verifyStaffOtp,
  attachNikAndDevice,
  type StaffAccount,
} from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/setup")({
  head: () => ({
    meta: [{ title: "Setup Akun — Human Power Management" }],
  }),
  component: StaffSetupPage,
});

type Step = 1 | 2 | 3 | 4 | 5;

function StaffSetupPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<StaffAccount | null>(null);
  const [step, setStep] = useState<Step>(1);

  // Step 1 — OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Step 2 — PIN baru
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Step 3 — NIK
  const [nik, setNik] = useState("");

  // Step 4 — FaceID
  const [showFaceDialog, setShowFaceDialog] = useState(false);
  const [faceDone, setFaceDone] = useState(false);

  useEffect(() => {
    const session = getStaffSession();
    if (!session) {
      navigate({ to: "/staff" });
      return;
    }
    if (session.profileCompleted) {
      navigate({ to: "/staff/dashboard" });
      return;
    }
    setAccount(session);
    if (session.waVerified) setStep(2);
  }, [navigate]);

  if (!account) return null;

  const handleSendOtp = async () => {
    try {
      const code = await requestStaffOtp(account.id);
      setOtpSent(true);
      setDevOtp(code); // DEMO: shown directly since SMSGate isn't wired up yet
      toast.info(`[DEMO] Kode OTP: ${code} (SMSGate belum terhubung, kode ditampilkan langsung)`);
    } catch {
      toast.error("Gagal mengirim OTP. Periksa koneksi internet.");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!(await verifyStaffOtp(account.id, otpInput.trim()))) {
        toast.error("Kode OTP salah atau kedaluwarsa.");
        return;
      }
      await updateStaffAccount(account.id, { waVerified: true });
      toast.success("Nomor WhatsApp terverifikasi.");
      setStep(2);
    } catch {
      toast.error("Gagal memverifikasi OTP. Coba lagi.");
    }
  };

  const handleSetPin = async () => {
    if (newPin.length !== 6) {
      toast.error("PIN harus 6 digit.");
      return;
    }
    if (newPin === "123456") {
      toast.error("Tidak boleh memakai PIN default — buat PIN baru.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Konfirmasi PIN tidak cocok.");
      return;
    }
    await updateStaffAccount(account.id, { pin: newPin } as Parameters<
      typeof updateStaffAccount
    >[1]);
    toast.success("PIN berhasil diubah.");
    setStep(3);
  };

  const handleSaveNik = async () => {
    if (!/^\d{16}$/.test(nik)) {
      toast.error("NIK harus 16 digit angka.");
      return;
    }
    await attachNikAndDevice(account.id, nik);
    toast.success("NIK tersimpan & device ini terverifikasi.");
    setStep(4);
  };

  const handleFinish = async () => {
    await updateStaffAccount(account.id, { profileCompleted: true, faceEnrolled: true });
    toast.success("Setup selesai — selamat datang!");
    navigate({ to: "/staff/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-sm p-7">
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Langkah {step} dari 5</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={`h-1.5 w-5 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <MessageCircle className="size-7 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">Verifikasi WhatsApp</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kode OTP akan dikirim ke {account.whatsapp}. Ini hanya dilakukan sekali.
              </p>
            </div>
            {!otpSent ? (
              <Button className="w-full" onClick={handleSendOtp}>
                Kirim Kode OTP
              </Button>
            ) : (
              <>
                {devOtp && (
                  <p className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-center text-xs text-muted-foreground">
                    Mode demo — kode: <span className="font-mono text-primary">{devOtp}</span>
                  </p>
                )}
                <div>
                  <Label>Kode OTP</Label>
                  <Input
                    className="mt-2 text-center tracking-[0.5em]"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleVerifyOtp}>
                  Verifikasi
                </Button>
                <button
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary"
                  onClick={handleSendOtp}
                >
                  Kirim ulang kode
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <KeyRound className="size-7 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">Buat PIN Baru</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Wajib ganti dari PIN default sebelum lanjut.
              </p>
            </div>
            <div>
              <Label>PIN Baru (6 digit)</Label>
              <Input
                className="mt-2"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
            </div>
            <div>
              <Label>Konfirmasi PIN</Label>
              <Input
                className="mt-2"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleSetPin}>
              Simpan PIN
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <ShieldCheck className="size-7 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">NIK &amp; Verifikasi Device</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                NIK dienkripsi dan hanya bisa dibuka di device ini.
              </p>
            </div>
            <div>
              <Label>NIK (16 digit)</Label>
              <Input
                className="mt-2"
                inputMode="numeric"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleSaveNik}>
              Simpan &amp; Verifikasi Device
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <ScanFace className="size-7 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">Daftarkan Wajah</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Wajah ini dipakai untuk verifikasi setiap kali Clock In/Out.
              </p>
            </div>
            {faceDone ? (
              <p className="flex items-center justify-center gap-2 text-sm text-primary">
                <CheckCircle2 className="size-4" /> Wajah berhasil didaftarkan
              </p>
            ) : (
              <Button className="w-full" onClick={() => setShowFaceDialog(true)}>
                Buka Kamera
              </Button>
            )}
            <Button
              className="w-full"
              variant="secondary"
              disabled={!faceDone}
              onClick={() => setStep(5)}
            >
              Lanjutkan
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
                  setFaceDone(true);
                  setShowFaceDialog(false);
                  toast.success("Wajah berhasil didaftarkan.");
                }}
              />
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="size-7 text-primary" />
              <h2 className="mt-2 text-lg font-semibold">Konfirmasi Profil</h2>
            </div>
            <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Nama:</span> {account.fullName}
              </p>
              <p>
                <span className="text-muted-foreground">WhatsApp:</span> {account.whatsapp}
              </p>
              <p>
                <span className="text-muted-foreground">User ID:</span> {account.userId}
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Nama &amp; No. WhatsApp terkunci setelah ini. Hubungi HR kalau perlu diubah.
            </p>
            <Button className="w-full" onClick={handleFinish}>
              Selesai &amp; Masuk Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
