export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="aurora-veil absolute -top-1/3 left-[-10%] h-[70vh] w-[70vw] rounded-full opacity-40 blur-[120px]"
        style={{ background: "var(--aurora-teal)" }}
      />
      <div
        className="aurora-veil absolute top-[10%] right-[-15%] h-[65vh] w-[60vw] rounded-full opacity-35 blur-[130px]"
        style={{ background: "var(--aurora-violet)", animationDelay: "-8s" }}
      />
      <div
        className="aurora-veil absolute bottom-[-25%] left-[25%] h-[55vh] w-[55vw] rounded-full opacity-25 blur-[140px]"
        style={{ background: "var(--aurora-rose)", animationDelay: "-16s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--aurora-teal) 1px, transparent 1px), linear-gradient(90deg, var(--aurora-teal) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
