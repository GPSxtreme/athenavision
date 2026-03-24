# AthenaVision

Intelligent image-to-text extraction with dual AI verification and anomaly detection.

Most OCR tools send your image to one model and return whatever it says. AthenaVision runs **two independent AI extractions** with different strategies, diffs the outputs character-by-character, and flags where the models disagreed — so you see exactly where the uncertainty is.

## How It Works

```
Image Upload
    ↓
Dual Extraction (parallel)
    ├── Stream A: verbatim text extraction
    └── Stream B: OCR with uncertainty markers
    ↓
Diff & Anomaly Detection (Myers diff)
    ↓
Structural Validation (gibberish, unicode, patterns)
    ↓
Interactive Results (side-by-side, anomaly resolution)
```

1. **Upload** — Drop any image (JPEG, PNG, WebP, up to 10MB)
2. **Dual Extract** — Two AI streams analyze your image simultaneously with different prompts
3. **Diff & Detect** — Character-level comparison flags disagreements as anomalies
4. **Resolve** — Review highlighted anomalies with auto-suggested fixes, accept or edit

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, React Compiler)
- **Styling:** Tailwind CSS v4
- **Linting:** BiomeJS
- **AI:** Google Gemini 3 Flash via OpenRouter
- **Diff:** Myers diff algorithm (`diff` package)

## Getting Started

### Prerequisites

- Node.js 20.9+
- An [OpenRouter](https://openrouter.ai) API key

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your OpenRouter API key to .env
# OPENROUTER_API_KEY=sk-or-...

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page, then click **Launch App** to start extracting.

### Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run BiomeJS linter
npm run format    # Format code with BiomeJS
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout (Syne + IBM Plex Mono)
│   ├── globals.css           # Design system (cyber-noir theme)
│   ├── extract/
│   │   └── page.tsx          # Extraction app (state machine)
│   └── api/
│       └── extract/
│           └── route.ts      # POST → streaming SSE pipeline
├── components/
│   ├── landing/              # Hero, how-it-works, differentiators
│   ├── upload/               # Drag & drop zone
│   ├── processing/           # Cinematic dual-stream view
│   └── results/              # Side-by-side viewer, anomaly popovers
└── lib/
    ├── types.ts              # Shared types
    ├── openrouter.ts         # OpenRouter streaming client
    ├── prompts.ts            # Extraction prompts A & B
    ├── diff.ts               # Myers diff engine
    ├── validate.ts           # Structural validation
    └── sse.ts                # SSE writer + parser
```

## Architecture

The app uses a **Route Handler + SSE** streaming architecture:

1. Client POSTs image as FormData to `/api/extract`
2. Server fires two parallel extractions to OpenRouter (different prompts)
3. Tokens stream back as SSE events in real-time
4. After both complete, server diffs outputs and runs validation
5. Final result includes text, anomalies, and confidence score

The client reads the SSE stream via `fetch()` + `ReadableStream` (not `EventSource`, since we need POST).

## Future

- Tesseract.js tier for fast first-pass on clear images
- Jury-of-models: send to 3 models, judge picks best output
- Image preprocessing (de-noise, de-skew, enhance)
- Extraction history with persistence
- Domain-specific validation (KYC, medical, invoices)
