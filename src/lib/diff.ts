// src/lib/diff.ts
import { diffChars } from "diff";
import type { Anomaly, AnomalyType } from "./types";

export function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");
}

export interface DiffResult {
  anomalies: Anomaly[];
  anomalyCharCount: number;
  totalCharCount: number;
  lowConfidenceOverall: boolean;
}

export function diffExtractions(
  streamAText: string,
  streamBText: string,
): DiffResult {
  const normalizedA = normalizeWhitespace(streamAText);
  const normalizedB = normalizeWhitespace(streamBText);
  const totalCharCount = Math.max(normalizedA.length, normalizedB.length);

  if (totalCharCount === 0) {
    return {
      anomalies: [],
      anomalyCharCount: 0,
      totalCharCount: 0,
      lowConfidenceOverall: false,
    };
  }

  const changes = diffChars(normalizedA, normalizedB);
  const anomalies: Anomaly[] = [];
  let anomalyCharCount = 0;
  let position = 0;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];

    if (!change.added && !change.removed) {
      position += change.value.length;
      continue;
    }

    let streamA = "";
    let streamB = "";
    let type: AnomalyType;

    if (change.removed) {
      streamA = change.value;
      // Check if next change is an addition (replacement)
      const next = changes[i + 1];
      if (next?.added) {
        streamB = next.value;
        i++; // Skip the addition, we've consumed it
        type = "character-confusion";
      } else {
        type = "extra-text";
      }
    } else {
      // change.added without a preceding removal
      streamB = change.value;
      type = "missing-text";
    }

    const charCount = Math.max(streamA.length, streamB.length);
    anomalyCharCount += charCount;

    anomalies.push({ position, streamA, streamB, type });
    position += streamA.length;
  }

  const lowConfidenceOverall = anomalyCharCount / totalCharCount > 0.5;

  return {
    anomalies: lowConfidenceOverall ? [] : anomalies,
    anomalyCharCount,
    totalCharCount,
    lowConfidenceOverall,
  };
}
