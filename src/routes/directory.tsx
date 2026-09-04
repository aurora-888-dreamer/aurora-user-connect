import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AURORA_CENTRE, loadRegistry, type RegistryEntry } from "@/lib/device-identity";

export const Route = createFileRoute("/directory")({
  head: () => ({
    meta: [
      { title: "User ID Directory — Human Power Management" },
      {
        name: "description",
        content:
          "Directory of Aurora user_id registered on this device and synced to the Aurora Master Database Centre.",
      },
      { property: "og:title", content: "User ID Directory — Human Power Management" },
      {
        property: "og:description",
        content: "Every generated user_id and its WA/HP origin, synced with Aurora Centre.",
      },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  useEffect(() => setRows(loadRegistry()), []);

  return (
    <AppShell
      title="User ID Directory"
      description={`Registered identities on this device, mirrored to ${AURORA_CENTRE.replace("https://", "")}.`}
    >
      <section className="glass-panel overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-7 text-sm text-muted-foreground">No user_id registered yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4">user_id</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">WA / HP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-border/60 last:border-0">
                  <td className="px-6 py-4 font-mono text-primary">{r.userId}</td>
                  <td className="px-6 py-4">{r.fullName}</td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">
                    +{r.dial}
                    {r.phone.replace(/^0/, "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
