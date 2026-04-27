"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import { 
  AIBadge, 
  AIOutputBox, 
  Button, 
  LabelBadge, 
  MonoBadge,
  Skeleton,
  EmptyState,
  ErrorCard
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { X, AlertTriangle, RefreshCw } from "lucide-react";

type PageProps = {
  params: {
    id: string;
  };
};

type Build = {
  id: string;
  project_id: string;
  version_name: string;
  label: "main" | "testing" | "experimental" | "archived";
  upload_type: "file" | "folder" | "link";
  file_path: string | null;
  external_link: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

type BuildDetail = {
  build: Build;
  linked_issues: Array<{ id: string; status: string }>;
  feedback_summary: {
    total: number;
    avg_rating: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  promotion_history: Array<{
    id: string;
    from_label: string;
    to_label: string;
    promoted_at: string;
  }>;
  ai_summary: { output_text: string; is_stale: number } | null;
  regression_flags: Array<{ id: string; dismissed: number }>;
};

type Tab = "all" | "main" | "testing" | "experimental" | "archived";

type UploadState = {
  versionName: string;
  label: "main" | "testing" | "experimental" | "archived";
  notes: string;
  uploadType: "file" | "link";
  externalLink: string;
  file: File | null;
};

const TAB_OPTIONS: Array<{ key: Tab; label: string; activeBg: string }> = [
  { key: "all", label: "All", activeBg: "var(--yellow)" },
  { key: "main", label: "● Main", activeBg: "var(--yellow)" },
  { key: "testing", label: "● Testing", activeBg: "var(--green)" },
  { key: "experimental", label: "● Experimental", activeBg: "var(--purple)" },
  { key: "archived", label: "Archived", activeBg: "#d6d6d6" },
];

const DEFAULT_UPLOAD_STATE: UploadState = {
  versionName: "",
  label: "experimental",
  notes: "",
  uploadType: "file",
  externalLink: "",
  file: null,
};

function timeShort(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function fileTypeLabel(build: Build) {
  if (build.upload_type === "link") return "LINK";
  if (build.file_path?.toLowerCase().endsWith(".apk")) return "APK";
  if (build.file_path?.toLowerCase().endsWith(".exe")) return "EXE";
  if (build.file_path?.toLowerCase().endsWith(".zip")) return "ZIP";
  if (build.file_path?.toLowerCase().endsWith(".rar")) return "RAR";
  if (build.file_path?.toLowerCase().endsWith(".app")) return "APP";
  return build.upload_type.toUpperCase();
}

// Optimized BuildCard with React.memo
const BuildCard = memo(({ 
  detail, 
  onGenerateAI, 
  aiBusy, 
  onPromote, 
  promoteBusy, 
  projectId 
}: { 
  detail: BuildDetail; 
  onGenerateAI: (id: string) => void;
  aiBusy: boolean;
  onPromote: (build: Build, toLabel: "main" | "testing") => void;
  promoteBusy: boolean;
  projectId: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const build = detail.build;
  const notes = build.notes || "No notes provided.";
  const shownNotes = expanded || notes.length <= 140 ? notes : `${notes.slice(0, 140)}...`;
  const openIssues = detail.linked_issues.filter((issue) => issue.status !== "resolved").length;
  const resolvedIssues = detail.linked_issues.filter((issue) => issue.status === "resolved").length;

  return (
    <article
      className={`grid grid-cols-1 gap-3 rounded-lg border-2 border-black bg-white p-3 lg:grid-cols-[5px_minmax(0,1fr)_200px_140px] ${
        build.label === "main" ? "bg-[var(--yellow)] shadow-[4px_4px_0px_#0d0d0d]" : ""
      } ${build.label === "archived" ? "opacity-65 grayscale-[0.5]" : ""}`}
    >
      <div
        className="hidden rounded lg:block"
        style={{
          background:
            build.label === "main"
              ? "var(--yellow)"
              : build.label === "testing"
                ? "var(--green)"
                : build.label === "experimental"
                  ? "var(--purple)"
                  : "#c7c7c7",
        }}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="ms-mono text-2xl font-bold">{build.version_name}</h3>
          <LabelBadge label={build.label} />
          <MonoBadge label={fileTypeLabel(build)} />
          {detail.regression_flags?.length > 0 && (
            <div className="flex items-center gap-1 rounded-full border-2 border-black bg-[var(--coral)] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-[2px_2px_0px_#000]">
              <AlertTriangle size={12} />
              <span>{detail.regression_flags.length} Regressions</span>
            </div>
          )}
          {!detail.ai_summary && (
            <Button 
              size="sm" 
              variant="dark" 
              onClick={() => onGenerateAI(build.id)}
              disabled={aiBusy}
            >
              {aiBusy ? "Generating..." : "Generate Summary"}
            </Button>
          )}
        </div>
        <button
          type="button"
          className="text-left text-sm opacity-80 leading-relaxed"
          onClick={() => setExpanded(!expanded)}
        >
          {shownNotes}
          {notes.length > 140 && !expanded && <span className="ml-1 text-[var(--coral)] font-bold">Read more</span>}
        </button>

        {detail.ai_summary && (
          <div className="space-y-2">
            {detail.ai_summary.is_stale ? (
              <div className="flex items-center justify-between rounded border-2 border-black bg-[var(--yellow)] p-2 text-xs font-semibold">
                <span>⚠️ This data has changed since this summary was generated.</span>
                <button 
                  className="underline hover:text-black/70"
                  onClick={() => onGenerateAI(build.id)}
                  disabled={aiBusy}
                >
                  {aiBusy ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            ) : null}
            <AIOutputBox>{detail.ai_summary.output_text}</AIOutputBox>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-[#666] ms-mono">
          <span>{timeShort(build.created_at)}</span>
          <span>By: {build.created_by}</span>
          {detail.promotion_history[0] && (
            <span>Promoted: {timeShort(detail.promotion_history[0].promoted_at)}</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border-[2px] border-black bg-black/[0.03] p-3 flex flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">Build Stats</p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Bugs Fixed</span>
            <span className="font-bold text-[var(--green)]">{resolvedIssues}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Open Issues</span>
            <span className="font-bold text-[var(--coral)]">{openIssues}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Feedback</span>
            <span className="font-bold">{detail.feedback_summary.total || 0}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 justify-center">
        {(build.label === "main" || build.label === "archived") && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              if (build.upload_type === "link" && build.external_link) {
                window.open(build.external_link, "_blank", "noopener,noreferrer");
              } else {
                window.location.href = `/api/builds/${build.id}/download`;
              }
            }}
          >
            {build.upload_type === "link" ? "Open Link" : "Download"}
          </Button>
        )}
        {build.label === "testing" && (
          <Button
            className="w-full"
            variant="primary"
            disabled={promoteBusy}
            onClick={() => onPromote(build, "main")}
          >
            Promote
          </Button>
        )}
        {build.label === "experimental" && (
          <Button
            className="w-full"
            variant="primary"
            disabled={promoteBusy}
            onClick={() => onPromote(build, "testing")}
          >
            Promote
          </Button>
        )}
        <Link href={`/project/${projectId}/builds/${build.id}`} className="w-full">
          <Button className="w-full" variant="dark">Details</Button>
        </Link>
      </div>
    </article>
  );
});

BuildCard.displayName = "BuildCard";

export default function ProjectBuildsPage({ params }: PageProps) {
  const { showToast } = useToast();
  const [buildDetails, setBuildDetails] = useState<BuildDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>(DEFAULT_UPLOAD_STATE);
  const [compareOpen, setCompareOpen] = useState(false);
  const [promoteBusy, setPromoteBusy] = useState<string | null>(null);
  const [conflictModal, setConflictModal] = useState<{
    build: Build;
    toLabel: "main" | "testing";
    conflictingBuild: Build;
  } | null>(null);
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});
  const [isExpanding, setIsExpanding] = useState(false);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [project, setProject] = useState<{ genre: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then(res => res.json())
      .then(data => setProject(data.project));
  }, [params.id]);

  const fetchBuilds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const buildsRes = await fetch(`/api/projects/${params.id}/builds?limit=100`);
      if (!buildsRes.ok) throw new Error("Failed to load builds");
      
      const buildsData = await buildsRes.json();
      const builds = (buildsData.data || []) as Build[];
      
      const detailResponses = await Promise.all(
        builds.map(async (build) => {
          const response = await fetch(`/api/builds/${build.id}`);
          if (!response.ok) return {
            build,
            linked_issues: [],
            feedback_summary: { total: 0, avg_rating: 0, positive: 0, neutral: 0, negative: 0 },
            promotion_history: [],
            ai_summary: null,
            regression_flags: [],
          } as BuildDetail;
          
          const detail = await response.json();
          return {
            build,
            linked_issues: detail.linked_issues || [],
            feedback_summary: detail.feedback_summary || { total: 0, avg_rating: 0, positive: 0, neutral: 0, negative: 0 },
            promotion_history: detail.promotion_history || [],
            ai_summary: detail.ai_summary || null,
            regression_flags: detail.regression_flags || [],
          } as BuildDetail;
        })
      );
      setBuildDetails(detailResponses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load builds");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBuilds();
  }, [fetchBuilds]);

  const uploaderOptions = useMemo(() => {
    return [...new Set(buildDetails.map((detail) => detail.build.created_by))];
  }, [buildDetails]);

  const filteredBuilds = useMemo(() => {
    return buildDetails.filter((detail) => {
      const tabPass = activeTab === "all" ? true : detail.build.label === activeTab;
      const uploaderPass = uploaderFilter === "all" ? true : detail.build.created_by === uploaderFilter;
      return tabPass && uploaderPass;
    });
  }, [activeTab, buildDetails, uploaderFilter]);

  const grouped = useMemo(() => {
    return {
      main: filteredBuilds.filter((item) => item.build.label === "main"),
      testing: filteredBuilds.filter((item) => item.build.label === "testing"),
      experimental: filteredBuilds.filter((item) => item.build.label === "experimental"),
      archived: filteredBuilds.filter((item) => item.build.label === "archived"),
    };
  }, [filteredBuilds]);

  const hasMain = buildDetails.some((detail) => detail.build.label === "main");
  const hasTesting = buildDetails.some((detail) => detail.build.label === "testing");

  async function promoteBuild(build: Build, toLabel: "main" | "testing", confirm = false) {
    try {
      setPromoteBusy(build.id);
      const response = await fetch(`/api/builds/${build.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_label: toLabel, confirm }),
      });

      if (response.status === 409) {
        const conflict = await response.json();
        setConflictModal({
          build,
          toLabel,
          conflictingBuild: conflict.conflicting_build as Build,
        });
        return;
      }

      if (!response.ok) throw new Error("Failed to promote build");

      setConflictModal(null);
      showToast(`${build.version_name} promoted to ${toLabel}!`, "success");
      await fetchBuilds();
    } catch (promoteError) {
      showToast(promoteError instanceof Error ? promoteError.message : "Promotion failed", "error");
    } finally {
      setPromoteBusy(null);
    }
  }

  async function generateAISummary(buildId: string) {
    try {
      setAiBusy((prev) => ({ ...prev, [buildId]: true }));
      const res = await fetch(`/api/builds/${buildId}/ai/summary?regenerate=true`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("AI Summary failed");
      showToast("AI Summary updated!", "success");
      await fetchBuilds();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI Action failed", "error");
    } finally {
      setAiBusy((prev) => ({ ...prev, [buildId]: false }));
    }
  }

  async function expandNotesWithAI() {
    if (!uploadState.notes.trim() || isExpanding) return;

    try {
      setIsExpanding(true);
      const res = await fetch("/api/ai/expand-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_notes: uploadState.notes,
          version_name: uploadState.versionName || "Unknown",
          project_genre: project?.genre || "Game",
        }),
      });

      if (!res.ok) throw new Error("AI expansion failed");
      const data = await res.json();
      
      setOriginalNotes(uploadState.notes);
      setUploadState({ ...uploadState, notes: data.expanded });
      showToast("Notes expanded with AI!", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI Action failed", "error");
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleUploadSubmit() {
    if (!uploadState.versionName.trim()) {
      showToast("Version name is required", "error");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      if (uploadState.uploadType === "file") {
        if (!uploadState.file) {
          showToast("File is required", "error");
          return;
        }

        const formData = new FormData();
        formData.append("file", uploadState.file);
        formData.append("versionName", uploadState.versionName);
        formData.append("label", uploadState.label);
        formData.append("notes", uploadState.notes);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/projects/${params.id}/builds/upload`);
        
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.send(formData);
        });
      } else {
        const res = await fetch(`/api/projects/${params.id}/builds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version_name: uploadState.versionName,
            label: uploadState.label,
            notes: uploadState.notes || null,
            upload_type: "link",
            external_link: uploadState.externalLink,
          }),
        });
        if (!res.ok) throw new Error("Failed to create build");
      }

      showToast("Build uploaded successfully!", "success");
      setUploadOpen(false);
      setUploadState(DEFAULT_UPLOAD_STATE);
      await fetchBuilds();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorCard resource="builds" onRetry={fetchBuilds} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Build Timeline</h1>
          <p className="ms-mono text-sm opacity-50 mt-1">Manage version promotions and feedback</p>
        </div>
        <Button variant="primary" onClick={() => setUploadOpen(true)} className="h-12 px-8">
          Upload Build
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                rounded-full border-[2.5px] border-black px-4 py-1.5 text-sm font-bold transition-all
                ${activeTab === tab.key ? "shadow-[2px_2px_0px_#0d0d0d]" : "bg-white hover:bg-black/5"}
              `}
              style={{ background: activeTab === tab.key ? tab.activeBg : undefined }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className="rounded-lg border-[2.5px] border-black bg-white px-4 py-2 text-sm font-bold ms-mono focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
          value={uploaderFilter}
          onChange={(e) => setUploaderFilter(e.target.value)}
        >
          <option value="all">Uploaded by: All</option>
          {uploaderOptions.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={180} className="w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {filteredBuilds.length === 0 ? (
            <EmptyState 
              emoji="📦" 
              message="No builds yet" 
              subtext="Upload your first build to get started."
              action={<Button variant="primary" onClick={() => setUploadOpen(true)}>Upload Now</Button>}
            />
          ) : (
            <>
              {grouped.main.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 bg-[var(--yellow)] rounded-full border border-black" />
                    Current Release
                  </h2>
                  {grouped.main.map(detail => (
                    <BuildCard 
                      key={detail.build.id} 
                      detail={detail} 
                      projectId={params.id}
                      aiBusy={aiBusy[detail.build.id]}
                      onGenerateAI={generateAISummary}
                      promoteBusy={promoteBusy === detail.build.id}
                      onPromote={promoteBuild}
                    />
                  ))}
                </section>
              )}

              {grouped.testing.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 bg-[var(--green)] rounded-full border border-black" />
                    In Testing
                  </h2>
                  {grouped.testing.map(detail => (
                    <BuildCard 
                      key={detail.build.id} 
                      detail={detail} 
                      projectId={params.id}
                      aiBusy={aiBusy[detail.build.id]}
                      onGenerateAI={generateAISummary}
                      promoteBusy={promoteBusy === detail.build.id}
                      onPromote={promoteBuild}
                    />
                  ))}
                </section>
              )}

              {grouped.experimental.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 bg-[var(--purple)] rounded-full border border-black" />
                    Experimental
                  </h2>
                  {grouped.experimental.map(detail => (
                    <BuildCard 
                      key={detail.build.id} 
                      detail={detail} 
                      projectId={params.id}
                      aiBusy={aiBusy[detail.build.id]}
                      onGenerateAI={generateAISummary}
                      promoteBusy={promoteBusy === detail.build.id}
                      onPromote={promoteBuild}
                    />
                  ))}
                </section>
              )}

              {grouped.archived.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 opacity-50">
                    <span className="w-3 h-3 bg-gray-400 rounded-full border border-black" />
                    Archived
                  </h2>
                  <div className="space-y-4">
                    {grouped.archived.map(detail => (
                      <BuildCard 
                        key={detail.build.id} 
                        detail={detail} 
                        projectId={params.id}
                        aiBusy={aiBusy[detail.build.id]}
                        onGenerateAI={generateAISummary}
                        promoteBusy={promoteBusy === detail.build.id}
                        onPromote={promoteBuild}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Conflict Modal */}
      {conflictModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border-[2.5px] border-black bg-white p-8 shadow-[8px_8px_0px_#0d0d0d] animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black uppercase">Promotion Conflict</h3>
            <p className="mt-4 text-sm font-bold opacity-70 leading-relaxed">
              Build <span className="ms-mono text-black font-black">{conflictModal.conflictingBuild.version_name}</span> is currently <span className="ms-mono uppercase">{conflictModal.toLabel}</span>. 
              Archive it and promote <span className="ms-mono text-black font-black">{conflictModal.build.version_name}</span>?
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="secondary" onClick={() => setConflictModal(null)} className="h-12 px-6">
                Cancel
              </Button>
              <Button
                variant="primary"
                className="h-12 px-6"
                onClick={() => promoteBuild(conflictModal.build, conflictModal.toLabel, true)}
              >
                Archive and Promote
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (Simplified for brevity in thought, but full implementation intended) */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-[500px] overflow-y-auto border-l-[2.5px] border-black bg-[var(--cream)] p-8 animate-in slide-in-from-right duration-300">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Upload Build</h3>
              <button
                type="button"
                className="p-2 border-[2.5px] border-black bg-white hover:bg-[var(--coral)] transition-colors"
                onClick={() => setUploadOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Version Name</label>
                <input
                  className={`w-full h-12 rounded-lg border-[2.5px] border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)] transition-colors ${
                    !uploadState.versionName.trim() && uploading ? "border-[var(--coral)] bg-[var(--coral)]/5" : ""
                  }`}
                  placeholder="e.g. v1.2.4-alpha"
                  value={uploadState.versionName}
                  onChange={(e) => setUploadState({...uploadState, versionName: e.target.value})}
                />
                {!uploadState.versionName.trim() && uploading && (
                  <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider">
                    Version name is required
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Target Label</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["main", "testing", "experimental", "archived"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setUploadState({...uploadState, label: l})}
                      className={`
                        h-12 rounded-lg border-[2.5px] border-black font-bold text-xs uppercase transition-all
                        ${uploadState.label === l ? "bg-[var(--yellow)] shadow-[2px_2px_0px_#0d0d0d]" : "bg-white"}
                      `}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Release Notes</label>
                  <div className="flex gap-2">
                    {originalNotes && (
                      <button
                        onClick={() => {
                          setUploadState({ ...uploadState, notes: originalNotes });
                          setOriginalNotes(null);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-[var(--coral)] hover:underline"
                      >
                        ↩ Revert
                      </button>
                    )}
                    <button
                      disabled={!uploadState.notes.trim() || isExpanding}
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
                </div>
                <textarea
                  className="w-full min-h-[120px] rounded-lg border-[2.5px] border-black p-4 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  placeholder="What's new in this build?"
                  value={uploadState.notes}
                  onChange={(e) => setUploadState({...uploadState, notes: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={uploadState.uploadType === "file" ? "primary" : "secondary"}
                    onClick={() => setUploadState({...uploadState, uploadType: "file"})}
                  >
                    File
                  </Button>
                  <Button
                    variant={uploadState.uploadType === "link" ? "primary" : "secondary"}
                    onClick={() => setUploadState({...uploadState, uploadType: "link"})}
                  >
                    Link
                  </Button>
                </div>
              </div>

              {uploadState.uploadType === "file" ? (
                <div className="space-y-2">
                  <label className={`flex flex-col items-center justify-center h-32 rounded-xl border-[2.5px] border-dashed transition-colors cursor-pointer ${
                    !uploadState.file && uploading ? "border-[var(--coral)] bg-[var(--coral)]/5" : "border-black/30 bg-black/[0.02]"
                  } hover:bg-[var(--yellow)]/10`}>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setUploadState({...uploadState, file: e.target.files?.[0] || null})}
                    />
                    <span className="font-black text-sm uppercase">{uploadState.file ? uploadState.file.name : "Select Binary"}</span>
                    <span className="text-[10px] ms-mono opacity-50 mt-1">.apk, .exe, .zip, .app</span>
                  </label>
                  {!uploadState.file && uploading && (
                    <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider text-center">
                      Binary file is required
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                   <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">External URL</label>
                   <input
                    className={`w-full h-12 rounded-lg border-[2.5px] border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)] transition-colors ${
                      !uploadState.externalLink.trim() && uploading ? "border-[var(--coral)] bg-[var(--coral)]/5" : ""
                    }`}
                    placeholder="https://drive.google.com/..."
                    value={uploadState.externalLink}
                    onChange={(e) => setUploadState({...uploadState, externalLink: e.target.value})}
                  />
                  {!uploadState.externalLink.trim() && uploading && (
                    <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider">
                      Valid URL is required
                    </p>
                  )}
                </div>
              )}

              {uploading && (
                <div className="w-full h-4 bg-black/10 rounded-full overflow-hidden border-[2px] border-black">
                  <div 
                    className="h-full bg-[var(--green)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <Button 
                className="w-full h-14 text-lg" 
                variant="primary" 
                onClick={handleUploadSubmit} 
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Complete Submission"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-using X from lucide-react (already imported above)
