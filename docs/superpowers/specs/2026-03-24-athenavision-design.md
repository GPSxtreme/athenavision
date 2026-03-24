# AthenaVision — Design Spec

## Overview

AthenaVision is an image-to-text extraction app that goes beyond simple OCR API wrappers by adding a trust layer: dual extraction with diff-based anomaly detection, structural validation, and an interactive results UI. Built with Next.js 16, React 19, Tailwind v4, and BiomeJS.

## Problem

Vision models extract text from images well, but they hallucinate, confuse characters (O/0, 5/S), and produce unreliable output with no indication of where they guessed. A raw API call gives you text with no confidence signal. AthenaVision solves this by running dual extractions, diffing the results, and surfacing disagreements as anomalies the user can resolve.

## Architecture

**Approach: Route Handler + Streaming Response**

The client POSTs an image via `fetch()` and reads the response as a `ReadableStream` in SSE text format. This avoids the `EventSource` GET-only limitation while keeping the same wire format. All sensitive logic (API calls, diffing, validation) runs server-side.

### Pipeline

```
Image Upload (client)
    ↓ POST /api/extract (FormData)
    ↓ Response: ReadableStream in SSE format
    ↓
Dual Extraction (server, parallel)
    ├── Stream A: "Extract all text verbatim. Preserve structure."
    └── Stream B: "Perform OCR. Flag uncertain characters with [?]."
    ↓ tokens streamed as SSE events
Diff Engine (server)
    ↓ Myers diff algorithm on completed outputs
Structural Validation (server)
    ↓ gibberish detection, unicode sanity, repeated-char patterns
Result (complete event)
    ↓
Interactive Results UI (client)
```

### SSE Event Protocol

Client reads the response stream via `fetch()` + `ReadableStream` + manual SSE parsing (not `EventSource`).

```
event: status        → { stage: "extracting" }
event: stream-a      → { token: "Invoice #" }
event: stream-b      → { token: "Invoice #" }
event: status        → { stage: "diffing" }
event: anomaly       → { position: 42, streamA: "500", streamB: "S00", type: "character-confusion" }
event: status        → { stage: "validating" }
event: validation    → { confidence: 0.95, checks: [...] }
event: status        → { stage: "complete" }
event: result        → { text: "...", anomalies: [...], confidence: 0.95 }
event: error         → { message: "...", recoverable: true/false }
```

### Image Constraints

- **Max file size:** 10MB
- **Accepted formats:** JPEG, PNG, WebP
- **Client → Server:** Image sent as a `File` in a `FormData` POST body
- **Server → OpenRouter:** Server reads the file, validates it, and base64-encodes it inline in the prompt payload
- Client-side validation before upload; server-side validation as a guard

## Pages & Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, how-it-works, differentiators, CTA → `/extract` |
| `/extract` | Extraction app — upload → cinematic processing → side-by-side results |

### App Page States

The `/extract` page is a single client component driven by a `useReducer` state machine:

1. **Upload** — drag & drop zone + file picker
2. **Processing** — cinematic view (scan line, dual streams)
3. **Results** — side-by-side (image left, extracted text right, anomaly highlights)
4. **Error** — displays error message with retry option

State transitions: `upload → processing → results` or `upload → processing → error`. The `results` and `error` states can transition back to `upload` via re-extract/retry.

No auth, no persistence, no database. Stateless — refresh and start over.

## Error Handling

**Partial failure (one stream fails):**
Fall back to single-extraction mode. The result is returned without anomaly diffing, but structural validation still runs. A warning banner indicates reduced confidence: "Only one extraction succeeded — anomaly detection unavailable."

**Both streams fail:**
Transition to error state with the failure reason. User can retry.

**OpenRouter rate limiting (429):**
Single retry with 2s backoff. If retry fails, surface the error to the user.

**Network disconnect mid-stream:**
Client detects stream closure. If results are partially received, show what we have with a "connection lost" banner. Otherwise, error state with retry.

**Timeout:**
60s max per extraction. If exceeded, abort and show error.

## Diff Engine

**Algorithm:** Myers diff (via the `diff` npm package) on the two completed extraction strings.

**Whitespace handling:** Normalize whitespace before diffing (collapse multiple spaces, trim lines). Whitespace-only differences are not flagged as anomalies.

