// src/lib/types.ts

// --- SSE Event Types ---

export type Stage =
  | "extracting"
  | "diffing"
  | "validating"
  | "complete"
  | "error";

export type SSEEvent =
  | { event: "status"; data: { stage: Stage } }
  | { event: "stream-a"; data: { token: string } }
  | { event: "stream-b"; data: { token: string } }
  | { event: "anomaly"; data: Anomaly }
  | { event: "validation"; data: ValidationResult }
  | { event: "result"; data: ExtractionResult }
  | { event: "error"; data: { message: string; recoverable: boolean } };

// --- Anomaly Types ---

export type AnomalyType = "character-confusion" | "missing-text" | "extra-text";

export interface Anomaly {
  position: number;
  streamA: string;
  streamB: string;
  type: AnomalyType;
}

// --- Validation ---

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationResult {
  confidence: number;
  checks: ValidationCheck[];
}

// --- Extraction Result ---

export interface ExtractionResult {
  text: string;
  anomalies: Anomaly[];
  confidence: number;
  metadata: {
    streamAText: string;
    streamBText: string;
    streamBFailed?: boolean;
    streamAFailed?: boolean;
    duration: number;
  };
}

// --- App State ---

export type AppState =
  | { stage: "upload" }
  | {
      stage: "processing";
      imageUrl: string;
      file: File;
      streamATokens: string[];
      streamBTokens: string[];
      currentStatus: Stage;
    }
  | {
      stage: "results";
      imageUrl: string;
      fileName: string;
      fileSize: number;
      result: ExtractionResult;
    }
  | {
      stage: "error";
      message: string;
      imageUrl?: string;
    };

export type AppAction =
  | { type: "START_PROCESSING"; file: File; imageUrl: string }
  | { type: "STREAM_A_TOKEN"; token: string }
  | { type: "STREAM_B_TOKEN"; token: string }
  | { type: "STATUS_CHANGE"; stage: Stage }
  | { type: "RESULT"; result: ExtractionResult }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

// --- Image Constraints ---

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
