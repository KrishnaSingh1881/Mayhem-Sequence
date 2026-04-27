"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

type SearchResult = {
  id: string;
  label: string;
  type: "Build" | "Issue" | "Feedback" | "Changelog";
  project_id: string;
  subtitle?: string;
};

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { id: projectId } = useParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ [key: string]: SearchResult[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatResults = Object.values(results).flat();

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults({});
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const navigateTo = (res: SearchResult) => {
    onClose();
    if (res.type === "Build") router.push(`/project/${res.project_id}/builds`);
    if (res.type === "Issue") router.push(`/project/${res.project_id}/issues`);
    if (res.type === "Feedback") router.push(`/project/${res.project_id}/feedback`);
    if (res.type === "Changelog") router.push(`/project/${res.project_id}/changelog`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatResults.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
      }
      if (e.key === "Enter" && flatResults[selectedIndex]) {
        e.preventDefault();
        navigateTo(flatResults[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm px-4">
      <div 
        className="w-full max-w-[640px] overflow-hidden rounded-xl border-2 border-black bg-white shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-black px-6 py-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search builds, issues, feedback..."
            className="w-full bg-transparent text-2xl font-bold font-syne placeholder-slate-300 outline-none"
          />
        </div>

        <div className="max-h-[480px] overflow-y-auto p-2">
          {loading && (
            <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">
              Searching project data...
            </div>
          )}

          {!loading && query.length > 0 && flatResults.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xl font-bold">No results found.</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Try a different keyword</p>
            </div>
          )}

          {!loading && Object.entries(results).map(([type, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={type} className="mb-4 last:mb-0">
                <h3 className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {type}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => {
                    const absIndex = flatResults.indexOf(item);
                    const isSelected = absIndex === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => navigateTo(item)}
                        onMouseEnter={() => setSelectedIndex(absIndex)}
                        className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${
                          isSelected ? "bg-[var(--yellow)] border-2 border-black -translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "hover:bg-slate-50 border-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xl">
                            {item.type === "Build" ? "📦" : item.type === "Issue" ? "🐛" : item.type === "Feedback" ? "💬" : "📜"}
                          </span>
                          <div>
                            <p className="text-sm font-bold leading-none">{item.label}</p>
                            {item.subtitle && (
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'block' : 'hidden'}`}>
                           ↵ ENTER
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {query.length === 0 && (
            <div className="py-12 text-center text-slate-400">
               <p className="text-sm font-bold italic">Start typing to search history...</p>
               <div className="mt-4 flex items-center justify-center gap-4">
                 <kbd className="rounded border-2 border-slate-200 px-2 py-1 text-[10px] font-black">ESC to Close</kbd>
                 <kbd className="rounded border-2 border-slate-200 px-2 py-1 text-[10px] font-black">↑↓ to Navigate</kbd>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
