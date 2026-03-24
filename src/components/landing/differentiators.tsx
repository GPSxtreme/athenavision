const points = [
  {
    title: "Not just another API wrapper",
    description:
      "Most tools send your image to one model and return whatever it says. We run two independent extractions and surface the disagreements.",
    accent: "var(--cyan)",
    glowClass: "glow-cyan",
    delay: "delay-100",
  },
  {
    title: "Built-in anomaly detection",
    description:
      "Character confusion (5/S, O/0), missing text, hallucinated content — flagged automatically by diffing two AI outputs.",
    accent: "var(--magenta)",
    glowClass: "glow-magenta",
    delay: "delay-300",
  },
  {
    title: "You stay in control",
    description:
      "Every anomaly shows you both versions. Pick one, edit manually, or accept the AI's best guess. Your data, your call.",
    accent: "var(--cyan)",
    glowClass: "glow-cyan",
    delay: "delay-500",
  },
];

export function Differentiators() {
  return (
    <section className="relative px-6 py-24 bg-[var(--void)]">
      <div className="mx-auto max-w-3xl">
        {/* Section header */}
        <div className="mb-16 flex flex-col items-center gap-4">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-plex-mono)",
            }}
          >
            Differentiators
          </p>
          <h2
            className="text-center text-3xl font-black tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            Why AthenaVision
          </h2>
          <div className="animate-hud-line h-px w-24 bg-gradient-to-r from-[var(--magenta)] to-[var(--cyan)] opacity-50" />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-6">
          {points.map((point) => (
            <div
              key={point.title}
              className={`animate-slide-up ${point.delay} border-gradient glass glass-hover hud-corner relative rounded-xl p-6 transition-all duration-300`}
            >
              {/* Accent dot */}
              <div
                className={`${point.glowClass} mb-4 h-2 w-2 rounded-full`}
                style={{ backgroundColor: point.accent }}
              />

              <h3
                className="text-lg font-bold tracking-wide"
                style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}
              >
                {point.title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-plex-mono)",
                }}
              >
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
