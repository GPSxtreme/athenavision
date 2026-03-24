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
      bg: "rgba(0,240,255,0.1)",
      border: "rgba(0,240,255,0.25)",
      color: "var(--cyan)",
    };
  if (confidence >= 0.8)
    return {
      label: "Review recommended",
      bg: "rgba(255,170,0,0.1)",
      border: "rgba(255,170,0,0.25)",
      color: "var(--anomaly)",
    };
  return {
    label: "Low confidence",
    bg: "rgba(255,0,170,0.1)",
    border: "rgba(255,0,170,0.25)",
    color: "var(--magenta)",
  };
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
      <div
        className="glass flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--text-dim)" }}
          >
            Extracted Text
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="rounded px-2 py-0.5 text-[10px] transition-all glass"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(0,240,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-dim)";
            }}
          >
            {isEditing ? "Done editing" : "Edit"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.color,
            }}
          >
            {(result.confidence * 100).toFixed(0)}% · {badge.label}
          </span>
          {/* Anomaly count badge */}
          {unresolvedAnomalies.length > 0 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(255,170,0,0.1)",
                border: "1px solid rgba(255,170,0,0.25)",
                color: "var(--anomaly)",
              }}
            >
              {unresolvedAnomalies.length} anomal
              {unresolvedAnomalies.length === 1 ? "y" : "ies"}
            </span>
          )}
          {(result.metadata.streamAFailed || result.metadata.streamBFailed) && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(255,170,0,0.1)",
                border: "1px solid rgba(255,170,0,0.25)",
                color: "var(--anomaly)",
              }}
            >
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
            className="w-full min-h-[400px] resize-none bg-transparent text-sm leading-relaxed outline-none font-[family-name:var(--font-plex-mono)]"
            style={{ color: "var(--text)" }}
          />
        ) : (
          /* View mode: highlighted text with inline anomaly spans */
          <pre
            ref={editRef}
            className="whitespace-pre-wrap break-words text-sm leading-relaxed font-[family-name:var(--font-plex-mono)]"
            style={{ color: "var(--text)" }}
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
                    className="inline rounded px-0.5 transition-colors animate-anomaly-pulse"
                    style={{
                      background: "rgba(255,170,0,0.15)",
                      border: "1px solid rgba(255,170,0,0.35)",
                      color: "var(--anomaly)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,170,0,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,170,0,0.15)";
                    }}
                  >
                    {seg.anomaly.streamA || seg.anomaly.streamB}
                    <span className="ml-0.5 text-[10px]">⚠</span>
                  </button>
                  {activeAnomaly === seg.anomaly && (
                    <AnomalyPopover
                      anomaly={seg.anomaly}
                      onResolve={(value) => handleResolve(seg.anomaly, value)}
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
      <div
        className="glass flex items-center justify-between px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span
          className="text-[10px] font-[family-name:var(--font-plex-mono)]"
          style={{ color: "var(--text-dim)" }}
        >
          {result.metadata.duration
            ? `Processed in ${(result.metadata.duration / 1000).toFixed(1)}s`
            : ""}
        </span>
        <div className="flex gap-2">
          {/* Copy button: outline style */}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg px-4 py-2 text-xs font-medium transition-all"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(0,240,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-dim)";
            }}
          >
            Copy Text
          </button>
          {/* Export button: cyan glow */}
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg px-4 py-2 text-xs font-semibold transition-all glow-cyan"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,240,255,0.1))",
              border: "1px solid rgba(0,240,255,0.4)",
              color: "var(--cyan)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(0,240,255,0.3), rgba(0,240,255,0.18))";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px rgba(0,240,255,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,240,255,0.1))";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px rgba(0,240,255,0.15), 0 0 60px rgba(0,240,255,0.05)";
            }}
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
