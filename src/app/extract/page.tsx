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
          streamAText={state.streamAText}
          streamBText={state.streamBText}
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
