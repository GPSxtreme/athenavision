import { Differentiators } from "@/components/landing/differentiators";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function Home() {
  return (
    <main className="flex-1 overflow-hidden">
      <Hero />
      <HowItWorks />
      <Differentiators />
      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-8 text-center">
        <p className="text-xs text-[var(--text-dim)] tracking-wider">
          AthenaVision — Dual AI Extraction Engine
        </p>
      </footer>
    </main>
  );
}
