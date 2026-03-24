import Link from "next/link";

export function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
      <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
        Text extraction you can{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#22d3ee]">
          actually trust
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
        AthenaVision runs dual AI extractions, diffs the results, and highlights
        where the models disagreed. You see exactly where the uncertainty is —
        no black-box guessing.
      </p>
      <Link
        href="/extract"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-black transition-transform hover:scale-105"
      >
        Try it now
      </Link>
    </section>
  );
}
