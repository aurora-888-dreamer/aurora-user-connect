import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, ShieldAlert, Building2 } from "lucide-react";
import { getActiveSession, isDeveloperAdmin, type UserProfile } from "@/lib/admin-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dev-console")({
  head: () => ({
    meta: [{ title: "Dev Console — Aurora" }],
  }),
  component: DevConsolePage,
});

type CompanyRow = {
  id: string;
  name: string;
  subscription_status: string;
  created_at: string;
};

const ECOSYSTEM_LINKS = [
  { name: "Database Master (Aurora Master)", url: "https://auroramaster.my.id" },
  { name: "Noble Smart Voice", url: "https://noble-smart-voice.lovable.app" },
  { name: "Magic Talk", url: "https://magic-talk.lovable.app" },
] as const;

function DevConsolePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getActiveSession();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    if (!isDeveloperAdmin(s)) {
      toast.error("Halaman ini khusus Admin Developer Aurora.");
      navigate({ to: "/dashboard" });
      return;
    }
    setSession(s);
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("hpm_companies")
      .select("id, name, subscription_status, created_at")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error) setCompanies((data as CompanyRow[]) ?? []);
        setLoading(false);
      });
  }, [session]);

  if (!session) return null;

  const toggleSubscription = async (company: CompanyRow) => {
    const next = company.subscription_status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const { error } = await supabase
      .from("hpm_companies")
      .update({ subscription_status: next })
      .eq("id", company.id);
    if (error) {
      toast.error("Gagal mengubah status.");
      return;
    }
    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, subscription_status: next } : c)),
    );
    toast.success(`Status ${company.name} diubah ke ${next}.`);
  };

  return (
    <AppShell
      title="Dev Console"
      description="Panel internal Aurora — bukan bagian dari HRIS klien. Akses tersembunyi (klik gear 3x), khusus akun Admin Developer."
    >
      <div className="glass-panel flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="size-4 text-primary" />
        Halaman ini terlihat karena akun kamu ditandai <code>is_developer = true</code> di database.
        Provisioning perusahaan baru + Super Admin pertamanya masih manual lewat SQL — belum ada
        form di sini.
      </div>

      <section className="glass-panel p-7">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Building2 className="size-4 text-primary" /> Perusahaan Terdaftar
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
        ) : companies.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada perusahaan.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {companies.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.name || "(belum diberi nama)"}</p>
                  <p className="text-xs text-muted-foreground">
                    Terdaftar {new Date(c.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.subscription_status === "ACTIVE" ? "default" : "secondary"}>
                    {c.subscription_status}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleSubscription(c)}>
                    {c.subscription_status === "ACTIVE" ? "Suspend" : "Aktifkan"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Ekosistem Aurora</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Koneksi ke Database Master &amp; produk Aurora lain — link cepat untuk sekarang, integrasi
          data disiapkan menyusul.
        </p>
        <ul className="mt-4 space-y-2">
          {ECOSYSTEM_LINKS.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:border-primary/40"
              >
                {l.name}
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
