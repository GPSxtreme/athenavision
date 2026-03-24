const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Drop any image — documents, receipts, handwritten notes.",
    color: "text-zinc-100",
  },
  {
    number: "02",
    title: "Dual Extract",
    description:
      "Two AI streams analyze your image simultaneously with different strategies.",
    color: "text-[#4ade80]",
  },
  {
    number: "03",
    title: "Diff & Detect",
    description:
      "We compare both outputs character-by-character. Disagreements become anomalies.",
    color: "text-[#f59e0b]",
  },
  {
    number: "04",
    title: "Resolve",
    description:
      "Review highlighted anomalies, pick the correct version, or edit manually.",
    color: "text-[#22d3ee]",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3">
              <span
                className={`text-4xl font-bold tabular-nums ${step.color} opacity-40`}
              >
                {step.number}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
