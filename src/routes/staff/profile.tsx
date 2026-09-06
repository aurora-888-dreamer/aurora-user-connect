import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { getStaffSession, updateStaffAccount, type StaffAccount } from "@/lib/staff-auth";

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
  }, [navigate]);

  if (!account) return null;

  const handleSave = () => {
    updateStaffAccount(account.id, { email: email.trim() });
    toast.success("Profil disimpan.");
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

        <Button className="w-full" onClick={handleSave}>
          Simpan
        </Button>
      </div>
    </div>
  );
}
