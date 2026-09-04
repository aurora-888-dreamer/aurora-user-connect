import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/ats")({
  head: () => ({
    meta: [
      { title: "ATS Recruitment — Human Power Management" },
      {
        name: "description",
        content:
          "Advanced ATS module: job board, AI CV parsing, adaptive online tests and AI interview summary with 1-click handover to Core HRIS.",
      },
      { property: "og:title", content: "ATS Recruitment — Human Power Management" },
      {
        property: "og:description",
        content: "Talent sourcing, testing and interview evaluation with handover bridge to HRIS.",
      },
    ],
  }),
  component: AtsPage,
});

const stages = ["APPLIED", "SCREENING", "TESTING", "INTERVIEW", "OFFERED", "HIRED"];

function AtsPage() {
  return (
    <AppShell
      title="ATS Rekrutmen Eksternal"
      description="Pencarian bakat, tes seleksi, wawancara dan evaluasi kandidat. Status HIRED memicu Handover API ke Core HRIS."
    >
      <section className="glass-panel p-7">
        <h3 className="text-base font-semibold">Pipeline kandidat</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {stages.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { t: "Job Board & Multi-channel Posting", d: "Public career site dan dashboard internal." },
          { t: "AI CV Parsing & Matching Score", d: "Skor kecocokan 0–100% otomatis." },
          { t: "Adaptive Test & Psikotes", d: "DISC, logic, kraepelin, technical." },
          { t: "AI Interview Summary", d: "Transkripsi, STAR score dan red flags." },
        ].map((f) => (
          <section key={f.t} className="glass-panel p-6">
            <h3 className="text-base font-semibold">{f.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
          </section>
        ))}
      </div>
      <section className="glass-panel min-h-56 p-7">
        <h3 className="text-lg font-semibold">Free activity space</h3>
        <p className="mt-1 text-sm text-muted-foreground">Area kerja terbuka untuk modul ATS.</p>
      </section>
    </AppShell>
  );
}
