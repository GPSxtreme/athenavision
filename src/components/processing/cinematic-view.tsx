"use client";

import type { Stage } from "@/lib/types";

interface CinematicViewProps {
  imageUrl: string;
  streamATokens: string[];
  streamBTokens: string[];
  currentStatus: Stage;
}

const statusLabels: Record<Stage, string> = {
  extracting: "Analyzing document...",
  diffing: "Comparing extractions...",
  validating: "Validating results...",
  complete: "Complete",
  error: "Error occurred",
};

export function CinematicView({
  imageUrl,
  streamATokens,
  streamBTokens,
  currentStatus,
}: CinematicViewProps) {
  const streamAText = streamATokens.join("");
  const streamBText = streamBTokens.join("");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      {/* Image with scan line and glow */}
      <div className="relative animate-fade-in-up">
        {/* Glow effects */}
        <div className="absolute -inset-8 rounded-3xl bg-[#4ade80]/10 blur-3xl animate-pulse-glow" />
        <div className="absolute -inset-8 rounded-3xl bg-[#f87171]/10 blur-3xl animate-pulse-glow [animation-delay:1s]" />

        {/* Image container */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800">
          {/* biome-ignore lint/performance/noImgElement: imageUrl is a runtime blob URL, next/image cannot optimize it */}
          <img
            src={imageUrl}
            alt="Uploaded document"
            className="max-h-48 max-w-xs object-contain"
          />
          {/* Scan line */}
          {currentStatus === "extracting" && (
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#4ade80] to-transparent animate-scan-line" />
          )}
        </div>
      </div>

      {/* Status text */}
      <p className="text-sm text-zinc-400 animate-fade-in-up">
        {statusLabels[currentStatus]}
      </p>

      {/* Dual streams */}
      {(streamAText || streamBText) && (
        <div className="flex w-full max-w-4xl gap-4 animate-fade-in-up">
          {/* Stream A — left */}
          <div className="flex-1 text-right">
            <div className="mb-2 flex items-center justify-end gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4ade80] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#4ade80]/70">
                Stream A
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed text-zinc-300/80">
              {streamAText}
            </pre>
          </div>

          {/* Divider */}
          <div className="w-px bg-zinc-800" />

          {/* Stream B — right */}
          <div className="flex-1 text-left">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f87171] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#f87171]/70">
                Stream B
              </span>
            </div>
            <pre className="whitespace-pre-wrap break-words font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed text-zinc-300/80">
              {streamBText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
