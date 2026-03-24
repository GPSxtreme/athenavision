// src/components/results/results-view.tsx
"use client";

import type { ExtractionResult } from "@/lib/types";
import { ImagePanel } from "./image-panel";
import { TextPanel } from "./text-panel";

interface ResultsViewProps {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  result: ExtractionResult;
  onReExtract: () => void;
}

export function ResultsView({
  imageUrl,
  fileName,
  fileSize,
  result,
  onReExtract,
}: ResultsViewProps) {
  return (
    <div className="flex flex-1 flex-col animate-fade-in">
      {/* Top bar */}
      <div
        className="glass flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid transparent",
          backgroundImage:
            "linear-gradient(135deg, rgba(15,15,30,0.9), rgba(10,10,20,0.7))",
          boxShadow:
            "0 1px 0 0 rgba(0,240,255,0.12), 0 2px 0 0 rgba(255,0,170,0.06)",
        }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-[0.15em] font-[family-name:var(--font-syne)]"
          style={{ color: "var(--text)" }}
        >
          Results
        </h2>
        <button
          type="button"
          onClick={onReExtract}
          className="relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all border-gradient"
          style={{
            background: "rgba(10,10,20,0.6)",
            border: "1px solid var(--border)",
            color: "var(--text-dim)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-dim)";
          }}
        >
          Re-extract
        </button>
      </div>

      {/* Side-by-side: stacks vertically on mobile, side-by-side on md+ */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <div className="flex-1 min-h-0">
          <ImagePanel
            imageUrl={imageUrl}
            fileName={fileName}
            fileSize={fileSize}
          />
        </div>

        {/* Divider: gradient line cyan → magenta */}
        <div
          className="hidden md:block w-px flex-shrink-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--cyan), var(--magenta))",
            opacity: 0.2,
          }}
        />
        <div
          className="md:hidden h-px w-full flex-shrink-0"
          style={{
            background:
              "linear-gradient(to right, var(--cyan), var(--magenta))",
            opacity: 0.2,
          }}
        />

        <div className="flex-1 min-h-0">
          <TextPanel result={result} />
        </div>
      </div>
    </div>
  );
}
