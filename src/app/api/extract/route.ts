import { diffExtractions, normalizeWhitespace } from "@/lib/diff";
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
        extractWithVision(
          base64,
          mimeType,
          PROMPT_A,
          {
            onToken: (token) => send({ event: "stream-a", data: { token } }),
            onComplete: (text) => {
              streamAText = text;
            },
            onError: () => {
              streamAFailed = true;
            },
          },
          abortController.signal,
        ),
        extractWithVision(
          base64,
          mimeType,
          PROMPT_B,
          {
            onToken: (token) => send({ event: "stream-b", data: { token } }),
            onComplete: (text) => {
              streamBText = text;
            },
            onError: () => {
              streamBFailed = true;
            },
          },
          abortController.signal,
        ),
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

      // Use whichever stream succeeded as primary text, normalized so anomaly positions align
      const primaryText = normalizeWhitespace(
        streamAFailed ? streamBText : streamAText,
      );

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
          message: err instanceof Error ? err.message : "Unexpected error",
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
