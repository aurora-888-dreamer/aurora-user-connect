import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { getActiveSession, getStoredUsers, type UserProfile } from "@/lib/aurora-id";

export const Route = createFileRoute("/directory")({
  head: () => ({
    meta: [
      { title: "User ID Directory — Human Power Management" },
      {
        name: "description",
        content: "Directory of every Aurora user_id account registered on this workspace.",
      },
      { property: "og:title", content: "User ID Directory — Human Power Management" },
      { property: "og:description", content: "Every registered user_id, role and WA/HP contact." },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!getActiveSession()) {
      navigate({ to: "/" });
      return;
    }
    setReady(true);
    setRows(getStoredUsers());
  }, [navigate]);

  if (!ready) return null;

  return (
    <AppShell
      title="User ID Directory"
      description="Semua akun User ID yang terdaftar di workspace ini, beserta role dan kontak WhatsApp/HP."
    >
      <section className="glass-panel overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">Belum ada user_id terdaftar.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4">user_id</th>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">WA / HP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-border/60 last:border-0">
                  <td className="px-6 py-4 font-mono text-primary">{r.userId}</td>
                  <td className="px-6 py-4">{r.fullName}</td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary">{r.role}</Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">{r.phoneWA || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
