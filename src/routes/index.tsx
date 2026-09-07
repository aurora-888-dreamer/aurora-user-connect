// src/routes/index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getActiveSession, findAdminByCredentials, setActiveSession } from "@/lib/aurora-id";
import {
  findStaffAccountByCredentials,
  getStaffSession,
  setStaffSession,
} from "@/lib/staff-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login — Aurora Human Power Management" },
      {
        name: "description",
        content: "Login admin dan staf Aurora Human Power Management menggunakan User ID dan PIN.",
      },
      { property: "og:title", content: "Login — Aurora Human Power Management" },
      {
        property: "og:description",
        content: "Login admin dan staf Aurora Human Power Management menggunakan User ID dan PIN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in on this device/session — skip the login form and go
  // straight to the Dashboard instead of showing it again.
  useEffect(() => {
    if (getActiveSession()) {
      navigate({ to: "/dashboard" });
    } else {
      const staffSession = getStaffSession();
      if (staffSession) {
        navigate({ to: staffSession.profileCompleted ? "/staff/dashboard" : "/staff/setup" });
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await findAdminByCredentials(userId, pin);
      if (user) {
        setActiveSession(user);
        navigate({ to: "/dashboard" });
      } else {
        const staff = await findStaffAccountByCredentials(userId.trim(), pin.trim());
        if (staff) {
          setStaffSession(staff);
          navigate({ to: staff.profileCompleted ? "/staff/dashboard" : "/staff/setup" });
        } else {
          setError("User ID atau PIN 6 digit salah!");
        }
      }
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Aurora User Connect</CardTitle>
          <p className="text-sm text-slate-400">Masukan User ID & PIN 6-Digit Anda</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded bg-red-500/10 p-2 text-center text-sm text-red-400">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">User ID</label>
              <Input
                placeholder="Contoh: ABCDE62xxx"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                className="border-slate-700 bg-slate-900 uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">PIN (6 Digit)</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
                className="border-slate-700 bg-slate-900 tracking-[0.4em]"
                placeholder="••••••"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={submitting}>
              {submitting ? "Memeriksa…" : "Masuk"}
            </Button>
            <div className="text-center">
              <a href="/forgot-pin" className="text-xs text-blue-400 hover:underline">
                Lupa PIN? Reset via WhatsApp
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
