"use client";

import { useState } from "react";
import type { Anomaly } from "@/lib/types";

interface AnomalyPopoverProps {
  anomaly: Anomaly;
  onResolve: (value: string) => void;
  onClose: () => void;
}

// Strip [?] uncertainty markers from Stream B output
function cleanUncertainty(text: string): string {
  return text.replace(/\[\?\]/g, "").trim();
}

// Auto-suggest the best resolution based on anomaly type
function getSuggestion(anomaly: Anomaly): string {
  const cleanA = anomaly.streamA.trim();
  const cleanB = cleanUncertainty(anomaly.streamB);

  switch (anomaly.type) {
    case "character-confusion":
      // Prefer Stream A (verbatim) unless it's empty
      return cleanA || cleanB;
    case "missing-text":
      // One stream found text the other didn't — use whichever has content
      return cleanA || cleanB;
    case "extra-text":
      // Stream A has extra text Stream B doesn't — likely real content
      return cleanA || cleanB;
    default:
      return cleanA || cleanB;
  }
}

function getExplanation(anomaly: Anomaly): string {
  switch (anomaly.type) {
    case "character-confusion":
      return "Two extractions read this differently";
    case "missing-text":
      return "Only one extraction found text here";
    case "extra-text":
      return "One extraction found extra text here";
    default:
      return "Extractions disagree here";
  }
}

export function AnomalyPopover({
  anomaly,
  onResolve,
  onClose,
}: AnomalyPopoverProps) {
  const suggestion = getSuggestion(anomaly);
  const [value, setValue] = useState(suggestion);
  const explanation = getExplanation(anomaly);

  return (
    <div className="absolute z-50 mt-1 w-72 rounded-lg border border-zinc-700 bg-[#1a1a2e] p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{explanation}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      </div>

      {/* Show what both extractions saw, compact */}
      {anomaly.streamA !== anomaly.streamB && (
        <div className="mb-3 flex gap-2 text-[11px]">
          <div className="flex-1 rounded bg-zinc-800/50 px-2 py-1">
            <span className="text-zinc-500">Saw: </span>
            <span className="font-mono text-zinc-300">
              {anomaly.streamA || (
                <span className="text-zinc-600 italic">nothing</span>
              )}
            </span>
          </div>
          <div className="flex-1 rounded bg-zinc-800/50 px-2 py-1">
            <span className="text-zinc-500">Saw: </span>
            <span className="font-mono text-zinc-300">
              {cleanUncertainty(anomaly.streamB) || (
                <span className="text-zinc-600 italic">nothing</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Editable suggestion */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4ade80] mb-1">
          Suggested
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 font-mono text-sm text-zinc-200 outline-none focus:border-[#4ade80]/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onResolve(value)}
          className="flex-1 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/30 px-3 py-1.5 text-xs font-semibold text-[#4ade80] hover:bg-[#4ade80]/25 transition-colors"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => onResolve("")}
          className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
