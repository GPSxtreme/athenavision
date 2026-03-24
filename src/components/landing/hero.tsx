import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--void)] bg-grid px-6 py-24 text-center">
      {/* Orbiting ring */}
      <div className="animate-orbit pointer-events-none absolute inset-0 m-auto h-[600px] w-[600px] max-w-[90vw] max-h-[90vw] rounded-full border border-[var(--cyan)] opacity-5" />
      <div
        className="animate-orbit pointer-events-none absolute inset-0 m-auto h-[800px] w-[800px] max-w-[110vw] max-h-[110vw] rounded-full border border-[var(--magenta)] opacity-[0.03]"
        style={{ animationDuration: "30s", animationDirection: "reverse" }}
      />

      {/* Background glow orbs */}
      <div className="animate-pulse-glow pointer-events-none absolute top-1/4 left-1/4 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--cyan)] opacity-[0.04] blur-3xl" />
      <div className="animate-pulse-glow pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--magenta)] opacity-[0.04] blur-3xl delay-400" />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8">
        {/* Glass badge */}
        <div className="animate-fade-in glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs tracking-[0.2em] text-[var(--text-dim)] uppercase">
          <span className="animate-pulse-glow h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
          Dual AI Extraction Engine
        </div>

        {/* Heading */}
        <h1
          className="animate-fade-in delay-200 max-w-3xl font-[var(--font-syne)] text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          <span className="text-[var(--text)]">Text extraction</span>
          <br />
          <span className="glow-text-cyan text-transparent bg-clip-text bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)]">
            you can trust
          </span>
          <br />
          <span className="text-[var(--text)]">completely</span>
        </h1>

        {/* Glowing underline accent */}
        <div className="animate-hud-line delay-400 h-px w-32 bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] opacity-60 glow-cyan" />

        {/* Subtext */}
        <p
          className="animate-fade-in delay-400 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{
            color: "var(--text-dim)",
            fontFamily: "var(--font-plex-mono)",
          }}
        >
          AthenaVision runs dual AI extractions, diffs the results, and
          highlights where the models disagreed. You see exactly where the
          uncertainty is — no black-box guessing.
        </p>

        {/* CTA */}
        <div className="animate-fade-in delay-600">
          <Link
            href="/extract"
            className="glass-hover inline-flex h-12 items-center justify-center rounded-full bg-[var(--cyan)] px-8 text-sm font-semibold tracking-wider text-[var(--void)] uppercase transition-all duration-300 hover:scale-105 glow-cyan"
          >
            Try it now
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="animate-fade-in delay-800 absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[10px] tracking-[0.3em] text-[var(--text-dim)] uppercase">
          Scroll
        </span>
        <div className="h-8 w-px bg-gradient-to-b from-[var(--cyan)] to-transparent opacity-40" />
      </div>
    </section>
  );
}
