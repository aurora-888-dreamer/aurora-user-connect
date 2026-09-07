import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { getActiveSession, isTopAdmin, isDeveloperAdmin } from "@/lib/admin-auth";
import {
  MODULE_MENUS,
  PERMISSION_ROLES,
  getMenuPermissions,
  setMenuPermission,
  isMenuAllowed,
  type PermissionModule,
  type PermissionMap,
} from "@/lib/menu-permissions-data";

export const Route = createFileRoute("/menu-access")({
  head: () => ({
    meta: [{ title: "Akses Menu — Human Power Management" }],
  }),
  component: MenuAccessPage,
});

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: "hris", label: "Core HRIS" },
  { key: "finance", label: "Finance" },
  { key: "ats", label: "ATS Recruitment" },
];

function MenuAccessPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [maps, setMaps] = useState<Record<PermissionModule, PermissionMap>>({
    hris: {},
    finance: {},
    ats: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getActiveSession();
    if (!session) {
      navigate({ to: "/" });
      return;
    }
    if (!isTopAdmin(session) && !isDeveloperAdmin(session)) {
      toast.error("Halaman ini khusus Top Admin.");
      navigate({ to: "/dashboard" });
      return;
    }
    setReady(true);
  }, [navigate]);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      getMenuPermissions("hris"),
      getMenuPermissions("finance"),
      getMenuPermissions("ats"),
    ])
      .then(([hris, finance, ats]) => setMaps({ hris, finance, ats }))
      .catch(() => toast.error("Gagal memuat pengaturan akses."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (ready) refresh();
  }, [ready]);

  if (!ready) return null;

  const handleToggle = async (
    module: PermissionModule,
    role: (typeof PERMISSION_ROLES)[number],
    menuKey: string,
    next: boolean,
  ) => {
    // Optimistic update so the switch feels instant.
    setMaps((prev) => ({
      ...prev,
      [module]: { ...prev[module], [`${role}:${menuKey}`]: next },
    }));
    try {
      await setMenuPermission(module, role, menuKey, next);
    } catch {
      toast.error("Gagal menyimpan. Coba lagi.");
      refresh();
    }
  };

  return (
    <AppShell
      title="Akses Menu"
      description="Khusus Top Admin — tentukan menu mana yang boleh diakses tiap role di Core HRIS, Finance, dan ATS. Tidak berlaku untuk app Staff Mobile (itu akses pribadi masing-masing staff, bukan role admin)."
    >
      <div className="glass-panel flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Top Admin &amp; akun Developer selalu bisa akses semua menu, terlepas dari pengaturan di
        sini — matriks ini cuma membatasi SUPER_ADMIN, ADMIN, dan OPERATOR.
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        MODULES.map(({ key: moduleKey, label }) => (
          <section key={moduleKey} className="glass-panel overflow-hidden">
            <div className="border-b border-border p-5">
              <h3 className="text-base font-semibold">{label}</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Menu</th>
                  {PERMISSION_ROLES.map((role) => (
                    <th key={role} className="px-5 py-3 text-center">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_MENUS[moduleKey].map((menu) => (
                  <tr key={menu.key} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">{menu.label}</td>
                    {PERMISSION_ROLES.map((role) => (
                      <td key={role} className="px-5 py-3 text-center">
                        <Switch
                          checked={isMenuAllowed(maps[moduleKey], role, menu.key)}
                          onCheckedChange={(v) => handleToggle(moduleKey, role, menu.key, v)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </AppShell>
  );
}
