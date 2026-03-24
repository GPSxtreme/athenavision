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
    <div className="flex flex-col items-center gap-4 w-full">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop handlers are intentional; label inside handles keyboard/click */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-gradient glass hud-corner
          relative flex min-h-64 w-full max-w-lg cursor-pointer flex-col
          items-center justify-center rounded-2xl p-8
          transition-all duration-300
          ${isDragging ? "glow-cyan" : ""}
        `}
        style={
          isDragging
            ? {
                borderColor: "var(--cyan)",
                boxShadow:
                  "0 0 40px rgba(0,240,255,0.25), 0 0 80px rgba(0,240,255,0.08), inset 0 0 30px rgba(0,240,255,0.05)",
              }
            : undefined
        }
      >
        {/* Animated gradient border intensifies on drag */}
        {isDragging && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(255,0,170,0.08))",
            }}
          />
        )}

        <label className="relative z-10 flex cursor-pointer flex-col items-center gap-4">
          {/* Crosshair / target icon */}
          <div
            className={`relative transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              style={{
                color: isDragging ? "var(--cyan)" : "var(--text-dim)",
                transition: "color 0.3s",
                filter: isDragging
                  ? "drop-shadow(0 0 8px rgba(0,240,255,0.6))"
                  : undefined,
              }}
            >
              {/* Outer ring */}
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              {/* Inner ring */}
              <circle
                cx="24"
                cy="24"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.8"
              />
              {/* Center dot */}
              <circle cx="24" cy="24" r="2.5" fill="currentColor" />
              {/* Cross hairs */}
              <line
                x1="24"
                y1="4"
                x2="24"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="24"
                y1="34"
                x2="24"
                y2="44"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="24"
                x2="14"
                y2="24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="34"
                y1="24"
                x2="44"
                y2="24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Upload arrow */}
              <path
                d="M24 20 L24 28 M21 23 L24 20 L27 23"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-plex-mono)",
                color: "var(--text-dim)",
              }}
            >
              Drop an image here, or{" "}
              <span
                className={`transition-colors duration-300 ${isDragging ? "glow-text-cyan" : ""}`}
                style={{ color: "var(--cyan)" }}
              >
                browse
              </span>
            </span>
            <span
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-plex-mono)",
                color: "var(--text-dim)",
                opacity: 0.6,
              }}
            >
              JPEG · PNG · WebP · Max 10MB
            </span>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>

        {/* Corner HUD ticks — extra corners not covered by .hud-corner */}
        <span
          className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l"
          style={{
            borderColor: isDragging ? "var(--cyan)" : "var(--border)",
            opacity: 0.7,
            transition: "border-color 0.3s",
          }}
        />
        <span
          className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t"
          style={{
            borderColor: isDragging ? "var(--cyan)" : "var(--border)",
            opacity: 0.7,
            transition: "border-color 0.3s",
          }}
        />
      </div>

      {error && (
        <p
          className="text-sm animate-fade-in"
          style={{
            fontFamily: "var(--font-plex-mono)",
            color: "var(--magenta)",
            textShadow: "0 0 12px rgba(255,0,170,0.4)",
          }}
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
