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
    <div className="flex flex-1 flex-col animate-fade-in-up">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h2 className="text-sm font-semibold text-zinc-300">Results</h2>
        <button
          type="button"
          onClick={onReExtract}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          Re-extract
        </button>
      </div>

      {/* Side by side */}
      <div className="flex flex-1 divide-x divide-zinc-800 overflow-hidden">
        <div className="flex-1">
          <ImagePanel
            imageUrl={imageUrl}
            fileName={fileName}
            fileSize={fileSize}
          />
        </div>
        <div className="flex-1">
          <TextPanel result={result} />
        </div>
      </div>
    </div>
  );
}
