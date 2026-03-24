// src/components/results/text-panel.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import type { Anomaly, ExtractionResult } from "@/lib/types";
import { AnomalyPopover } from "./anomaly-popover";

interface TextPanelProps {
  result: ExtractionResult;
}

function confidenceBadge(confidence: number) {
  if (confidence >= 0.95)
    return {
      label: "High confidence",
      className: "bg-[#166534] text-[#4ade80]",
    };
  if (confidence >= 0.8)
    return {
      label: "Review recommended",
      className: "bg-[#713f12] text-[#f59e0b]",
    };
  return { label: "Low confidence", className: "bg-[#7f1d1d] text-[#f87171]" };
}

// Split text into segments: plain text and anomaly spans interleaved
function buildSegments(
  text: string,
  anomalies: Anomaly[],
): Array<
  | { type: "text"; value: string; cursor: number }
  | { type: "anomaly"; anomaly: Anomaly; cursor: number }
> {
  const sorted = [...anomalies].sort((a, b) => a.position - b.position);
  const segments: Array<
    | { type: "text"; value: string; cursor: number }
    | { type: "anomaly"; anomaly: Anomaly; cursor: number }
  > = [];
  let cursor = 0;

  for (const anomaly of sorted) {
    if (anomaly.position > cursor) {
      segments.push({
        type: "text",
        value: text.slice(cursor, anomaly.position),
        cursor,
      });
    }
    segments.push({ type: "anomaly", anomaly, cursor: anomaly.position });
    cursor =
      anomaly.position + (anomaly.streamA.length || anomaly.streamB.length);
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor), cursor });
  }

  return segments;
}

export function TextPanel({ result }: TextPanelProps) {
  const [text, setText] = useState(result.text);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Set<number>>(
    new Set(),
  );
  const [activeAnomaly, setActiveAnomaly] = useState<Anomaly | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editRef = useRef<HTMLPreElement>(null);
  const badge = confidenceBadge(result.confidence);

  const handleResolve = useCallback(
    (anomaly: Anomaly, value: string) => {
      const before = text.slice(0, anomaly.position);
      const after = text.slice(anomaly.position + anomaly.streamA.length);
      setText(before + value + after);
      setResolvedAnomalies((prev) => new Set(prev).add(anomaly.position));
      setActiveAnomaly(null);
    },
    [text],
  );

  const handleEdit = useCallback((value: string) => {
    setText(value);
    setActiveAnomaly(null);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
  }, [text]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(
      {
        text,
        anomalies: result.anomalies,
        confidence: result.confidence,
        metadata: result.metadata,
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extraction-result.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [text, result]);

  const unresolvedAnomalies = result.anomalies.filter(
    (a) => !resolvedAnomalies.has(a.position),
  );
  const segments = buildSegments(text, unresolvedAnomalies);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Extracted Text
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-zinc-500 transition-colors"
          >
            {isEditing ? "Done editing" : "Edit"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            {(result.confidence * 100).toFixed(0)}% · {badge.label}
          </span>
          {unresolvedAnomalies.length > 0 && (
            <span className="rounded-full bg-[#713f12] px-2.5 py-0.5 text-[10px] font-semibold text-[#f59e0b]">
              {unresolvedAnomalies.length} anomal
              {unresolvedAnomalies.length === 1 ? "y" : "ies"}
            </span>
          )}
          {(result.metadata.streamAFailed || result.metadata.streamBFailed) && (
            <span className="rounded-full bg-[#713f12] px-2.5 py-0.5 text-[10px] font-semibold text-[#f59e0b]">
              Single stream
            </span>
          )}
        </div>
      </div>

      {/* Text with inline anomaly highlights */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          /* Edit mode: plain textarea */
          <textarea
            value={text}
            onChange={(e) => handleEdit(e.target.value)}
            className="w-full min-h-[400px] resize-none bg-transparent font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-zinc-200 outline-none"
          />
        ) : (
          /* View mode: highlighted text with inline anomaly spans */
          <pre
            ref={editRef}
            className="whitespace-pre-wrap break-words font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-zinc-200"
          >
            {segments.map((seg) =>
              seg.type === "text" ? (
                <span key={`t-${seg.cursor}`}>{seg.value}</span>
              ) : (
                <span
                  key={`a-${seg.anomaly.position}`}
                  className="relative inline"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveAnomaly(
                        activeAnomaly === seg.anomaly ? null : seg.anomaly,
                      )
                    }
                    className="inline rounded bg-[#f59e0b]/20 border border-[#f59e0b]/30 px-0.5 text-[#f59e0b] hover:bg-[#f59e0b]/30 transition-colors animate-anomaly-flash"
                  >
                    {seg.anomaly.streamA || seg.anomaly.streamB}
                    <span className="ml-0.5 text-[10px]">⚠</span>
                  </button>
                  {activeAnomaly === seg.anomaly && (
                    <AnomalyPopover
                      anomaly={seg.anomaly}
                      onResolve={(value) => handleResolve(seg.anomaly, value)}
                      onEdit={(value) =>
                        handleEdit(
                          text.slice(0, seg.anomaly.position) +
                            value +
                            text.slice(
                              seg.anomaly.position + seg.anomaly.streamA.length,
                            ),
                        )
                      }
                      onClose={() => setActiveAnomaly(null)}
                    />
                  )}
                </span>
              ),
            )}
          </pre>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
        <span className="text-xs text-zinc-600">
          {result.metadata.duration
            ? `Processed in ${(result.metadata.duration / 1000).toFixed(1)}s`
            : ""}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Copy Text
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-[#4ade80] px-4 py-2 text-xs font-semibold text-black hover:bg-[#22c55e] transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
