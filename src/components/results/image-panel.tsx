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
      {/* Header bar */}
      <div
        className="glass flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--text-dim)" }}
        >
          Original
        </span>
        <span
          className="text-[10px] font-[family-name:var(--font-plex-mono)]"
          style={{ color: "var(--text-dim)" }}
        >
          {fileName}
          <span className="mx-1.5 opacity-40">·</span>
          {formatSize(fileSize)}
        </span>
      </div>

      {/* Image area */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pan/zoom container needs mouse events */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-grid-dense cursor-grab active:cursor-grabbing"
        style={{ background: "var(--void)" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex h-full items-center justify-center p-4">
          {/* biome-ignore lint/performance/noImgElement: object URL from File API — Next.js Image doesn't support blob: URLs */}
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

        {/* Zoom level indicator */}
        <div
          className="absolute bottom-3 right-3 rounded px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[10px]"
          style={{
            background: "rgba(3,3,8,0.75)",
            border: "1px solid var(--border)",
            color: "var(--text-dim)",
          }}
        >
          {(scale * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
