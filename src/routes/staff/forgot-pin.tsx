import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPinResetCode, confirmPinReset } from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/forgot-pin")({
  head: () => ({
    meta: [{ title: "Lupa PIN — Human Power Management" }],
  }),
  component: ForgotPinPage,
});

function ForgotPinPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [staffAccountId, setStaffAccountId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");

  const handleRequest = () => {
    const result = requestPinResetCode(email.trim());
    if (!result) {
      toast.error("Email tidak ditemukan.");
      return;
    }
    setStaffAccountId(result.staffAccountId);
    setDevCode(result.code); // DEMO: shown directly since email sending isn't wired up yet
    toast.info(`[DEMO] Kode reset dikirim ke email (kode: ${result.code})`);
    setStep(2);
  };

  const handleReset = () => {
    if (!staffAccountId) return;
    if (newPin.length !== 6) {
      toast.error("PIN baru harus 6 digit.");
      return;
    }
    if (!confirmPinReset(staffAccountId, code.trim(), newPin)) {
      toast.error("Kode reset salah atau kedaluwarsa.");
      return;
    }
    toast.success("PIN berhasil direset. Silakan login.");
    navigate({ to: "/staff" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-sm p-7">
        <Link to="/staff" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowLeft className="size-3.5" /> Kembali ke Login
        </Link>

        <div className="flex flex-col items-center text-center">
          <Mail className="size-7 text-primary" />
          <h1 className="mt-2 text-lg font-semibold">Lupa PIN</h1>
        </div>

        {step === 1 ? (
          <div className="mt-5 space-y-4">
            <div>
              <Label>Email terdaftar</Label>
              <Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleRequest}>
              Kirim Kode Reset
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {devCode && (
              <p className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-center text-xs text-muted-foreground">
                Mode demo — kode: <span className="font-mono text-primary">{devCode}</span>
              </p>
            )}
            <div>
              <Label>Kode Reset</Label>
              <Input
                className="mt-2 text-center tracking-[0.5em]"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
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
            <Button className="w-full" onClick={handleReset}>
              Reset PIN
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

