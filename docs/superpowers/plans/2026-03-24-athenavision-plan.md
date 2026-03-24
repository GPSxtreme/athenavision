# AthenaVision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an image-to-text extraction app with dual AI extraction, diff-based anomaly detection, and a cinematic real-time processing UI.

**Architecture:** Next.js 16 app with two pages (`/` landing, `/extract` app). Client POSTs image to `/api/extract`, which streams SSE-formatted events back via ReadableStream. Server runs two parallel vision model extractions via OpenRouter, diffs the results with Myers diff, validates structurally, and streams everything to the client in real-time.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, BiomeJS, `diff` npm package, OpenRouter API (gemini-2.5-flash)

**Spec:** `docs/superpowers/specs/2026-03-24-athenavision-design.md`

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                        # Landing page (server component)
│   ├── layout.tsx                      # Root layout (dark mode, fonts) — modify existing
│   ├── globals.css                     # Tailwind + custom keyframe animations — modify existing
│   ├── extract/
│   │   └── page.tsx                    # Extraction app (client component, useReducer state machine)
│   └── api/
│       └── extract/
│           └── route.ts                # POST handler → streaming SSE response
├── components/
│   ├── landing/
│   │   ├── hero.tsx                    # Hero section with tagline + CTA
│   │   ├── how-it-works.tsx            # Pipeline visualization
│   │   └── differentiators.tsx         # Why AthenaVision section
│   ├── upload/
│   │   └── drop-zone.tsx               # Drag & drop + file picker (client component)
│   ├── processing/
│   │   └── cinematic-view.tsx          # Scan line, dual streams, diff animation (client component)
│   └── results/
│       ├── results-view.tsx            # Side-by-side layout (client component)
│       ├── image-panel.tsx             # Left panel — zoomable image
│       ├── text-panel.tsx              # Right panel — editable extracted text with anomaly highlights
│       └── anomaly-popover.tsx         # Stream A vs B resolution popover
└── lib/
    ├── types.ts                        # All shared types
    ├── openrouter.ts                   # OpenRouter streaming API client
    ├── prompts.ts                      # Extraction prompts A & B
    ├── diff.ts                         # Myers diff wrapper + anomaly generation
    ├── validate.ts                     # Structural validation (gibberish, unicode, patterns)
    └── sse.ts                          # SSE writer (server) + parser (client)
```

---

## Task 1: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write type definitions**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared type definitions"
```

---

## Task 2: SSE Utilities

**Files:**
- Create: `src/lib/sse.ts`

- [ ] **Step 1: Write SSE writer (server-side) and parser (client-side)**

```ts
// src/lib/sse.ts
import type { SSEEvent } from "./types";

// --- Server-side: format SSE events for streaming ---

export function formatSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  function send(event: SSEEvent) {
    controller?.enqueue(encoder.encode(formatSSE(event)));
  }

  function close() {
    controller?.close();
  }

  return { stream, send, close };
}

// --- Client-side: parse SSE text stream ---

export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let eventName = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventName = line.slice(7);
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (eventName && data) {
        yield { event: eventName, data: JSON.parse(data) } as SSEEvent;
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sse.ts
git commit -m "feat: add SSE stream writer and parser"
```

---

## Task 3: OpenRouter Client

**Files:**
- Create: `src/lib/prompts.ts`
- Create: `src/lib/openrouter.ts`

- [ ] **Step 1: Write extraction prompts**

```ts
// src/lib/prompts.ts

export const PROMPT_A = `Extract all text from this image verbatim. Preserve the original structure, spacing, and line breaks exactly as they appear. Do not interpret, summarize, or reformat. Output only the extracted text, nothing else.`;

export const PROMPT_B = `Perform OCR on this image. Extract all visible text. For any character you are uncertain about, include it but mark it with [?] immediately after the uncertain character. Preserve the original layout and line breaks. Output only the extracted text with uncertainty markers, nothing else.`;
```

- [ ] **Step 2: Write OpenRouter streaming client**

