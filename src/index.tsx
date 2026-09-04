import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Fingerprint, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import {
  COUNTRIES,
  baseUserId,
  digitsOnly,
  isCollision,
  memorableAlternatives,
} from "@/lib/aurora-id";
import {
  deviceFingerprint,
  encryptNik,
  loadProfile,
  loadRegistry,
  saveProfile,
  syncToAuroraCentre,
  type AuroraProfile,
} from "@/lib/device-identity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Identity Vault — Human Power Management" },
      {
        name: "description",
        content:
          "Register a unique Aurora user_id from name, country code and WhatsApp number, with encrypted NIK device verification.",
      },
      { property: "og:title", content: "Identity Vault — Human Power Management" },
      {
        property: "og:description",
        content:
          "Unique user_id generation and encrypted NIK device identity for HRIS & ATS access.",
      },
    ],
  }),
  component: IdentityVault,
});

function IdentityVault() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("ID");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-verification login: if this device already has an Aurora identity
  // vault, skip straight to the Dashboard instead of re-showing the form.
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      toast.success(`Auto verification login as ${p.userId}`);
      navigate({ to: "/dashboard" });
      return;
    }
    setCheckingSession(false);
  }, [navigate]);

  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "62";
  const registry = useMemo(() => (typeof window === "undefined" ? [] : loadRegistry()), []);

  const preview = fullName && phone ? baseUserId(fullName, dial, phone) : "";
  const collision = fullName && phone ? isCollision(registry, fullName, dial, phone) : false;

  useEffect(() => {
    if (collision) {
      setOptions(
        memorableAlternatives(
          fullName,
          dial,
          phone,
          registry.map((r) => r.userId),
        ),
      );
      setChosen(null);
    } else {
      setOptions([]);
      setChosen(null);
    }
  }, [collision, fullName, dial, phone, registry]);

  async function handleRegister(): Promise<void> {
    const nikDigits = digitsOnly(nik);
    if (fullName.trim().length < 3) {
      toast.error("Enter your full name.");
      return;
    }
    if (digitsOnly(phone).length < 7) {
      toast.error("Enter a valid WA/HP number.");
      return;
    }
    if (nikDigits.length !== 16) {
      toast.error("NIK must be 16 digits (one fill only).");
      return;
    }
    if (collision && !chosen) {
      toast.error("Choose one of the 3 suggested user_id.");
      return;
    }

    setBusy(true);
    const userId = collision ? chosen! : preview;
    const { nikEncrypted, nikIv } = await encryptNik(nikDigits);
    const deviceId = deviceFingerprint();
    const sync = await syncToAuroraCentre({
      userId,
      fullName,
      dial,
      countryCode: country,
      phone: digitsOnly(phone),
      deviceId,
    });
    const next: AuroraProfile = {
      userId,
      fullName,
      dial,
      countryCode: country,
      phone: digitsOnly(phone),
      nikEncrypted,
      nikIv,
      deviceId,
      registeredAt: new Date().toISOString(),
      syncedToAurora: sync.ok,
    };
    saveProfile(next);
    setBusy(false);
    toast[sync.ok ? "success" : "warning"](sync.message);
    // Flow to Dashboard: registration is complete, hand off to the hub page.
    navigate({ to: "/dashboard" });
  }

  // Avoid flashing the registration form while we check for an existing
  // on-device identity vault (which redirects straight to /dashboard).
  if (checkingSession) return null;

  return (
    <AppShell
      title="Register Aurora Identity"
      description="user_id = 5 first letters of your name + country code + last 3 digits of your WA/HP number."
    >
      <section className="glass-panel p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ahmad Fauzi"
              className="mt-2"
            />
          </div>
          <div>
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="wa">WA / HP number</Label>
            <Input
              id="wa"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="nik">NIK (16 digits — one fill only)</Label>
            <Input
              id="nik"
              inputMode="numeric"
              value={nik}
              onChange={(e) => setNik(digitsOnly(e.target.value).slice(0, 16))}
              placeholder="3171012345670001"
              className="mt-2 font-mono tracking-widest"
            />
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="size-3.5" />
              Encrypted on this device only, used as your auto verification login.
            </p>
          </div>
        </div>

        {preview && !collision && (
          <div className="mt-7 rounded-xl border border-primary/30 bg-primary/10 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Generated user_id
            </p>
            <p className="text-aurora mt-2 font-display text-2xl font-bold">{preview}</p>
          </div>
        )}

        {collision && (
          <div className="mt-7 rounded-xl border border-accent/40 bg-accent/10 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-accent" />
              Similar name &amp; last 3 digits found — pick one easy-to-remember user_id
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setChosen(o)}
                  className={`rounded-xl border px-3 py-3 text-center font-mono text-sm transition-colors ${
                    chosen === o
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={busy}
          size="lg"
          className="mt-7 w-full sm:w-auto"
        >
          {busy ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <Fingerprint className="size-4" />
          )}
          Register to Aurora Master Database Centre
        </Button>
      </section>
    </AppShell>
  );
}
