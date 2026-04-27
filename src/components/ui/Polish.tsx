"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./index";

/**
 * Skeleton Loader with Shimmer Animation
 */
export function Skeleton({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={`animate-pulse rounded bg-slate-200 relative overflow-hidden before:absolute before:inset-0 before:translate-x-[-100%] before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent ${className}`}
      style={style}
    />
  );
}

/**
 * Consistent Empty State Component
 */
export function EmptyState({ 
  icon, 
  title, 
  subtext, 
  cta 
}: { 
  icon: string; 
  title: string; 
  subtext: string; 
  cta?: { label: string; onClick: () => void } 
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-slate-200 bg-slate-50/50 p-16 text-center">
      <div className="mb-6 text-7xl">{icon}</div>
      <h3 className="mb-2 text-2xl font-black uppercase tracking-tight">{title}</h3>
      <p className="mb-8 max-w-xs font-mono text-xs font-bold uppercase text-slate-400">{subtext}</p>
      {cta && (
        <Button variant="dark" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Error State Card with Retry
 */
export function ErrorCard({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void 
}) {
  return (
    <div className="rounded-2xl border-2 border-[var(--coral)] bg-[#fff4ef] p-8 shadow-[8px_8px_0px_0px_var(--coral)] space-y-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-[var(--coral)]" />
        <h4 className="text-xl font-black uppercase tracking-tight">System Error</h4>
      </div>
      <p className="font-mono text-xs font-bold uppercase text-slate-600">⚠️ {message}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry} 
          className="bg-white border-black"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> REATTEMPT FETCH
        </Button>
      )}
    </div>
  );
}

/**
 * Inline Form Error
 */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mt-2 rounded-lg border-2 border-[var(--coral)] bg-[#fff4ef] px-3 py-2 animate-in fade-in slide-in-from-top-1">
      <p className="font-mono text-[10px] font-black uppercase text-[var(--coral)]">{message}</p>
    </div>
  );
}
