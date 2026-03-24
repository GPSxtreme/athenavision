// src/lib/validate.ts
import type { DiffResult } from "./diff";
import type { ValidationCheck, ValidationResult } from "./types";

function checkGibberish(text: string): ValidationCheck {
  // Ratio of alphanumeric + common punctuation to total characters
  const meaningful = text.replace(
    /[^a-zA-Z0-9\s.,;:!?'"()\-/@#$%&*+=₹€£¥\u0900-\u097F]/g,
    "",
  );
  const ratio = meaningful.length / text.length;
  return {
    name: "gibberish",
    passed: ratio > 0.7,
    detail: `Meaningful character ratio: ${(ratio * 100).toFixed(1)}%`,
  };
}

function isSuspiciousCodePoint(cp: number): boolean {
  // Control characters (excluding tab \u0009, LF \u000A, CR \u000D)
  if (cp <= 0x0008 || cp === 0x000b || cp === 0x000c) return true;
  if (cp >= 0x000e && cp <= 0x001f) return true;
  // Private Use Area and Specials block
  if (cp >= 0xe000 && cp <= 0xf8ff) return true;
  if (cp >= 0xfff0) return true;
  return false;
}

function checkUnicodeSanity(text: string): ValidationCheck {
  // Check for suspicious Unicode: control chars, private use area, etc.
  let count = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (isSuspiciousCodePoint(cp)) count++;
  }
  return {
    name: "unicode-sanity",
    passed: count === 0,
    detail:
      count > 0 ? `Found ${count} suspicious Unicode character(s)` : "Clean",
  };
}

function checkRepeatedPatterns(text: string): ValidationCheck {
  // Detect runs of 5+ repeated characters (sign of hallucination)
  const repeated = /(.)\1{4,}/g;
  const matches = text.match(repeated);
  return {
    name: "repeated-patterns",
    passed: !matches || matches.length === 0,
    detail: matches
      ? `Found ${matches.length} repeated character run(s)`
      : "Clean",
  };
}

export function validateExtraction(
  text: string,
  diffResult: DiffResult | null,
): ValidationResult {
  const checks: ValidationCheck[] = [
    checkGibberish(text),
    checkUnicodeSanity(text),
    checkRepeatedPatterns(text),
  ];

  // Base confidence from diff
  let confidence: number;
  if (diffResult) {
    if (diffResult.lowConfidenceOverall) {
      confidence = 0.4;
    } else {
      confidence = 1 - diffResult.anomalyCharCount / diffResult.totalCharCount;
    }
  } else {
    // Single stream fallback — no diff data, base confidence at 0.75
    confidence = 0.75;
  }

  // Deduct 0.05 for each failed structural check
  for (const check of checks) {
    if (!check.passed) {
      confidence -= 0.05;
    }
  }

  confidence = Math.max(0, Math.min(1, confidence));

  return {
    confidence: Number.parseFloat(confidence.toFixed(3)),
    checks,
  };
}
