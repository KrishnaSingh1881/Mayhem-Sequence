"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Button, 
  LabelBadge, 
  MonoBadge, 
  Skeleton, 
  EmptyState, 
  ErrorCard,
  AIBadge,
  AIOutputBox
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { AlertTriangle, ArrowLeft, ExternalLink, Download, CheckCircle2, MessageSquare, Bug, RefreshCw, X, ClipboardCheck } from "lucide-react";
import { ReadinessReportModal } from "./ReadinessReportModal";

type BuildDetailPageProps = {
  params: { id: string; bid: string };
};

type RegressionFlag = {
  id: string;
  project_id: string;
  build_id: string;
  open_issue_id: string;
  open_issue_title: string;
  matched_issue_id: string;
  matched_issue_title: string;
  matched_build_version: string;
  similarity_score: number;
  dismissed: number;
  created_at: string;
};

type BuildDetail = {
  build: {
    id: string;
    project_id: string;
    version_name: string;
    label: string;
    upload_type: string;
    file_path: string | null;
    external_link: string | null;
    notes: string | null;
    created_by: string;
    created_at: string;
  };
  linked_issues: Array<{
    id: string;
    title: string;
    status: string;
    category_tag: string;
    priority: string;
  }>;
  feedback_summary: {
    total: number;
    avg_rating: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  regression_flags: RegressionFlag[];
  ai_summary: { output_text: string } | null;
};

export default function BuildDetailPage({ params }: BuildDetailPageProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<BuildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [project, setProject] = useState<{ genre: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [res, meRes, membersRes] = await Promise.all([
        fetch(`/api/builds/${params.bid}`),
        fetch("/api/auth/me"),
        fetch(`/api/projects/${params.id}/members`)
      ]);

      if (!res.ok) throw new Error("Failed to load build details");
      const json = await res.json();
      setData(json);

      if (meRes.ok && membersRes.ok) {
        const meJson = await meRes.json();
        const membersJson = await membersRes.json();
        const user = meJson.user;
        const member = membersJson.members?.find((m: any) => m.user_id === user?.id);
        setRole(member?.role || null);
      }

      const projectRes = await fetch(`/api/projects/${params.id}`);
      if (projectRes.ok) {
        const projectJson = await projectRes.json();
        setProject(projectJson.project);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [params.bid, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveNotes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/builds/${params.bid}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingNotes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      
      showToast("Notes updated successfully", "success");
      setIsEditingNotes(false);
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const expandNotesWithAI = async () => {
    if (!editingNotes.trim() || isExpanding) return;

    try {
      setIsExpanding(true);
      const res = await fetch("/api/ai/expand-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_notes: editingNotes,
          version_name: data?.build.version_name || "Unknown",
          project_genre: project?.genre || "Game",
        }),
      });

      if (!res.ok) throw new Error("AI expansion failed");
      const json = await res.json();
      
      setOriginalNotes(editingNotes);
      setEditingNotes(json.expanded);
      showToast("Notes expanded with AI!", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI Action failed", "error");
    } finally {
      setIsExpanding(false);
    }
  };

  const handleDismiss = async (flagId: string) => {
    try {
      setDismissing(flagId);
      const res = await fetch(`/api/regression-flags/${flagId}/dismiss`, {
        method: "PATCH"
      });
      if (!res.ok) throw new Error("Failed to dismiss flag");
      
      showToast("Regression flag dismissed", "success");
      // Update local state
      setData(prev => prev ? {
        ...prev,
        regression_flags: prev.regression_flags.filter(f => f.id !== flagId)
      } : null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Dismissal failed", "error");
    } finally {
      setDismissing(null);
    }
  };

  const handlePromote = async () => {
    if (!window.confirm("Promote this build to MAIN? This will archive the existing main build.")) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/builds/${params.bid}/promote`, { method: "POST" });
      if (!res.ok) throw new Error("Promotion failed");
      
      showToast("Build promoted to MAIN!", "success");
      setReadinessModalOpen(false);
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Promotion failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Skeleton height={32} width={32} />
          <Skeleton height={40} width={300} />
        </div>
        <Skeleton height={200} className="rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height={150} className="rounded-xl" />
          <Skeleton height={150} className="rounded-xl" />
          <Skeleton height={150} className="rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <ErrorCard resource="build details" onRetry={fetchData} />
      </div>
    );
  }

  const { build, linked_issues, feedback_summary, regression_flags, ai_summary } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href={`/project/${params.id}/builds`}
          className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={16} />
          Back to Timeline
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black uppercase tracking-tighter">{build.version_name}</h1>
              <LabelBadge label={build.label as any} />
            </div>
            <p className="ms-mono text-sm opacity-50">Uploaded by {build.created_by} on {new Date(build.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            {(role === "admin" || role === "developer") && build.label === "testing" && (
              <Button variant="dark" className="h-12 px-6" onClick={() => setReadinessModalOpen(true)}>
                <ClipboardCheck size={18} className="mr-2" />
                Release Readiness
              </Button>
            )}
            {build.upload_type === "link" ? (
              <Button variant="primary" className="h-12 px-6" onClick={() => window.open(build.external_link!, "_blank")}>
                <ExternalLink size={18} className="mr-2" />
                Open External Link
              </Button>
            ) : (
              <Button variant="primary" className="h-12 px-6" onClick={() => window.location.href = `/api/builds/${build.id}/download`}>
                <Download size={18} className="mr-2" />
                Download Binary
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & Summary */}
        <div className="lg:col-span-2 space-y-8">
          {/* Notes */}
          <section className="rounded-xl border-[2.5px] border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest opacity-40 ms-mono">Release Notes</h2>
              {(role === "admin" || role === "developer") && (
                <div className="flex gap-2">
                  {isEditingNotes ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingNotes(false);
                          setOriginalNotes(null);
                        }}
                        className="text-xs font-bold opacity-60 hover:opacity-100 uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="text-xs font-bold text-[var(--green)] uppercase"
                      >
                        Save Notes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingNotes(build.notes || "");
                        setIsEditingNotes(true);
                      }}
                      className="text-xs font-bold opacity-60 hover:opacity-100 uppercase"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-2">
                  {originalNotes && (
                    <button
                      onClick={() => {
                        setEditingNotes(originalNotes);
                        setOriginalNotes(null);
                      }}
                      className="text-[10px] font-black uppercase tracking-wider text-[var(--coral)] hover:underline"
                    >
                      ↩ Revert
                    </button>
                  )}
                  <button
                    disabled={!editingNotes.trim() || isExpanding}
                    onClick={expandNotesWithAI}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-black text-white text-[10px] font-black uppercase tracking-wider hover:bg-[var(--yellow)] hover:text-black transition-colors disabled:opacity-30"
                  >
                    {isExpanding ? (
                      <RefreshCw size={10} className="animate-spin" />
                    ) : (
                      "✨ Expand with AI"
                    )}
                  </button>
                </div>
                <textarea
                  className="w-full min-h-[200px] rounded-lg border-2 border-black p-4 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Enter release notes..."
                />
              </div>
            ) : (
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{build.notes || "No notes provided for this build."}</p>
            )}
          </section>

          {/* Regression Flags */}
          {regression_flags.length > 0 && (
            <section className="rounded-xl border-[2.5px] border-black bg-[var(--coral)]/5 p-6 shadow-[4px_4px_0px_var(--coral)] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="text-[var(--coral)]" />
                <h2 className="text-xl font-black uppercase tracking-tight">Possible Regressions</h2>
              </div>
              
              <div className="space-y-3">
                {regression_flags.map(flag => (
                  <div key={flag.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border-2 border-black bg-white p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/project/${params.id}/issues?id=${flag.open_issue_id}`}
                          className="font-bold hover:underline"
                        >
                          {flag.open_issue_title}
                        </Link>
                        <span className="ms-mono text-[10px] font-black bg-black text-white px-1.5 py-0.5 rounded">
                          {Math.round(flag.similarity_score * 100)}% MATCH
                        </span>
                      </div>
                      <p className="text-xs opacity-60 font-medium">
                        Previously resolved in: <Link href={`/project/${params.id}/builds/${flag.matched_issue_id}`} className="underline font-bold">{flag.matched_build_version}</Link>
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleDismiss(flag.id)}
                      disabled={dismissing === flag.id}
                    >
                      {dismissing === flag.id ? "Dismissing..." : "Dismiss"}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] font-bold opacity-40 ms-mono uppercase tracking-widest">
                AI flagged these issues because they are similar to previously resolved bugs.
              </p>
            </section>
          )}

          {/* AI Summary */}
          {ai_summary && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AIBadge />
                <h2 className="text-xl font-black uppercase tracking-tight">AI Executive Summary</h2>
              </div>
              <AIOutputBox>{ai_summary.output_text}</AIOutputBox>
            </section>
          )}

          {/* Linked Issues */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Bug size={20} />
                Linked Issues ({linked_issues.length})
              </h2>
              <Link href={`/project/${params.id}/issues/new?build_id=${build.id}`}>
                <Button size="sm" variant="dark">Report Issue</Button>
              </Link>
            </div>
            
            {linked_issues.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-black/20 p-8 text-center bg-black/5">
                <p className="ms-mono text-sm opacity-50">No issues linked to this build yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {linked_issues.map(issue => (
                  <Link 
                    key={issue.id} 
                    href={`/project/${params.id}/issues?id=${issue.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border-2 border-black bg-white p-4 hover:shadow-[4px_4px_0px_#000] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${issue.status === "resolved" ? "bg-[var(--green)]" : "bg-[var(--coral)]"}`} />
                      <span className="font-bold group-hover:underline">{issue.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MonoBadge label={issue.category_tag} />
                      <MonoBadge label={issue.priority} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Stats & Meta */}
        <div className="space-y-6">
          <div className="rounded-xl border-[2.5px] border-black bg-[var(--yellow)] p-6 shadow-[4px_4px_0px_#000]">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-60 ms-mono mb-4">Build Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Bugs Fixed
                </span>
                <span className="text-2xl font-black">{linked_issues.filter(i => i.status === "resolved").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare size={16} />
                  Feedback
                </span>
                <span className="text-2xl font-black">{feedback_summary.total}</span>
              </div>
              <div className="pt-4 border-t border-black/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">Avg Rating</span>
                  <span className="text-sm font-black">{feedback_summary.avg_rating.toFixed(1)} / 5.0</span>
                </div>
                <div className="h-3 w-full bg-black/10 rounded-full overflow-hidden border border-black">
                  <div 
                    className="h-full bg-black transition-all"
                    style={{ width: `${(feedback_summary.avg_rating / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-[2.5px] border-black bg-white p-6 shadow-[4px_4px_0px_#000]">
            <h2 className="text-xs font-black uppercase tracking-widest opacity-60 ms-mono mb-4">Sentiment Split</h2>
            <div className="flex h-4 w-full rounded-full overflow-hidden border border-black">
              <div className="h-full bg-[var(--green)]" style={{ width: `${(feedback_summary.positive / feedback_summary.total) * 100 || 0}%` }} />
              <div className="h-full bg-gray-300" style={{ width: `${(feedback_summary.neutral / feedback_summary.total) * 100 || 0}%` }} />
              <div className="h-full bg-[var(--coral)]" style={{ width: `${(feedback_summary.negative / feedback_summary.total) * 100 || 0}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-black uppercase ms-mono">
              <div className="flex flex-col">
                <span className="text-[var(--green)]">Positive</span>
                <span>{feedback_summary.positive}</span>
              </div>
              <div className="flex flex-col text-center">
                <span className="text-gray-500">Neutral</span>
                <span>{feedback_summary.neutral}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[var(--coral)]">Negative</span>
                <span>{feedback_summary.negative}</span>
              </div>
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            className="w-full h-12"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <ReadinessReportModal 
        isOpen={readinessModalOpen}
        onClose={() => setReadinessModalOpen(false)}
        projectId={params.id}
        buildId={params.bid}
        versionName={build.version_name}
        onPromote={handlePromote}
      />
    </div>
  );
}
