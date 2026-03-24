const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Drop any image — documents, receipts, handwritten notes.",
    gradient: "from-[var(--cyan)] to-[var(--cyan)]",
    glowClass: "glow-text-cyan",
    delay: "delay-100",
  },
  {
    number: "02",
    title: "Dual Extract",
    description:
      "Two AI streams analyze your image simultaneously with different strategies.",
    gradient: "from-[var(--cyan)] to-[var(--magenta)]",
    glowClass: "glow-text-cyan",
    delay: "delay-200",
  },
  {
    number: "03",
    title: "Diff & Detect",
    description:
      "We compare both outputs character-by-character. Disagreements become anomalies.",
    gradient: "from-[var(--magenta)] to-[var(--magenta)]",
    glowClass: "glow-text-magenta",
    delay: "delay-300",
  },
  {
    number: "04",
    title: "Resolve",
    description:
      "Review highlighted anomalies, pick the correct version, or edit manually.",
    gradient: "from-[var(--magenta)] to-[var(--cyan)]",
    glowClass: "glow-text-magenta",
    delay: "delay-400",
  },
];

export function HowItWorks() {
  return (
    <section className="relative px-6 py-24 bg-[var(--surface)]">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="mb-16 flex flex-col items-center gap-4">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{
              color: "var(--text-dim)",
              fontFamily: "var(--font-plex-mono)",
            }}
          >
            Process
          </p>
          <h2
            className="text-center text-3xl font-black tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-syne)", color: "var(--text)" }}
          >
            How it works
          </h2>
          {/* HUD animated line */}
          <div className="animate-hud-line h-px w-24 bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] opacity-50" />
        </div>

        {/* Steps grid */}
        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connecting line — desktop only */}
          <div className="pointer-events-none absolute top-[3.5rem] left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent lg:block" />

          {steps.map((step) => (
            <div
              key={step.number}
              className={`animate-slide-up ${step.delay} glass glass-hover hud-corner relative flex flex-col gap-4 rounded-xl p-6 transition-all duration-300`}
            >
              {/* Step number */}
              <span
                className={`${step.glowClass} font-[var(--font-plex-mono)] text-5xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-br ${step.gradient}`}
                style={{ fontFamily: "var(--font-plex-mono)" }}
              >
                {step.number}
              </span>

              {/* Step title */}
              <h3
                className="text-base font-bold tracking-wide"
                style={{ color: "var(--text)", fontFamily: "var(--font-syne)" }}
              >
                {step.title}
              </h3>

              {/* Step description */}
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-plex-mono)",
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
