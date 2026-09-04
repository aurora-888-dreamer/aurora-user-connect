import { Link } from "@tanstack/react-router";
import {
  Fingerprint,
  Users,
  Briefcase,
  Database,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import type { ReactNode } from "react";

const tools = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hris", label: "Core HRIS", icon: Users },
  { to: "/ats", label: "ATS Recruitment", icon: Briefcase },
  { to: "/directory", label: "User ID Directory", icon: Database },
  { to: "/", label: "Identity Vault", icon: Fingerprint },
] as const;

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
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
              activeOptions={{ exact: to === "/" }}
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

        <div className="rounded-xl border border-sidebar-border p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <ShieldCheck className="size-4" />
            <span className="font-semibold">Aurora Centre</span>
          </div>
          <p className="mt-1.5 leading-relaxed">magic-noble-nexus.lovable.app</p>
        </div>
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
                  activeOptions={{ exact: to === "/" }}
                  className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  activeProps={{ className: "border-primary/60 text-primary" }}
                >
                  {label}
                </Link>
              ))}
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
