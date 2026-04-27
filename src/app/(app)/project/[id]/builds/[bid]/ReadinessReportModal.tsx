"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Play, ArrowRight, ShieldAlert, Zap, Target, FileText, Sparkles, RefreshCw } from "lucide-react";
import { Button, AIBadge, Skeleton, AIOutputBox } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

type ReadinessReport = {
  score: number;
  confidence: "high" | "medium" | "low";
  report: {
    recommendation: "GO" | "NO-GO";
    reason: string;
    blockers: string[];
    risks: string[];
    wins: string[];
    next_steps: string[];
  };
  regression_flags: any[];
  resolved_count: number;
};

type ReadinessReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  buildId: string;
  versionName: string;
  onPromote: () => void;
};

export function ReadinessReportModal({ 
  isOpen, 
  onClose, 
  projectId, 
  buildId, 
  versionName,
  onPromote 
}: ReadinessReportModalProps) {
  const [data, setData] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Changelog State
  const [changelog, setChangelog] = useState<string | null>(null);
  const [isGeneratingChangelog, setIsGeneratingChangelog] = useState(false);
  const [currentTone, setCurrentTone] = useState<"technical" | "player" | "marketing">("player");
  const [isShiftingTone, setIsShiftingTone] = useState(false);
  const [cachedTones, setCachedTones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, buildId]);

  const generateChangelog = async () => {
    try {
      setIsGeneratingChangelog(true);
      const res = await fetch(`/api/builds/${buildId}/ai/changelog`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate changelog");
      const json = await res.json();
      
      const text = `## Features\n${json.data.features.length ? json.data.features.map((f: string) => `- ${f}`).join('\n') : "No major features"}\n\n## Improvements\n${json.data.improvements.length ? json.data.improvements.map((i: string) => `- ${i}`).join('\n') : "General performance improvements"}\n\n## Bug Fixes\n${json.data.bugFixes.length ? json.data.bugFixes.map((b: string) => `- ${b}`).join('\n') : "Minor bug fixes and stability improvements"}`;
      
      setChangelog(text);
      setCachedTones({ player: text });
      setCurrentTone("player");
      showToast("Draft changelog generated!", "success");
    } catch (e) {
      showToast("Changelog generation failed", "error");
    } finally {
      setIsGeneratingChangelog(false);
    }
  };

  const shiftTone = async (newTone: typeof currentTone) => {
    if (!changelog || isShiftingTone) return;
    if (cachedTones[newTone]) {
      setChangelog(cachedTones[newTone]);
      setCurrentTone(newTone);
      return;
    }

    try {
      setIsShiftingTone(true);
      const res = await fetch("/api/ai/changelog-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changelog_content: changelog,
          tone: newTone,
          build_version: versionName
        })
      });
      if (!res.ok) throw new Error("Tone shift failed");
      const json = await res.json();
      setChangelog(json.content);
      setCachedTones(prev => ({ ...prev, [newTone]: json.content }));
      setCurrentTone(newTone);
      showToast(`Tone shifted to ${newTone}!`, "success");
    } catch (e) {
      showToast("Failed to shift tone", "error");
    } finally {
      setIsShiftingTone(false);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/builds/${buildId}/ai/readiness-report`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to generate readiness report");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const scoreColor = data ? (data.score >= 80 ? "var(--green)" : data.score >= 50 ? "var(--yellow)" : "var(--coral)") : "gray";
  const scoreText = data ? (data.score >= 80 ? "EXCELLENT" : data.score >= 50 ? "CAUTION" : "CRITICAL") : "";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[680px] max-h-[90vh] overflow-y-auto border-[3px] border-black bg-[var(--cream)] shadow-[12px_12px_0px_#000] rounded-2xl animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-black bg-white p-6">
          <div className="flex items-center gap-3">
            <AIBadge label="Readiness Analysis" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Release Report</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-black rounded-lg hover:bg-[var(--coral)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-10">
          {loading ? (
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <Skeleton height={100} width={100} className="rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton height={24} width="60%" />
                  <Skeleton height={40} width="40%" />
                </div>
              </div>
              <Skeleton height={200} className="rounded-xl" />
              <Skeleton height={200} className="rounded-xl" />
            </div>
          ) : error ? (
            <div className="rounded-xl border-2 border-[var(--coral)] bg-[#fff4ef] p-8 text-center space-y-4">
              <AlertTriangle size={48} className="mx-auto text-[var(--coral)]" />
              <h3 className="text-xl font-black uppercase">Report Failed</h3>
              <p className="ms-mono text-sm font-bold opacity-60">{error}</p>
              <Button variant="dark" onClick={fetchReport}>Retry Generation</Button>
            </div>
          ) : data && (
            <>
              {/* Confidence & Score Hero */}
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div 
                  className="relative flex h-32 w-32 items-center justify-center rounded-3xl border-[4px] border-black shadow-[6px_6px_0px_#000]"
                  style={{ background: scoreColor }}
                >
                  <span className="text-4xl font-black">{data.score}</span>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 border-2 border-black bg-black text-white ms-mono text-[9px] font-black whitespace-nowrap">
                    CONFIDENCE: {data.score}%
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">{versionName}</h3>
                    <div 
                      className={`px-3 py-1 rounded-full border-2 border-black text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_#000] ${
                        data.report.recommendation === "GO" ? "bg-[var(--green)]" : "bg-[var(--coral)] text-white"
                      }`}
                    >
                      {data.report.recommendation === "GO" ? "READY FOR MAIN" : "NOT READY"}
                    </div>
                  </div>
                  <p className="ms-mono text-sm font-bold opacity-50 uppercase tracking-widest">
                    Build Health Status: <span style={{ color: scoreColor }}>{scoreText}</span>
                  </p>
                </div>
              </div>

              {/* Report Sections */}
              <div className="grid grid-cols-1 gap-6">
                {/* Recommendation summary */}
                <section className="rounded-xl border-[2.5px] border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-40 ms-mono mb-4">
                    <Target size={14} /> Executive Recommendation
                  </h4>
                  <p className="text-lg font-bold leading-tight">
                    {data.report.recommendation === "GO" 
                      ? "This build has passed all core quality gates and shows positive community sentiment. Recommended for promotion."
                      : "Critical quality gates have failed. Major blockers or regressions detected. Delay promotion until addressed."}
                  </p>
                </section>

                {/* Blockers */}
                {data.report.blockers.length > 0 && (
                  <section className="rounded-xl border-[2.5px] border-black bg-[#fff4ef] p-6 shadow-[4px_4px_0px_var(--coral)]">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--coral)] ms-mono mb-4">
                      <ShieldAlert size={14} /> Critical Blockers
                    </h4>
                    <ul className="space-y-3">
                      {data.report.blockers.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-bold">
                          <span className="mt-1 text-[var(--coral)]">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Wins & Risks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <section className="rounded-xl border-[2.5px] border-black bg-[var(--green)]/10 p-6 shadow-[4px_4px_0px_#000]">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--green)] ms-mono mb-4">
                      <Zap size={14} /> Key Wins
                    </h4>
                    <ul className="space-y-2">
                      {data.report.wins.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] font-bold">
                          <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-xl border-[2.5px] border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--coral)] ms-mono mb-4">
                      <AlertTriangle size={14} /> Remaining Risks
                    </h4>
                    <ul className="space-y-2">
                      {data.report.risks.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] font-bold">
                          <span className="text-[var(--coral)] font-black">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {/* Regression Flags */}
                {data.regression_flags && data.regression_flags.length > 0 && (
                  <section className="rounded-xl border-[2.5px] border-black bg-[var(--yellow)]/10 p-6 shadow-[4px_4px_0px_#000]">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#886600] ms-mono mb-4">
                      <ShieldAlert size={14} /> Potential Regressions
                    </h4>
                    <div className="space-y-3">
                      {data.regression_flags.map((flag: any) => (
                        <div key={flag.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase opacity-40 ms-mono mb-0.5">Matched with {flag.matched_resolved_title}</p>
                            <p className="text-sm font-bold truncate">{flag.open_issue_title}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <div className="px-1.5 py-0.5 bg-black text-white text-[9px] font-black ms-mono rounded">
                                 {Math.round(flag.similarity_score * 100)}% MATCH
                               </div>
                               <span className="text-[9px] font-bold opacity-40 uppercase">Resolved in {flag.resolved_in_build_version}</span>
                            </div>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-[10px]"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/builds/${buildId}/regression-flags/${flag.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ dismissed: true })
                                });
                                if (res.ok) {
                                  showToast("Regression flag dismissed", "success");
                                  // Refresh report to update score
                                  fetchReport();
                                }
                              } catch (e) {
                                showToast("Failed to dismiss flag", "error");
                              }
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Next Steps */}
                <section className="rounded-xl border-[2.5px] border-black bg-black p-6 text-[var(--cream)] shadow-[4px_4px_0px_#888]">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-40 ms-mono mb-4">
                    <Play size={14} /> Strategic Next Steps
                  </h4>
                  <div className="space-y-3">
                    {data.report.next_steps.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--cream)] text-[10px] font-black">
                          {i + 1}
                        </div>
                        <p className="text-xs font-bold">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* STEP 15: AI Changelog Generator */}
                <section className="rounded-xl border-[2.5px] border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-40 ms-mono">
                      <FileText size={14} /> Step 15: AI Changelog
                    </h4>
                    {!changelog && (
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={generateChangelog}
                        disabled={isGeneratingChangelog}
                      >
                        {isGeneratingChangelog ? (
                          <RefreshCw size={14} className="mr-2 animate-spin" />
                        ) : (
                          <Sparkles size={14} className="mr-2" />
                        )}
                        Generate Draft
                      </Button>
                    )}
                  </div>

                  {changelog ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 bg-black/5 rounded-lg border-2 border-black">
                        <div className="flex gap-1">
                          {(["technical", "player", "marketing"] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => shiftTone(t)}
                              disabled={isShiftingTone}
                              className={`
                                px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
                                ${currentTone === t 
                                  ? "bg-black text-white shadow-[2px_2px_0px_var(--yellow)]" 
                                  : "hover:bg-black/10 opacity-60"}
                                ${isShiftingTone && currentTone !== t ? "opacity-20 cursor-not-allowed" : ""}
                              `}
                            >
                              {t}
                              {cachedTones[t] && t !== currentTone && " ✓"}
                            </button>
                          ))}
                        </div>
                        {isShiftingTone && <RefreshCw size={12} className="animate-spin text-black/40 mr-2" />}
                      </div>

                      <div className="relative group">
                        <AIBadge label={`${currentTone.toUpperCase()} TONE (AI)`} className="absolute -top-3 -left-2 z-10" />
                        <textarea
                          className="w-full min-h-[300px] rounded-xl border-2 border-black p-6 pt-8 font-semibold text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-[var(--yellow)]/20 transition-all bg-[var(--cream)]/30"
                          value={changelog}
                          onChange={(e) => setChangelog(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-bold opacity-40 ms-mono uppercase tracking-[0.1em]">
                           Generated from resolved issues & build notes
                         </p>
                         <button 
                           onClick={() => {
                             setChangelog(null);
                             setCachedTones({});
                           }}
                           className="text-[10px] font-black uppercase tracking-widest hover:text-[var(--coral)] transition-colors"
                         >
                           Reset
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 border-2 border-dashed border-black/10 rounded-xl flex flex-col items-center justify-center text-center px-6">
                       <FileText size={40} className="text-black/10 mb-4" />
                       <p className="text-sm font-bold opacity-40 max-w-[300px]">
                         Click generate to create a draft changelog based on the 
                         <span className="text-black"> {data.resolved_count} issues </span> 
                         resolved in this build.
                       </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t-[3px] border-black bg-white p-6 flex gap-3">
          <Button 
            variant="primary" 
            className="flex-1 h-14 text-lg"
            onClick={onPromote}
            disabled={loading || !!error || data?.report.recommendation !== "GO"}
          >
            Promote to Main Build
            <ArrowRight size={20} className="ml-2" />
          </Button>
          <Button 
            variant="secondary" 
            className="px-8 h-14"
            onClick={onClose}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
