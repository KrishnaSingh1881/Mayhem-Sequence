"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({ className = "", width, height, circle }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-[#0d0d0d]/5 border-[2px] border-black/5 ${className}`}
      style={{
        width: width,
        height: height,
        borderRadius: circle ? "50%" : "4px",
      }}
    />
  );
}

interface EmptyStateProps {
  emoji: string;
  message: string;
  subtext: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji, message, subtext, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 border-[2.5px] border-dashed border-black/20 rounded-lg text-center bg-black/[0.02]">
      <span className="text-6xl mb-6 grayscale opacity-80">{emoji}</span>
      <h3 className="text-xl font-bold mb-2">{message}</h3>
      <p className="ms-mono text-sm opacity-60 max-w-[300px] mx-auto mb-6">
        {subtext}
      </p>
      {action}
    </div>
  );
}

interface ErrorCardProps {
  resource: string;
  onRetry?: () => void;
}

export function ErrorCard({ resource, onRetry }: ErrorCardProps) {
  return (
    <div className="p-6 border-[2.5px] border-[#ff6b47] bg-[#ff6b47]/10 shadow-[4px_4px_0px_#ff6b47] flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-[#ff6b47]">
        <AlertTriangle size={24} />
        <span className="font-bold text-lg">⚠️ Failed to load {resource}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ms-btn bg-white px-4 py-2 text-sm font-bold ms-mono"
        >
          Retry?
        </button>
      )}
    </div>
  );
}
