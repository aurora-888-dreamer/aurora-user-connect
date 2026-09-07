import { Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Database,
  LogOut,
  Settings,
  Landmark,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  getActiveSession,
  setActiveSession,
  isFinanceDept,
  isDeveloperAdmin,
} from "@/lib/admin-auth";

const GENERAL_TOOLS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hris", label: "Core HRIS", icon: Users },
  { to: "/ats", label: "ATS Recruitment", icon: Briefcase },
  { to: "/directory", label: "User ID Directory", icon: Database },
  { to: "/settings", label: "Pengaturan", icon: Settings },
] as const;

// Departemen Finance TIDAK BISA masuk Core HRIS / ATS Recruitment — hanya
// Dashboard, modul Finance, dan Pengaturan.
const FINANCE_TOOLS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/finance", label: "Finance", icon: Landmark },
  { to: "/settings", label: "Pengaturan", icon: Settings },
] as const;

// Akun Admin Developer Aurora — semua menu terbuka, termasuk Finance,
// terlepas dari aturan departemen.
const DEVELOPER_TOOLS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hris", label: "Core HRIS", icon: Users },
  { to: "/ats", label: "ATS Recruitment", icon: Briefcase },
  { to: "/directory", label: "User ID Directory", icon: Database },
  { to: "/finance", label: "Finance", icon: Landmark },
  { to: "/settings", label: "Pengaturan", icon: Settings },
] as const;

const GEAR_CLICK_WINDOW_MS = 600;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const session = getActiveSession();
  const developer = !!session && isDeveloperAdmin(session);
  const tools = developer
    ? DEVELOPER_TOOLS
    : session && isFinanceDept(session)
      ? FINANCE_TOOLS
      : GENERAL_TOOLS;

  const gearClicks = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  const handleLogout = () => {
    setActiveSession(null);
    navigate({ to: "/" });
  };

  // Klik ikon gear (Pengaturan) 3x cepat -> buka Dev Console tersembunyi,
  // khusus untuk akun Admin Developer. Klik biasa tetap ke /settings seperti biasa.
  const handleGearClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const state = gearClicks.current;
    state.count = now - state.lastAt <= GEAR_CLICK_WINDOW_MS ? state.count + 1 : 1;
    state.lastAt = now;
    if (state.count >= 3) {
      e.preventDefault();
      state.count = 0;
      navigate({ to: "/dev-console" });
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 backdrop-blur-xl md:flex">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Aurora Master
          </p>
          <h1 className="text-aurora mt-2 text-2xl font-bold leading-tight">
            HUMAN POWER MANAGEMENT
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Pemisahan Modul Core HRIS &amp; Advanced ATS (Recruitment) dengan Integrasi Handover
          </p>
        </div>

        <nav className="mt-9 flex flex-1 flex-col gap-1">
          {tools.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={to === "/settings" ? handleGearClick : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground font-semibold ring-1 ring-sidebar-ring/40",
              }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        {session && (
          <div className="rounded-xl border border-sidebar-border p-3 text-xs">
            <p className="font-semibold text-sidebar-foreground">{session.fullName}</p>
            <p className="mt-0.5 font-mono text-muted-foreground">
              {session.userId} · {session.role}
            </p>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-2 py-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
            >
              <LogOut className="size-3.5" />
              Keluar
            </button>
          </div>
        )}
        <p className="mt-4 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          Designed by Aurora Master
        </p>
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
          <header className="md:hidden">
            <h1 className="text-aurora text-2xl font-bold">HUMAN POWER MANAGEMENT</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Pemisahan Modul Core HRIS &amp; Advanced ATS (Recruitment) dengan Integrasi Handover
            </p>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {tools.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={to === "/settings" ? handleGearClick : undefined}
                  className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  activeProps={{ className: "border-primary/60 text-primary" }}
                >
                  {label}
                </Link>
              ))}
              {session && (
                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  Keluar
                </button>
              )}
            </nav>
          </header>

          <div className="mt-6 md:mt-0">
            <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="mt-8 space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
