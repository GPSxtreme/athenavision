// src/components/results/anomaly-popover.tsx
"use client";

import { useState } from "react";
import type { Anomaly } from "@/lib/types";

interface AnomalyPopoverProps {
  anomaly: Anomaly;
  onResolve: (value: string) => void;
  onEdit: (value: string) => void;
  onClose: () => void;
}

export function AnomalyPopover({
  anomaly,
  onResolve,
  onEdit,
  onClose,
}: AnomalyPopoverProps) {
  const [editValue, setEditValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="absolute z-50 mt-1 w-80 rounded-lg border border-zinc-700 bg-[#1a1a2e] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#f59e0b]">
          {anomaly.type.replace("-", " ")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-md bg-[#4ade80]/10 border border-[#4ade80]/20 p-2">
          <div className="text-[10px] font-semibold text-[#4ade80] mb-1">
            STREAM A
          </div>
          <div className="font-mono text-sm text-zinc-200">
            {anomaly.streamA || (
              <span className="text-zinc-600 italic">empty</span>
            )}
          </div>
        </div>
        <div className="flex-1 rounded-md bg-[#f87171]/10 border border-[#f87171]/20 p-2">
          <div className="text-[10px] font-semibold text-[#f87171] mb-1">
            STREAM B
          </div>
          <div className="font-mono text-sm text-zinc-200">
            {anomaly.streamB || (
              <span className="text-zinc-600 italic">empty</span>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-400"
            // biome-ignore lint/a11y/noAutofocus: intentional — focus edit field when user clicks Edit
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              onEdit(editValue);
              setIsEditing(false);
            }}
            className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600 transition-colors"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {anomaly.streamA && (
            <button
              type="button"
              onClick={() => onResolve(anomaly.streamA)}
              className="flex-1 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/30 px-3 py-1.5 text-xs font-medium text-[#4ade80] hover:bg-[#4ade80]/25 transition-colors"
            >
              Use A
            </button>
          )}
          {anomaly.streamB && (
            <button
              type="button"
              onClick={() => onResolve(anomaly.streamB)}
              className="flex-1 rounded-md bg-[#f87171]/15 border border-[#f87171]/30 px-3 py-1.5 text-xs font-medium text-[#f87171] hover:bg-[#f87171]/25 transition-colors"
            >
              Use B
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditValue(anomaly.streamA || anomaly.streamB);
              setIsEditing(true);
            }}
            className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