**Anomaly generation:** Each diff hunk where the two streams disagree becomes an anomaly with `position`, `streamA` value, `streamB` value, and `type` (character-confusion, missing-text, extra-text).

**Threshold:** If more than 50% of characters differ, the entire extraction is flagged as low-confidence rather than generating hundreds of individual anomalies.

## Confidence Score

Formula: `1 - (anomaly_character_count / total_character_count)`

- `anomaly_character_count`: total characters involved in diff hunks
- `total_character_count`: length of the longer extraction result

Thresholds for display:
- >= 0.95: green badge "High confidence"
- 0.80 - 0.94: amber badge "Review recommended"
- < 0.80: red badge "Low confidence"

Structural validation issues (gibberish, invalid unicode) each deduct a flat 0.05 from the score.

## UI Design

**Theme: Dark mode only.** Consistent with the cinematic processing aesthetic.

### Landing Page (`/`)

- Hero section with tagline explaining what AthenaVision does and how it differs from basic OCR
- How-it-works section showing the pipeline visually
- Differentiators section
- CTA button → navigates to `/extract`

### Cinematic Processing View

Three seamless phases:

**Phase 1 — Upload accepted (0.5s)**
- Image fades into center of screen
- Subtle glow builds around it
- Scan line appears, sweeps vertically

**Phase 2 — Dual extraction (duration of API call)**
- Two streams of monospace text flow out from the image — green (Stream A) left, red (Stream B) right
- Text appears token-by-token as SSE events arrive
- Image subtly pulses while processing
- Status text below: "Analyzing document..."

**Phase 3 — Diff & resolve (1-2s after streams complete)**
- Both text streams slide together toward center
- Matching text fades to neutral color
- Disagreements flash and highlight in amber
- Confidence score animates up like a counter
- Status: "N anomalies detected"
- Transitions into side-by-side results layout

**Animations:** CSS transitions + keyframes only. No heavy animation library. The token-by-token SSE streaming is the real animation.

### Results View (Side-by-Side)

**Left panel — Original image:**
- Zoomable/pannable image viewer
- Filename + file size in header bar

**Right panel — Extracted text:**
- Monospace, editable text area
- Header: confidence badge (green/amber/red) + anomaly count
- Anomalies highlighted inline with amber background + warning icon
- Click anomaly → popover with Stream A vs Stream B + "Use A" / "Use B" / "Edit manually"

**Bottom action bar:**
- Copy to clipboard (plain text)
- Export JSON (`{ text, anomalies, confidence, metadata }`)
- Re-extract button

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout (dark mode, fonts)
│   ├── globals.css               # Tailwind + custom animations
│   ├── extract/
│   │   └── page.tsx              # Main extraction app (client component)
│   └── api/
│       └── extract/
│           └── route.ts          # POST handler → streaming response
├── components/
│   ├── landing/                  # Hero, how-it-works, CTA
│   ├── upload/                   # Drag & drop zone
│   ├── processing/               # Cinematic view (scan line, streams)
│   └── results/                  # Side-by-side viewer, anomaly popovers
└── lib/
    ├── openrouter.ts             # OpenRouter API client
    ├── prompts.ts                # Extraction prompts A & B
    ├── diff.ts                   # Diff engine (wraps `diff` npm package)
    ├── validate.ts               # Structural validation
    ├── sse.ts                    # SSE formatting helpers (server) + parser (client)
    └── types.ts                  # Shared types (anomaly, validation result, SSE events)
```

**Route handler runtime:** `'nodejs'` is the default in Next.js 16. No explicit `runtime` export needed.

## External Dependencies

- `diff` — Myers diff algorithm for comparing extraction outputs

**Env vars:**
- `OPENROUTER_API_KEY` — single key for all model calls

**AI Model:** gemini-2.5-flash via OpenRouter (single model for v1).

## Future Evolution (Not in v1)

- **Tesseract.js tier:** Fast first-pass for clear/printed images to save API costs
- **Jury-of-models:** Send image to 3 models, judge picks best output
- **Preprocessing:** Sharp/OpenCV for de-noise, de-skew, enhance
- **Persistence:** Save extraction history
- **Domain-specific validation:** KYC fields, medical prescriptions, invoice schemas
- **Accessibility:** Keyboard navigation, screen reader support, color-blind-friendly palette
