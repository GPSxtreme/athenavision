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

function checkUnicodeSanity(text: string): ValidationCheck {
  // Check for suspicious Unicode: control chars, private use area, etc.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — detecting control characters by design
  const suspicious =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFF0-\uFFFF]/g;
  const matches = text.match(suspicious);
  return {
    name: "unicode-sanity",
    passed: !matches || matches.length === 0,
    detail: matches
      ? `Found ${matches.length} suspicious Unicode character(s)`
      : "Clean",
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
