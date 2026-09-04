import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/hris")({
  head: () => ({
    meta: [
      { title: "Core HRIS Internal — Human Power Management" },
      {
        name: "description",
        content:
          "Core HRIS module: employee database, GPS attendance, payroll PPh 21 TER & BPJS, and KPI reviews.",
      },
      { property: "og:title", content: "Core HRIS Internal — Human Power Management" },
      {
        property: "og:description",
        content: "Employee database, attendance, payroll and performance in one workspace.",
      },
    ],
  }),
  component: HrisPage,
});

const features = [
  { title: "Database Karyawan", detail: "PKWT / PKWTT / Intern, NPWP & status PTKP." },
  { title: "Absensi GPS & Shift", detail: "Clock-in/out dengan koordinat dan status harian." },
  { title: "Payroll PPh 21 TER", detail: "Kategori TER A/B/C, BPJS Kesehatan & Ketenagakerjaan." },
  { title: "KPI & Performance", detail: "Skor disiplin, output dan behaviour per periode." },
];

function HrisPage() {
  return (
    <AppShell
      title="Core HRIS Internal"
      description="Manajemen karyawan aktif, kepatuhan hukum, dan hak finansial. Akses terbatas untuk karyawan, manager, HRD admin dan payroll officer."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <section key={f.title} className="glass-panel p-6">
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.detail}</p>
          </section>
        ))}
      </div>
      <section className="glass-panel min-h-64 p-7">
        <h3 className="text-lg font-semibold">Free activity space</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Area kerja terbuka untuk modul HRIS berikutnya.
        </p>
      </section>
    </AppShell>
  );
}
