import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Fingerprint } from "lucide-react";
import { findStaffAccountByCredentials, getStaffSession, setStaffSession } from "@/lib/staff-auth";

export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Login Staff — Human Power Management" },
      { name: "description", content: "Login staff dengan User ID dan PIN untuk absensi harian." },
    ],
  }),
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = getStaffSession();
    if (session) {
      navigate({ to: session.profileCompleted ? "/staff/dashboard" : "/staff/setup" });
      return;
    }
    setChecking(false);
  }, [navigate]);

  if (checking) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const account = await findStaffAccountByCredentials(userId.trim(), pin.trim());
      if (!account) {
        toast.error("User ID atau PIN salah.");
        return;
      }
      setStaffSession(account);
      navigate({ to: account.profileCompleted ? "/staff/dashboard" : "/staff/setup" });
    } catch {
      toast.error("Gagal menghubungi server. Periksa koneksi internet dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-sm p-7">
        <div className="flex flex-col items-center text-center">
          <Fingerprint className="size-8 text-primary" />
          <h1 className="text-aurora mt-3 text-xl font-bold">HPM Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Absensi harian — masuk dengan User ID
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <Label>User ID</Label>
            <Input
              className="mt-2 uppercase"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="SANTY62296"
              autoCapitalize="characters"
            />
          </div>
          <div>
            <Label>PIN (6 digit)</Label>
            <Input
              className="mt-2"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Memeriksa…" : "Masuk"}
          </Button>
        </form>

        <Link
          to="/staff/forgot-pin"
          className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary"
        >
          Lupa PIN?
        </Link>
      </div>
    </div>
  );
}
