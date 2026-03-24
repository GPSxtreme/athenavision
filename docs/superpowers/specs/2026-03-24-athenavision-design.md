# AthenaVision — Design Spec

## Overview

AthenaVision is an image-to-text extraction app that goes beyond simple OCR API wrappers by adding a trust layer: dual extraction with diff-based anomaly detection, structural validation, and an interactive results UI. Built with Next.js 16, React 19, Tailwind v4, and BiomeJS.

## Problem

Vision models extract text from images well, but they hallucinate, confuse characters (O/0, 5/S), and produce unreliable output with no indication of where they guessed. A raw API call gives you text with no confidence signal. AthenaVision solves this by running dual extractions, diffing the results, and surfacing disagreements as anomalies the user can resolve.

## Architecture

**Approach: Route Handler + SSE**

The client uploads an image, opens an SSE connection, and receives real-time events as the pipeline progresses. All sensitive logic (API calls, diffing, validation) runs server-side.

### Pipeline

```
Image Upload (client)
    ↓ POST /api/extract (FormData)
    ↓
Dual Extraction (server, parallel)
    ├── Stream A: "Extract all text verbatim. Preserve structure."
    └── Stream B: "Perform OCR. Flag uncertain characters with [?]."
    ↓ tokens streamed via SSE events
Diff Engine (server)
    ↓ character-level comparison, flag disagreements
Structural Validation (server)
    ↓ gibberish detection, unicode sanity, repeated-char patterns
Result (SSE complete event)
    ↓
Interactive Results UI (client)
```

### SSE Event Protocol

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
```

## Pages & Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, how-it-works, differentiators, CTA → `/app` |
| `/app` | Extraction app — upload → cinematic processing → side-by-side results |

### App Page States

The `/app` page is a single page driven by state transitions:

1. **Upload** — drag & drop zone + file picker
2. **Processing** — cinematic view (scan line, dual streams)
3. **Results** — side-by-side (image left, extracted text right, anomaly highlights)
4. **Error** — if both streams fail or image is invalid

No auth, no persistence, no database. Stateless — refresh and start over.

## UI Design

**Theme: Dark mode only.** Consistent with the cinematic processing aesthetic.

### Landing Page (`/`)

- Hero section with tagline explaining what AthenaVision does and how it differs from basic OCR
- How-it-works section showing the pipeline visually
- Differentiators section
- CTA button → navigates to `/app`

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
│   └── app/
│       └── page.tsx              # Main extraction app
├── api/
│   └── extract/
│       └── route.ts              # POST handler → SSE stream
├── components/
│   ├── landing/                  # Hero, how-it-works, CTA
│   ├── upload/                   # Drag & drop zone
│   ├── processing/               # Cinematic view (scan line, streams)
│   └── results/                  # Side-by-side viewer, anomaly popovers
└── lib/
    ├── openrouter.ts             # OpenRouter API client
    ├── prompts.ts                # Extraction prompts A & B
    ├── diff.ts                   # Character-level diff engine
    └── validate.ts               # Structural validation
```

## External Dependencies

**None beyond existing stack.** Tailwind + vanilla React handles all UI. OpenRouter is a fetch call.

**Env vars:**
- `OPENROUTER_API_KEY` — single key for all model calls

**AI Model:** gemini-2.5-flash via OpenRouter (single model for v1).

## Future Evolution (Not in v1)

- **Tesseract.js tier:** Fast first-pass for clear/printed images to save API costs
- **Jury-of-models:** Send image to 3 models, judge picks best output
- **Preprocessing:** Sharp/OpenCV for de-noise, de-skew, enhance
- **Persistence:** Save extraction history
- **Domain-specific validation:** KYC fields, medical prescriptions, invoice schemas
