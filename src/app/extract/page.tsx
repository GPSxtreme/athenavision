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
        streamAText: "",
        streamBText: "",
        currentStatus: "extracting",
      };
    case "STREAM_A_TOKEN":
      if (state.stage !== "processing") return state;
      return {
        ...state,
        streamAText: state.streamAText + action.token,
      };
    case "STREAM_B_TOKEN":
      if (state.stage !== "processing") return state;
      return {
        ...state,
        streamBText: state.streamBText + action.token,
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
      {/* Upload state */}
      {state.stage === "upload" && (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-8 bg-grid">
          <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
            <h1
              className="text-3xl font-bold tracking-tight font-[family-name:var(--font-syne)]"
              style={{ color: "var(--text)" }}
            >
              Extract Text
            </h1>
            <p
              className="text-sm tracking-widest uppercase font-[family-name:var(--font-plex-mono)]"
              style={{ color: "var(--text-dim)" }}
            >
              Upload an image to begin extraction
            </p>
          </div>
          <div className="animate-slide-up delay-200">
            <DropZone onFileSelected={handleFileSelected} />
          </div>
        </div>
      )}

      {/* Processing state */}
      {state.stage === "processing" && (
        <CinematicView
          imageUrl={state.imageUrl}
          streamAText={state.streamAText}
          streamBText={state.streamBText}
          currentStatus={state.currentStatus}
        />
      )}

      {/* Results state */}
      {state.stage === "results" && (
        <ResultsView
          imageUrl={state.imageUrl}
          fileName={state.fileName}
          fileSize={state.fileSize}
          result={state.result}
          onReExtract={() => dispatch({ type: "RESET" })}
        />
      )}

      {/* Error state */}
      {state.stage === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 animate-fade-in">
          <div
            className="glass rounded-xl px-8 py-6 text-center"
            style={{
              border: "1px solid rgba(255,0,170,0.25)",
              boxShadow:
                "0 0 32px rgba(255,0,170,0.08), inset 0 0 24px rgba(0,0,0,0.4)",
              maxWidth: "28rem",
              width: "100%",
            }}
          >
            {/* Error icon with glitch animation */}
            <div
              className="mb-4 text-3xl animate-glitch"
              style={{ color: "var(--magenta)" }}
            >
              ⚠
            </div>
            <p
              className="text-sm font-[family-name:var(--font-plex-mono)]"
              style={{ color: "var(--text-dim)" }}
            >
              {state.message}
            </p>
          </div>
          {/* Retry button with border-gradient */}
          <button
            type="button"
            onClick={() => dispatch({ type: "RESET" })}
            className="relative rounded-lg px-6 py-2.5 text-sm font-medium transition-all border-gradient"
            style={{
              background: "rgba(10,10,20,0.6)",
              border: "1px solid var(--border)",
              color: "var(--text-dim)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-dim)";
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
