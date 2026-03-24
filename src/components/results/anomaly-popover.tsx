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
    <div
      className="absolute z-50 mt-1 w-72 rounded-lg p-4 shadow-xl glass"
      style={{
        border: "1px solid rgba(0,240,255,0.2)",
        boxShadow:
          "0 0 24px rgba(0,240,255,0.08), 0 0 60px rgba(255,0,170,0.04), inset 0 0 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--text-dim)" }}
        >
          {explanation}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="transition-colors"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--cyan)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-dim)";
          }}
        >
          ✕
        </button>
      </div>

      {/* Show what both extractions saw, compact */}
      {anomaly.streamA !== anomaly.streamB && (
        <div className="mb-3 flex gap-2 text-[11px]">
          <div
            className="flex-1 rounded px-2 py-1.5"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,240,255,0.06), rgba(0,240,255,0.02))",
              border: "1px solid rgba(0,240,255,0.12)",
            }}
          >
            <span
              className="uppercase tracking-wider"
              style={{ color: "var(--text-dim)", fontSize: "9px" }}
            >
              Saw:{" "}
            </span>
            <span
              className="font-[family-name:var(--font-plex-mono)]"
              style={{ color: "var(--text)" }}
            >
              {anomaly.streamA || (
                <span className="italic" style={{ color: "var(--text-dim)" }}>
                  nothing
                </span>
              )}
            </span>
          </div>
          <div
            className="flex-1 rounded px-2 py-1.5"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,0,170,0.06), rgba(255,0,170,0.02))",
              border: "1px solid rgba(255,0,170,0.12)",
            }}
          >
            <span
              className="uppercase tracking-wider"
              style={{ color: "var(--text-dim)", fontSize: "9px" }}
            >
              Saw:{" "}
            </span>
            <span
              className="font-[family-name:var(--font-plex-mono)]"
              style={{ color: "var(--text)" }}
            >
              {cleanUncertainty(anomaly.streamB) || (
                <span className="italic" style={{ color: "var(--text-dim)" }}>
                  nothing
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Editable suggestion */}
      <div className="mb-3">
        <div
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--cyan)" }}
        >
          Suggested
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md px-2.5 py-1.5 text-sm outline-none transition-all font-[family-name:var(--font-plex-mono)]"
          style={{
            background: "rgba(3,3,8,0.8)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(0,240,255,0.5)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,240,255,0.12)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onResolve(value)}
          className="flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.08))",
            border: "1px solid rgba(0,240,255,0.3)",
            color: "var(--cyan)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(135deg, rgba(0,240,255,0.25), rgba(0,240,255,0.15))";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 16px rgba(0,240,255,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(0,240,255,0.08))";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => onResolve("")}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: "rgba(10,10,20,0.8)",
            border: "1px solid var(--border)",
            color: "var(--text-dim)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(0,240,255,0.2)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-dim)";
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
