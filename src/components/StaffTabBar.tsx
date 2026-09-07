import { Link, useRouterState } from "@tanstack/react-router";
import { Home, History, PlusCircle, Inbox, User } from "lucide-react";

const TABS = [
  { to: "/staff/dashboard", label: "Beranda", icon: Home },
  { to: "/staff/history", label: "Riwayat", icon: History },
  { to: "/staff/request", label: "Ajukan", icon: PlusCircle },
  { to: "/staff/inbox", label: "Kotak Masuk", icon: Inbox },
  { to: "/staff/profile", label: "Akun", icon: User },
] as const;

export function StaffTabBar({ inboxBadge }: { inboxBadge?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className="size-5" />
                {to === "/staff/inbox" && !!inboxBadge && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[0.55rem] text-destructive-foreground">
                    {inboxBadge > 9 ? "9+" : inboxBadge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
