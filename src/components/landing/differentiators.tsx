const points = [
  {
    title: "Not just another API wrapper",
    description:
      "Most tools send your image to one model and return whatever it says. We run two independent extractions and surface the disagreements.",
  },
  {
    title: "Built-in anomaly detection",
    description:
      "Character confusion (5/S, O/0), missing text, hallucinated content — flagged automatically by diffing two AI outputs.",
  },
  {
    title: "You stay in control",
    description:
      "Every anomaly shows you both versions. Pick one, edit manually, or accept the AI's best guess. Your data, your call.",
  },
];

export function Differentiators() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Why AthenaVision
        </h2>
        <div className="mt-12 flex flex-col gap-10">
          {points.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-zinc-800 bg-[#111118] p-6"
            >
              <h3 className="text-lg font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
