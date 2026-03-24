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
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop handlers are intentional; label inside handles keyboard/click */}
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
            aria-hidden="true"
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
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
