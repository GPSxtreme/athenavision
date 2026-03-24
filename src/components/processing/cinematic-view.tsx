"use client";

import type { Stage } from "@/lib/types";

interface CinematicViewProps {
  imageUrl: string;
  streamAText: string;
  streamBText: string;
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
  streamAText,
  streamBText,
  currentStatus,
}: CinematicViewProps) {
  const isActive =
    currentStatus === "extracting" ||
    currentStatus === "diffing" ||
    currentStatus === "validating";

  return (
    <div
      className="bg-grid flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 md:px-6"
      style={{ background: "var(--void)" }}
    >
      {/* Center column: image + status */}
      <div className="flex w-full max-w-4xl flex-col items-center gap-6">
        {/* ── Image area ─────────────────────────────── */}
        <div className="animate-fade-in relative">
          {/* Glowing orbs */}
          <div
            className="animate-pulse-glow pointer-events-none absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "rgba(0,240,255,0.12)" }}
          />
          <div
            className="animate-pulse-glow delay-400 pointer-events-none absolute -right-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "rgba(255,0,170,0.10)" }}
          />

          {/* Image container: glass + gradient border + scanlines + HUD corners */}
          <div
            className="border-gradient glass scanlines hud-corner relative overflow-hidden rounded-xl"
            style={{
              boxShadow: isActive
                ? "0 0 40px rgba(0,240,255,0.18), 0 0 80px rgba(0,240,255,0.06)"
                : "0 0 20px rgba(0,240,255,0.08)",
              transition: "box-shadow 0.5s",
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: imageUrl is a runtime blob URL, next/image cannot optimize it */}
            <img
              src={imageUrl}
              alt="Uploaded document"
              className="relative z-10 block max-h-56 max-w-xs object-contain md:max-h-72 md:max-w-sm"
            />

            {/* Sweeping scan line — cyan→magenta gradient */}
            {isActive && (
              <div
                className="animate-scan-line pointer-events-none absolute left-0 right-0 z-20"
                style={{
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, var(--cyan) 40%, var(--magenta) 60%, transparent)",
                  filter: "blur(1px)",
                  boxShadow:
                    "0 0 8px rgba(0,240,255,0.6), 0 0 16px rgba(255,0,170,0.3)",
                }}
              />
            )}

            {/* HUD corner overlays (explicit — reinforces .hud-corner pseudos) */}
            <span
              className="pointer-events-none absolute left-0 top-0 z-30 h-4 w-4 border-l border-t"
              style={{ borderColor: "var(--cyan)", opacity: 0.7 }}
            />
            <span
              className="pointer-events-none absolute right-0 top-0 z-30 h-4 w-4 border-r border-t"
              style={{ borderColor: "var(--cyan)", opacity: 0.7 }}
            />
            <span
              className="pointer-events-none absolute bottom-0 left-0 z-30 h-4 w-4 border-b border-l"
              style={{ borderColor: "var(--cyan)", opacity: 0.7 }}
            />
            <span
              className="pointer-events-none absolute bottom-0 right-0 z-30 h-4 w-4 border-b border-r"
              style={{ borderColor: "var(--cyan)", opacity: 0.7 }}
            />
          </div>

          {/* Stage badge top-right */}
          <div
            className="animate-fade-in delay-200 absolute -right-2 -top-3 z-40 rounded px-2 py-0.5"
            style={{
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.25)",
              fontFamily: "var(--font-plex-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.15em",
              color: "var(--cyan)",
              textTransform: "uppercase",
            }}
          >
            {currentStatus}
          </div>
        </div>

        {/* ── Status label ───────────────────────────── */}
        <div className="animate-fade-in delay-100 flex items-center gap-2">
          {isActive && (
            <span
              className="animate-pulse-glow inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--cyan)" }}
            />
          )}
          <p
            className="glow-text-cyan text-xs uppercase tracking-widest"
            style={{
              fontFamily: "var(--font-plex-mono)",
              color: "var(--cyan)",
            }}
          >
            {statusLabels[currentStatus]}
            {isActive && <span className="animate-type-cursor ml-0.5">_</span>}
          </p>
        </div>

        {/* ── Status-specific HUD indicator bar ─────── */}
        {(currentStatus === "diffing" || currentStatus === "validating") && (
          <div
            className="animate-fade-in flex w-full max-w-xs items-center gap-3"
            style={{ fontFamily: "var(--font-plex-mono)", fontSize: "0.65rem" }}
          >
            <span style={{ color: "var(--text-dim)", letterSpacing: "0.1em" }}>
              {currentStatus === "diffing" ? "ΔDIFF" : "VALIDATE"}
            </span>
            <div
              className="h-px flex-1 animate-hud-line"
              style={{
                background:
                  currentStatus === "diffing"
                    ? "linear-gradient(90deg, var(--cyan), var(--magenta))"
                    : "linear-gradient(90deg, var(--magenta), var(--cyan))",
              }}
            />
            <span
              className="animate-pulse"
              style={{
                color:
                  currentStatus === "diffing"
                    ? "var(--magenta)"
                    : "var(--cyan)",
              }}
            >
              ●
            </span>
          </div>
        )}
      </div>

      {/* ── Dual Streams ───────────────────────────────────────── */}
      {(streamAText || streamBText) && (
        <div className="animate-fade-in delay-300 flex w-full max-w-4xl flex-col gap-4 md:flex-row md:gap-6">
          {/* Stream A — left, text flows right-to-left */}
          <div
            className="glass border-gradient flex-1 rounded-xl p-4 md:text-right animate-fade-in-left"
            style={{ borderLeft: "2px solid rgba(0,240,255,0.3)" }}
          >
            <div className="mb-3 flex items-center gap-2 md:justify-end">
              <span
                className="animate-pulse-glow inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--stream-a)" }}
              />
              <span
                className="text-xs uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-plex-mono)",
                  color: "var(--stream-a)",
                  opacity: 0.8,
                }}
              >
                Stream A
              </span>
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-plex-mono)",
                  color: "var(--text-dim)",
                  opacity: 0.5,
                }}
              >
                ←
              </span>
            </div>
            <pre
              className="whitespace-pre-wrap break-words text-xs leading-relaxed"
              style={{
                fontFamily: "var(--font-plex-mono)",
                color: "rgba(0,240,255,0.75)",
                direction: "ltr",
              }}
            >
              {streamAText}
            </pre>
          </div>

          {/* Divider — hidden on mobile */}
          <div
            className="hidden w-px md:block"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--border), transparent)",
            }}
          />

          {/* Stream B — right, text flows left-to-right */}
          <div
            className="glass border-gradient flex-1 rounded-xl p-4 animate-fade-in-right delay-100"
            style={{ borderRight: "2px solid rgba(255,0,170,0.3)" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-plex-mono)",
                  color: "var(--text-dim)",
                  opacity: 0.5,
                }}
              >
                →
              </span>
              <span
                className="text-xs uppercase tracking-widest"
                style={{
                  fontFamily: "var(--font-plex-mono)",
                  color: "var(--stream-b)",
                  opacity: 0.8,
                }}
              >
                Stream B
              </span>
              <span
                className="animate-pulse-glow delay-300 inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--stream-b)" }}
              />
            </div>
            <pre
              className="whitespace-pre-wrap break-words text-xs leading-relaxed"
              style={{
                fontFamily: "var(--font-plex-mono)",
                color: "rgba(255,0,170,0.75)",
              }}
            >
              {streamBText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