```ts
// src/lib/openrouter.ts

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function extractWithVision(
  base64Image: string,
  mimeType: string,
  systemPrompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  _retryCount = 0,
): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview",
        stream: true,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      }),
      signal,
    },
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 429 && _retryCount < 1) {
      // Rate limited — single retry with 2s backoff
      await new Promise((r) => setTimeout(r, 2000));
      return extractWithVision(
        base64Image,
        mimeType,
        systemPrompt,
        callbacks,
        signal,
        _retryCount + 1,
      );
    }
    throw new Error(`OpenRouter API error: ${status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from OpenRouter");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
    callbacks.onComplete(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts.ts src/lib/openrouter.ts
git commit -m "feat: add OpenRouter streaming client and extraction prompts"
```

---

## Task 4: Diff Engine

**Files:**
- Create: `src/lib/diff.ts`

- [ ] **Step 1: Install diff package**

```bash
npm install diff
npm install -D @types/diff
```

- [ ] **Step 2: Write diff engine**

```ts
// src/lib/diff.ts
import { diffChars } from "diff";
import type { Anomaly, AnomalyType } from "./types";

function normalizeWhitespace(text: string): string {
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
    position += streamA.length || streamB.length;
  }

  const lowConfidenceOverall = anomalyCharCount / totalCharCount > 0.5;

  return {
    anomalies: lowConfidenceOverall ? [] : anomalies,
    anomalyCharCount,
    totalCharCount,
    lowConfidenceOverall,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/diff.ts package.json package-lock.json
git commit -m "feat: add Myers diff engine for anomaly detection"
```

---

## Task 5: Structural Validation

**Files:**
- Create: `src/lib/validate.ts`

- [ ] **Step 1: Write validation module**

```ts
// src/lib/validate.ts
import type { DiffResult } from "./diff";
import type { ValidationCheck, ValidationResult } from "./types";

function checkGibberish(text: string): ValidationCheck {
  // Ratio of alphanumeric + common punctuation to total characters
  const meaningful = text.replace(
    /[^a-zA-Z0-9\s.,;:!?'"()\-\/@#$%&*+=₹€£¥\u0900-\u097F]/g,
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
  const suspicious = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF\uFFF0-\uFFFF]/g;
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
      confidence =
        1 - diffResult.anomalyCharCount / diffResult.totalCharCount;
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validate.ts
git commit -m "feat: add structural validation (gibberish, unicode, patterns)"
```

---

## Task 6: API Route Handler

**Files:**
- Create: `src/app/api/extract/route.ts`

- [ ] **Step 1: Write the streaming POST handler**

```ts
// src/app/api/extract/route.ts
import { diffExtractions } from "@/lib/diff";
import { extractWithVision } from "@/lib/openrouter";
import { PROMPT_A, PROMPT_B } from "@/lib/prompts";
import { createSSEStream } from "@/lib/sse";
import type { Anomaly, ExtractionResult } from "@/lib/types";
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from "@/lib/types";
import { validateExtraction } from "@/lib/validate";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return Response.json(
      { error: `Unsupported format. Accepted: JPEG, PNG, WebP` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Image exceeds 10MB limit" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type;

  const { stream, send, close } = createSSEStream();
  const startTime = Date.now();

  // Run pipeline in background, stream events to client
  (async () => {
    try {
      send({ event: "status", data: { stage: "extracting" } });

      let streamAText = "";
      let streamBText = "";
      let streamAFailed = false;
      let streamBFailed = false;

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 60_000);

      // Run both extractions in parallel
      const [resultA, resultB] = await Promise.allSettled([
        extractWithVision(base64, mimeType, PROMPT_A, {
          onToken: (token) =>
            send({ event: "stream-a", data: { token } }),
          onComplete: (text) => {
            streamAText = text;
          },
          onError: () => {
            streamAFailed = true;
          },
        }, abortController.signal),
        extractWithVision(base64, mimeType, PROMPT_B, {
          onToken: (token) =>
            send({ event: "stream-b", data: { token } }),
          onComplete: (text) => {
            streamBText = text;
          },
          onError: () => {
            streamBFailed = true;
          },
        }, abortController.signal),
      ]);

      clearTimeout(timeout);

      // Check for extraction failures from Promise.allSettled
      if (resultA.status === "rejected") streamAFailed = true;
      if (resultB.status === "rejected") streamBFailed = true;

      if (streamAFailed && streamBFailed) {
        send({
          event: "error",
          data: {
            message: "Both extraction streams failed. Please try again.",
            recoverable: true,
          },
        });
        close();
        return;
      }

      // Use whichever stream succeeded as primary text
      const primaryText = streamAFailed ? streamBText : streamAText;

      // Diff phase (only if both streams succeeded)
      let anomalies: Anomaly[] = [];
      let diffResult = null;

      if (!streamAFailed && !streamBFailed) {
        send({ event: "status", data: { stage: "diffing" } });
        diffResult = diffExtractions(streamAText, streamBText);
        anomalies = diffResult.anomalies;

        for (const anomaly of anomalies) {
          send({ event: "anomaly", data: anomaly });
        }
      }

      // Validation phase
      send({ event: "status", data: { stage: "validating" } });
      const validation = validateExtraction(primaryText, diffResult);
      send({ event: "validation", data: validation });

      // Complete
      send({ event: "status", data: { stage: "complete" } });

      const result: ExtractionResult = {
        text: primaryText,
        anomalies,
        confidence: validation.confidence,
        metadata: {
          streamAText,
          streamBText,
          streamAFailed,
          streamBFailed,
          duration: Date.now() - startTime,
        },
      };

      send({ event: "result", data: result });
    } catch (err) {
      send({
        event: "error",
        data: {
          message:
            err instanceof Error ? err.message : "Unexpected error",
          recoverable: true,
        },
      });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify the dev server starts without errors**

```bash
npm run dev
```

Open `http://localhost:3000` — should see the default page. Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/extract/route.ts
git commit -m "feat: add streaming extraction API route handler"
```

---

## Task 7: App Globals & Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update root layout for dark mode**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AthenaVision — Intelligent Text Extraction",
  description:
    "Extract text from images with dual AI verification and anomaly detection. Beyond simple OCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050510] text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add custom CSS animations for cinematic view**

```css
/* src/app/globals.css */
@import "tailwindcss";

@layer base {
  :root {
    --color-stream-a: #4ade80;
    --color-stream-b: #f87171;
    --color-anomaly: #f59e0b;
    --color-bg-deep: #050510;
    --color-bg-card: #111118;
    --color-bg-surface: #1a1a2e;
  }
}

/* Cinematic processing animations */

@keyframes scan-line {
  0% { top: 0%; }
  100% { top: 100%; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes counter-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes anomaly-flash {
  0%, 100% { background-color: transparent; }
  50% { background-color: color-mix(in srgb, var(--color-anomaly) 25%, transparent); }
}

.animate-scan-line {
  animation: scan-line 2s ease-in-out infinite;
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out forwards;
}

.animate-counter-up {
  animation: counter-up 0.3s ease-out forwards;
}

.animate-anomaly-flash {
  animation: anomaly-flash 1s ease-in-out 3;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: update layout for dark mode and add cinematic animations"
```

---

## Task 8: Landing Page

**Files:**
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/how-it-works.tsx`
- Create: `src/components/landing/differentiators.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write hero component**

```tsx
// src/components/landing/hero.tsx
import Link from "next/link";

export function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
      <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
        Text extraction you can{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#22d3ee]">
          actually trust
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
        AthenaVision runs dual AI extractions, diffs the results, and
        highlights where the models disagreed. You see exactly where the
        uncertainty is — no black-box guessing.
      </p>
      <Link
        href="/extract"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-black transition-transform hover:scale-105"
      >
        Try it now
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Write how-it-works component**

```tsx
// src/components/landing/how-it-works.tsx

const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Drop any image — documents, receipts, handwritten notes.",
    color: "text-zinc-100",
  },
  {
    number: "02",
    title: "Dual Extract",
    description:
      "Two AI streams analyze your image simultaneously with different strategies.",
    color: "text-[#4ade80]",
  },
  {
    number: "03",
    title: "Diff & Detect",
    description:
      "We compare both outputs character-by-character. Disagreements become anomalies.",
    color: "text-[#f59e0b]",
  },
  {
    number: "04",
    title: "Resolve",
    description:
      "Review highlighted anomalies, pick the correct version, or edit manually.",
    color: "text-[#22d3ee]",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3">
              <span
                className={`text-4xl font-bold tabular-nums ${step.color} opacity-40`}
              >
                {step.number}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write differentiators component**

```tsx
// src/components/landing/differentiators.tsx

const points = [
  {
    title: "Not just another API wrapper",
    description:
      "Most tools send your image to one model and return whatever it says. We run two independent extractions and surface the disagreements.",
  },
  {
    title: "Built-in anomaly detection",
    description:
      "Character confusion (5/S, O/0), missing text, hallucinated content — flagged automatically by diffing two AI outputs.",
  },
  {
    title: "You stay in control",
    description:
      "Every anomaly shows you both versions. Pick one, edit manually, or accept the AI's best guess. Your data, your call.",
  },
];

export function Differentiators() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Why AthenaVision
        </h2>
        <div className="mt-12 flex flex-col gap-10">
          {points.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-zinc-800 bg-[#111118] p-6"
            >
              <h3 className="text-lg font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update landing page to compose components**

```tsx
// src/app/page.tsx
import { Differentiators } from "@/components/landing/differentiators";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <HowItWorks />
      <Differentiators />
    </main>
  );
}
```

- [ ] **Step 5: Verify landing page renders**

```bash
npm run dev
```

Open `http://localhost:3000` — should see the landing page with hero, how-it-works, and differentiators. Kill dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/ src/app/page.tsx
git commit -m "feat: add landing page with hero, how-it-works, differentiators"
```

---

## Task 9: Upload Component

**Files:**
- Create: `src/components/upload/drop-zone.tsx`

- [ ] **Step 1: Write drop zone component**

```tsx
// src/components/upload/drop-zone.tsx
"use client";

import { useCallback, useState } from "react";
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from "@/lib/types";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
}

export function DropZone({ onFileSelected }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Unsupported format. Use JPEG, PNG, or WebP.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Image exceeds 10MB limit.");
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex h-64 w-full max-w-lg cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-[#4ade80] bg-[#4ade80]/5"
            : "border-zinc-700 bg-[#111118] hover:border-zinc-500"
        }`}
      >
        <label className="flex cursor-pointer flex-col items-center gap-3">
          <svg
            className="h-10 w-10 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <span className="text-sm text-zinc-400">
            Drop an image here, or{" "}
            <span className="font-medium text-zinc-200 underline underline-offset-2">
              browse
            </span>
          </span>
          <span className="text-xs text-zinc-600">
            JPEG, PNG, WebP · Max 10MB
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/upload/drop-zone.tsx
git commit -m "feat: add drag-and-drop upload zone component"
```

---

## Task 10: Cinematic Processing View

**Files:**
- Create: `src/components/processing/cinematic-view.tsx`

- [ ] **Step 1: Write cinematic processing component**

```tsx
// src/components/processing/cinematic-view.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processing/cinematic-view.tsx
git commit -m "feat: add cinematic processing view with dual stream animation"
```

---

## Task 11: Results View

**Files:**
- Create: `src/components/results/anomaly-popover.tsx`
- Create: `src/components/results/image-panel.tsx`
- Create: `src/components/results/text-panel.tsx`
- Create: `src/components/results/results-view.tsx`

- [ ] **Step 1: Write anomaly popover**

```tsx
// src/components/results/anomaly-popover.tsx
"use client";

import { useState } from "react";
import type { Anomaly } from "@/lib/types";

interface AnomalyPopoverProps {
  anomaly: Anomaly;
  onResolve: (value: string) => void;
  onEdit: (value: string) => void;
  onClose: () => void;
}

export function AnomalyPopover({
  anomaly,
  onResolve,
  onEdit,
  onClose,
}: AnomalyPopoverProps) {
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="absolute z-50 mt-1 w-80 rounded-lg border border-zinc-700 bg-[#1a1a2e] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">
          {anomaly.type.replace("-", " ")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-md bg-[#4ade80]/10 border border-[#4ade80]/20 p-2">
          <div className="text-[10px] font-semibold text-[#4ade80] mb-1">
            STREAM A
          </div>
          <div className="font-mono text-sm text-zinc-200">
            {anomaly.streamA || <span className="text-zinc-600 italic">empty</span>}
          </div>
        </div>
        <div className="flex-1 rounded-md bg-[#f87171]/10 border border-[#f87171]/20 p-2">
          <div className="text-[10px] font-semibold text-[#f87171] mb-1">
            STREAM B
          </div>
          <div className="font-mono text-sm text-zinc-200">
            {anomaly.streamB || <span className="text-zinc-600 italic">empty</span>}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-400"
            autoFocus
          />
          <button
            type="button"
            onClick={() => { onEdit(editValue); setIsEditing(false); }}
            className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600 transition-colors"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {anomaly.streamA && (
            <button
              type="button"
              onClick={() => onResolve(anomaly.streamA)}
              className="flex-1 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/30 px-3 py-1.5 text-xs font-medium text-[#4ade80] hover:bg-[#4ade80]/25 transition-colors"
            >
              Use A
            </button>
          )}
          {anomaly.streamB && (
            <button
              type="button"
              onClick={() => onResolve(anomaly.streamB)}
              className="flex-1 rounded-md bg-[#f87171]/15 border border-[#f87171]/30 px-3 py-1.5 text-xs font-medium text-[#f87171] hover:bg-[#f87171]/25 transition-colors"
            >
              Use B
            </button>
          )}
          <button
            type="button"
            onClick={() => { setEditValue(anomaly.streamA || anomaly.streamB); setIsEditing(true); }}
            className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write image panel**

```tsx
// src/components/results/image-panel.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImagePanelProps {
  imageUrl: string;
  fileName: string;
  fileSize: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImagePanel({ imageUrl, fileName, fileSize }: ImagePanelProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.max(0.5, Math.min(5, s - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Original
        </span>
        <span className="text-xs text-zinc-600">
          {fileName} · {formatSize(fileSize)}
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex h-full items-center justify-center p-4">
          <img
            src={imageUrl}
            alt="Original document"
            className="max-h-full max-w-full select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write text panel**

```tsx
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
    return { label: "High confidence", className: "bg-[#166534] text-[#4ade80]" };
  if (confidence >= 0.8)
    return { label: "Review recommended", className: "bg-[#713f12] text-[#f59e0b]" };
  return { label: "Low confidence", className: "bg-[#7f1d1d] text-[#f87171]" };
}

// Split text into segments: plain text and anomaly spans interleaved
function buildSegments(
  text: string,
  anomalies: Anomaly[],
): Array<{ type: "text"; value: string } | { type: "anomaly"; anomaly: Anomaly }> {
  const sorted = [...anomalies].sort((a, b) => a.position - b.position);
  const segments: Array<
    { type: "text"; value: string } | { type: "anomaly"; anomaly: Anomaly }
  > = [];
  let cursor = 0;

  for (const anomaly of sorted) {
    if (anomaly.position > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, anomaly.position) });
    }
    segments.push({ type: "anomaly", anomaly });
    cursor = anomaly.position + (anomaly.streamA.length || anomaly.streamB.length);
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}

export function TextPanel({ result }: TextPanelProps) {
  const [text, setText] = useState(result.text);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Set<number>>(new Set());
  const [activeAnomaly, setActiveAnomaly] = useState<Anomaly | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
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
              {unresolvedAnomalies.length} anomal{unresolvedAnomalies.length === 1 ? "y" : "ies"}
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
                <span key={`t-${seg.value.slice(0, 20)}`}>{seg.value}</span>
              ) : (
                <span key={`a-${seg.anomaly.position}`} className="relative inline">
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
                      onEdit={(value) => handleEdit(
                        text.slice(0, seg.anomaly.position) + value +
                        text.slice(seg.anomaly.position + seg.anomaly.streamA.length),
                      )}
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
```

- [ ] **Step 4: Write results view**

```tsx
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
```

- [ ] **Step 5: Commit**

```bash
git add src/components/results/
git commit -m "feat: add results view with side-by-side panels and anomaly popovers"
```

---

## Task 12: Extract Page (State Machine + Wiring)

**Files:**
- Create: `src/app/extract/page.tsx`

- [ ] **Step 1: Write the extract page with useReducer state machine**

```tsx
// src/app/extract/page.tsx
"use client";

import { useCallback, useReducer } from "react";
import { CinematicView } from "@/components/processing/cinematic-view";
import { ResultsView } from "@/components/results/results-view";
import { DropZone } from "@/components/upload/drop-zone";
import { parseSSEStream } from "@/lib/sse";
import type { AppAction, AppState } from "@/lib/types";

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_PROCESSING":
      return {
        stage: "processing",
        file: action.file,
        imageUrl: action.imageUrl,
        streamATokens: [],
        streamBTokens: [],
        currentStatus: "extracting",
      };
    case "STREAM_A_TOKEN":
      if (state.stage !== "processing") return state;
      return {
        ...state,
        streamATokens: [...state.streamATokens, action.token],
      };
    case "STREAM_B_TOKEN":
      if (state.stage !== "processing") return state;
      return {
        ...state,
        streamBTokens: [...state.streamBTokens, action.token],
      };
    case "STATUS_CHANGE":
      if (state.stage !== "processing") return state;
      return { ...state, currentStatus: action.stage };
    case "RESULT":
      if (state.stage !== "processing") return state;
      return {
        stage: "results",
        imageUrl: state.imageUrl,
        fileName: state.file.name,
        fileSize: state.file.size,
        result: action.result,
      };
    case "ERROR":
      return {
        stage: "error",
        message: action.message,
        imageUrl: state.stage === "processing" ? state.imageUrl : undefined,
      };
    case "RESET":
      // Revoke object URL to prevent memory leak
      if ("imageUrl" in state && state.imageUrl) {
        URL.revokeObjectURL(state.imageUrl);
      }
      return { stage: "upload" };
    default:
      return state;
  }
}

const initialState: AppState = { stage: "upload" };

export default function ExtractPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleFileSelected = useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    dispatch({ type: "START_PROCESSING", file, imageUrl });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        dispatch({ type: "ERROR", message: err.error ?? "Upload failed" });
        return;
      }

      for await (const event of parseSSEStream(response)) {
        switch (event.event) {
          case "stream-a":
            dispatch({ type: "STREAM_A_TOKEN", token: event.data.token });
            break;
          case "stream-b":
            dispatch({ type: "STREAM_B_TOKEN", token: event.data.token });
            break;
          case "status":
            dispatch({ type: "STATUS_CHANGE", stage: event.data.stage });
            break;
          case "result":
            dispatch({ type: "RESULT", result: event.data });
            break;
          case "error":
            dispatch({ type: "ERROR", message: event.data.message });
            break;
        }
      }
    } catch (err) {
      dispatch({
        type: "ERROR",
        message: err instanceof Error ? err.message : "Connection lost",
      });
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      {state.stage === "upload" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Extract text from an image
          </h1>
          <DropZone onFileSelected={handleFileSelected} />
        </div>
      )}

      {state.stage === "processing" && (
        <CinematicView
          imageUrl={state.imageUrl}
          streamATokens={state.streamATokens}
          streamBTokens={state.streamBTokens}
          currentStatus={state.currentStatus}
        />
      )}

      {state.stage === "results" && (
        <ResultsView
          imageUrl={state.imageUrl}
          fileName={state.fileName}
          fileSize={state.fileSize}
          result={state.result}
          onReExtract={() => dispatch({ type: "RESET" })}
        />
      )}

      {state.stage === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-6 py-4 text-center">
            <p className="text-sm text-red-400">{state.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the full app runs end-to-end**

```bash
npm run dev
```

Navigate to `http://localhost:3000` → click "Try it now" → should reach `/extract` with upload zone. Kill dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/extract/page.tsx
git commit -m "feat: add extract page with state machine and SSE wiring"
```

---

## Task 13: Environment Setup & Smoke Test

- [ ] **Step 1: Create `.env.local` with placeholder**

```bash
echo 'OPENROUTER_API_KEY=your-key-here' > .env.local
```

Verify `.env.local` is in `.gitignore` (Next.js adds it by default).

- [ ] **Step 2: Run biome check**

```bash
npx biome check src/ --write
```

Fix any lint/format issues.

- [ ] **Step 3: Run build to verify no type errors**

```bash
npm run build
```

Fix any issues.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint fixes and env setup"
```

---

## Task 14: End-to-End Manual Test

- [ ] **Step 1: Set real OpenRouter API key in `.env.local`**

Replace `your-key-here` with an actual OpenRouter API key.

- [ ] **Step 2: Start dev server and test full flow**

```bash
npm run dev
```

1. Open `http://localhost:3000`
2. Verify landing page renders (hero, how-it-works, differentiators)
3. Click "Try it now" → navigate to `/extract`
4. Upload a test image (screenshot of text, receipt, document)
5. Watch cinematic processing view: scan line, dual streams appearing
6. Verify results view: side-by-side, confidence badge, anomaly highlights (if any)
7. Test "Copy Text" and "Export JSON" buttons
8. Test "Re-extract" button returns to upload
9. Test error handling: upload a non-image file, verify error message
10. Test drag-and-drop upload

- [ ] **Step 3: Fix any issues found during testing**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fixes from end-to-end testing"
```
