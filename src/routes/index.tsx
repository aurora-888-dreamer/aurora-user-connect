import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Fingerprint, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import {
  COUNTRIES,
  baseUserId,
  digitsOnly,
  isCollision,
  maskNik,
  memorableAlternatives,
} from "@/lib/aurora-id";
import {
  deviceFingerprint,
  encryptNik,
  decryptNik,
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
  const [profile, setProfile] = useState<AuroraProfile | null>(null);
  const [verifiedNik, setVerifiedNik] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("ID");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      decryptNik(p.nikEncrypted, p.nikIv)
        .then((v) => {
          setVerifiedNik(v);
          toast.success(`Auto verification login as ${p.userId}`);
        })
        .catch(() => toast.error("Device vault could not be decrypted on this device."));
    }
  }, []);

  const dial = COUNTRIES.find((c) => c.code === country)?.dial ?? "62";
  const registry = useMemo(() => (typeof window === "undefined" ? [] : loadRegistry()), [profile]);

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

  async function handleRegister() {
    const nikDigits = digitsOnly(nik);
    if (fullName.trim().length < 3) return toast.error("Enter your full name.");
    if (digitsOnly(phone).length < 7) return toast.error("Enter a valid WA/HP number.");
    if (nikDigits.length !== 16) return toast.error("NIK must be 16 digits (one fill only).");
    if (collision && !chosen) return toast.error("Choose one of the 3 suggested user_id.");

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
    setProfile(next);
    setVerifiedNik(nikDigits);
    setBusy(false);
    toast[sync.ok ? "success" : "warning"](sync.message);
  }

  if (profile) {
    return (
      <AppShell
        title="Identity Vault"
        description="This device is bound to your Aurora identity. NIK is encrypted locally and used for auto verification login."
      >
        <section className="glass-panel p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Your user_id</p>
              <p className="text-aurora mt-2 font-display text-3xl font-bold">{profile.userId}</p>
            </div>
            <Badge className="gap-1.5 bg-primary/15 text-primary" variant="secondary">
              <CheckCircle2 className="size-3.5" />
              {profile.syncedToAurora ? "Synced to Aurora Centre" : "Queued for Aurora Centre"}
            </Badge>
          </div>

          <dl className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.fullName} />
            <Field label="WA / HP" value={`+${profile.dial}${profile.phone.replace(/^0/, "")}`} />
            <Field label="Device identity" value={profile.deviceId} />
            <Field
              label="NIK (encrypted vault)"
              value={verifiedNik ? maskNik(verifiedNik) : "locked"}
            />
          </dl>

          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" />
            AES-GCM encrypted in local storage. NIK is filled once and can never be edited here.
          </p>
        </section>

        <section className="glass-panel p-7">
          <h3 className="text-lg font-semibold">Free activity space</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your workspace is ready. Open Core HRIS or ATS Recruitment from the sidebar tools.
          </p>
        </section>
      </AppShell>
    );
  }

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
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Generated user_id</p>
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

        <Button onClick={handleRegister} disabled={busy} size="lg" className="mt-7 w-full sm:w-auto">
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 font-mono text-sm">{value}</dd>
    </div>
  );
}
