"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  AIBadge,
  Button,
  MonoBadge,
  SentimentBadge,
  SentimentBar,
  StarDisplay,
  TagChip,
  Skeleton,
  EmptyState,
  ErrorCard,
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { X, ExternalLink, QrCode, Filter, BrainCircuit, Download, Copy, RefreshCw, Search } from "lucide-react";

type PageProps = {
  params: {
    id: string;
  };
};

type Build = {
  id: string;
  version_name: string;
  label: string;
};

type Feedback = {
  id: string;
  build_id: string;
  token_id: string | null;
  rating: number;
  sentiment: "positive" | "neutral" | "negative";
  category_tag: string;
  text_enjoy: string | null;
  text_broken: string | null;
  platform_played: string | null;
  source: string;
  created_at: string;
};

type FeedbackToken = {
  id: string;
  build_id: string;
  label: string | null;
  token: string;
  is_active: number;
  created_at: string;
  submission_count: number;
};

type SavedFilter = {
  id: string;
  name: string;
  filter_config: Record<string, string>;
};

type Role = "admin" | "developer" | "qa" | "player";

type ClusterItem = {
  id: string;
  title: string;
  submission_ids: string[];
  positive: number;
  neutral: number;
  negative: number;
  source: string;
};

type AISuggestion = {
  title: string;
  description: string;
  priority: "blocker" | "critical" | "high" | "medium" | "low";
  category_tag: string;
  platform_tag: string;
};

type SessionDebrief = {
  id: string;
  project_id: string;
  window_start: string;
  window_end: string;
  feedback_count: number;
  report_json: string;
  created_at: string;
};

type Filters = {
  sentiment: string;
  category: string;
  rating_min: string;
  rating_max: string;
  source: string;
  q: string;
};

const DEFAULT_FILTERS: Filters = {
  sentiment: "all",
  category: "all",
  rating_min: "1",
  rating_max: "5",
  source: "all",
  q: "",
};

function previewText(entry: Feedback) {
  const text = entry.text_broken || entry.text_enjoy || "No text";
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function relativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Optimized components
const FeedbackRow = memo(({ 
  entry, 
  buildName, 
  onClick 
}: { 
  entry: Feedback; 
  buildName?: string; 
  onClick: () => void 
}) => (
  <tr
    className="cursor-pointer border-b border-[#ddd] hover:bg-[#fafafa] transition-colors"
    onClick={onClick}
  >
    <td className="px-4 py-3">
      <StarDisplay rating={Math.max(1, Math.min(5, entry.rating)) as 1 | 2 | 3 | 4 | 5} />
    </td>
    <td className="px-4 py-3">
      <SentimentBadge sentiment={entry.sentiment} />
    </td>
    <td className="px-4 py-3">
      <TagChip type="category" label={entry.category_tag} />
    </td>
    <td className="px-4 py-3 font-semibold text-sm">{previewText(entry)}</td>
    <td className="px-4 py-3">
      {entry.platform_played ? <TagChip type="platform" label={entry.platform_played} /> : "-"}
    </td>
    <td className="px-4 py-3">
      <MonoBadge label={entry.source} />
    </td>
    <td className="px-4 py-3">
      <MonoBadge label={buildName || entry.build_id.slice(0, 8)} />
    </td>
    <td className="px-4 py-3 text-xs font-black uppercase ms-mono opacity-50">{relativeTime(entry.created_at)}</td>
  </tr>
));
FeedbackRow.displayName = "FeedbackRow";

const PriorityDot = ({ priority }: { priority: "blocker" | "critical" | "high" | "medium" | "low" }) => {
  const colors = {
    blocker: "bg-red-600",
    critical: "bg-red-500",
    high: "bg-[var(--coral)]",
    medium: "bg-[var(--yellow)]",
    low: "bg-[var(--green)]"
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full border border-black/20 ${colors[priority] || "bg-gray-400"}`} />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 ms-mono">{priority}</span>
    </div>
  );
};

export default function ProjectFeedbackPage({ params }: PageProps) {
  const { showToast } = useToast();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState("");
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [tokens, setTokens] = useState<FeedbackToken[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [clusterItems, setClusterItems] = useState<ClusterItem[]>([]);
  const [clusterStale, setClusterStale] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [clusterFilterIds, setClusterFilterIds] = useState<string[] | null>(null);
  const [tokenPanelOpen, setTokenPanelOpen] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkBuildId, setLinkBuildId] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [issueDrawerOpen, setIssueDrawerOpen] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueForm, setIssueForm] = useState<AISuggestion>({
    title: "",
    description: "",
    priority: "medium",
    category_tag: "Gameplay",
    platform_tag: "PC"
  });
  const [debriefModalOpen, setDebriefModalOpen] = useState(false);
  const [debriefStep, setDebriefStep] = useState(1);
  const [debriefWindow, setDebriefWindow] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [debriefResult, setDebriefResult] = useState<any | null>(null);
  const [debriefBusy, setDebriefBusy] = useState(false);
  const [pastDebriefs, setPastDebriefs] = useState<SessionDebrief[]>([]);
  const [showPastDebriefs, setShowPastDebriefs] = useState(false);

  const fetchSavedFilters = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/saved-filters?screen=feedback`);
    if (res.ok) {
      const data = await res.json();
      setSavedFilters((data.data || []) as SavedFilter[]);
    }
  }, [params.id]);

  const fetchTokens = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/tokens`);
    if (res.ok) {
      const data = await res.json();
      setTokens((data.data || []) as FeedbackToken[]);
    }
  }, [params.id]);

  const fetchFeedback = useCallback(async () => {
    const query = new URLSearchParams();
    if (selectedBuildId) query.set("build_id", selectedBuildId);
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") query.set(key, value);
    });
    query.set("limit", "200");
    const res = await fetch(`/api/projects/${params.id}/feedback?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to load feedback");
    const data = await res.json();
    setFeedback((data.data || []) as Feedback[]);
  }, [filters, params.id, selectedBuildId]);

  const fetchClusterData = useCallback(async (buildId: string) => {
    if (!buildId) {
      setClusterItems([]);
      setClusterStale(false);
      return;
    }
    const res = await fetch(`/api/builds/${buildId}`);
    if (!res.ok) return;
    const data = await res.json();
    const cluster = data.ai_cluster as { output_text: string; is_stale: number } | null;
    if (!cluster?.output_text) {
      setClusterItems([]);
      setClusterStale(false);
      return;
    }
    try {
      const parsed = JSON.parse(cluster.output_text);
      const rows = Array.isArray(parsed) ? parsed : parsed.clusters || [];
      setClusterItems(rows);
      setClusterStale(cluster.is_stale === 1);
    } catch {
      setClusterItems([]);
    }
  }, []);

  const fetchSuggestions = useCallback(async (buildId: string, force = false) => {
    if (!buildId) {
      setSuggestions([]);
      return;
    }
    try {
      setSuggestBusy(true);
      const res = await fetch(`/api/builds/${buildId}/ai/suggest-issues${force ? "?regenerate=true" : ""}`, {
        method: "POST"
      });
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.data?.suggestions || []);
    } catch (e) {
      showToast("Failed to fetch suggestions", "error");
      setSuggestions([]);
    } finally {
      setSuggestBusy(false);
    }
  }, [showToast]);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [buildsRes, meRes, membersRes] = await Promise.all([
        fetch(`/api/projects/${params.id}/builds?limit=100`),
        fetch("/api/auth/me"),
        fetch(`/api/projects/${params.id}/members`),
      ]);
      
      const buildsData = await buildsRes.json();
      const meData = await meRes.json();
      const membersData = await membersRes.json();

      const nextBuilds = (buildsData.data || []) as Build[];
      setBuilds(nextBuilds);
      const initialBuild = nextBuilds.find(b => b.label === "main") || nextBuilds[0];
      if (initialBuild) {
        setSelectedBuildId(initialBuild.id);
        setLinkBuildId(initialBuild.id);
        await Promise.all([
          fetchClusterData(initialBuild.id),
          fetchSuggestions(initialBuild.id)
        ]);
      }

      const me = meData.user;
      const memberRole = me ? (membersData.data || []).find((m: any) => m.user_id === me.id)?.role : null;
      setRole(memberRole || "admin");
      
      await Promise.all([fetchSavedFilters(), fetchTokens(), fetchFeedback(), fetchDebriefs()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchSavedFilters, fetchTokens, fetchFeedback, fetchClusterData]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Handle selectedBuildId change independently
  useEffect(() => {
    if (selectedBuildId) {
      fetchFeedback();
      fetchClusterData(selectedBuildId);
      fetchSuggestions(selectedBuildId);
    } else {
      fetchFeedback();
    }
  }, [selectedBuildId, filters, fetchFeedback, fetchClusterData, fetchSuggestions]);

  useEffect(() => {
    if (!generatedUrl) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(generatedUrl, { margin: 1, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [generatedUrl]);

  const sentiment = useMemo(() => {
    const pool = clusterFilterIds 
      ? feedback.filter(f => new Set(clusterFilterIds).has(f.id))
      : feedback;
    return pool.reduce(
      (acc, item) => {
        acc[item.sentiment] += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );
  }, [feedback, clusterFilterIds]);

  const visibleFeedback = useMemo(() => {
    if (!clusterFilterIds) return feedback;
    const set = new Set(clusterFilterIds);
    return feedback.filter((entry) => set.has(entry.id));
  }, [clusterFilterIds, feedback]);

  const buildNameById = useMemo(() => {
    const map = new Map<string, string>();
    builds.forEach((b) => map.set(b.id, b.version_name));
    return map;
  }, [builds]);

  async function generateClusters(regenerate = false) {
    if (!selectedBuildId) {
      showToast("Select a build first", "error");
      return;
    }
    try {
      setAiBusy(true);
      const res = await fetch(`/api/builds/${selectedBuildId}/ai/cluster${regenerate ? "?regenerate=true" : ""}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("AI Action failed");
      showToast(regenerate ? "Recalculating clusters..." : "Analyzing feedback...", "success");
      await fetchClusterData(selectedBuildId);
      // Automatically fetch suggestions after clusters are updated
      await fetchSuggestions(selectedBuildId, true);
    } catch (e) {
      showToast("Cluster analysis failed", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function generateLink() {
    if (!linkBuildId) {
      showToast("Select a build", "error");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${params.id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          build_id: linkBuildId,
          label: linkLabel || null,
        }),
      });
      if (!res.ok) throw new Error("Link generation failed");
      const data = await res.json();
      setGeneratedUrl(String(data.url || ""));
      showToast("Channel token generated", "success");
      await fetchTokens();
    } catch (e) {
      showToast("Failed to generate link", "error");
    }
  }

  async function createIssueFromSuggestion() {
    if (!issueForm.title.trim()) return;
    try {
      setCreatingIssue(true);
      const res = await fetch(`/api/projects/${params.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...issueForm,
          build_id: selectedBuildId || null,
          status: "open",
        }),
      });
      if (!res.ok) throw new Error("Failed to create issue");
      showToast("Issue created from suggestion!", "success");
      setIssueDrawerOpen(false);
      setSuggestions(prev => prev.filter(s => s.title !== issueForm.title));
    } catch (e) {
      showToast("Failed to create issue", "error");
    } finally {
      setCreatingIssue(false);
    }
  }

  if (error) return <div className="p-8"><ErrorCard resource="feedback" onRetry={loadPage} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Feedback Explorer</h1>
        <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setLinkModalOpen(true)} className="h-12 px-6 flex items-center gap-2">
              <QrCode size={18} /> Generate Link
            </Button>
            {role !== "player" && (
              <Button variant="dark" onClick={() => setDebriefModalOpen(true)} className="h-12 px-6 flex items-center gap-2">
                <span className="text-xl">📋</span> Debrief Session
              </Button>
            )}
            {role === "admin" && (
              <Button variant="secondary" onClick={() => window.location.href = `/api/projects/${params.id}/feedback/export`} className="h-12 px-6 flex items-center gap-2 border-2 border-black">
                <Download size={18} /> Export
              </Button>
            )}
          </div>
        </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border-[2.5px] border-black bg-white p-6 shadow-[6px_6px_0px_#000]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Sentiment Overview</h3>
              <p className="text-xs font-bold opacity-40 ms-mono">{visibleFeedback.length} SUBMISSIONS ANALYZED</p>
            </div>
            <select
              className="h-10 rounded-lg border-[2px] border-black bg-[var(--yellow)] px-4 text-xs font-black uppercase shadow-[2px_2px_0px_#000]"
              value={selectedBuildId}
              onChange={(e) => setSelectedBuildId(e.target.value)}
            >
              <option value="">ALL BUILDS</option>
              {builds.map((b) => <option key={b.id} value={b.id}>{b.version_name.toUpperCase()}</option>)}
            </select>
          </div>
          <SentimentBar positive={sentiment.positive} neutral={sentiment.neutral} negative={sentiment.negative} />
        </section>

        <section className="rounded-2xl border-[2.5px] border-black bg-[var(--purple)] p-6 shadow-[6px_6px_0px_#000] text-white">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase">AI Clustering</h3>
              <BrainCircuit size={24} />
           </div>
           <p className="text-xs font-bold leading-relaxed mb-6 opacity-80 uppercase tracking-wider">
             AI automatically groups similar feedback into actionable clusters. 
             Click a cluster to filter the list.
           </p>
           <Button 
             variant="dark" 
             className="w-full h-12 bg-black text-white border-white"
             onClick={() => generateClusters()}
             disabled={aiBusy || !selectedBuildId}
           >
             {aiBusy ? <RefreshCw className="animate-spin mr-2" /> : <BrainCircuit className="mr-2" />}
             {aiBusy ? "ANALYZING..." : "GENERATE CLUSTERS"}
           </Button>
        </section>
      </div>

      {/* Clusters */}
      {clusterItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {clusterItems.map(c => {
             const total = c.positive + c.neutral + c.negative || 1;
             return (
               <button
                 key={c.id}
                 onClick={() => setClusterFilterIds(c.submission_ids)}
                 className={`group p-4 text-left rounded-xl border-[2.5px] border-black bg-white transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${new Set(clusterFilterIds || []).has(c.submission_ids[0]) ? 'bg-[var(--yellow)]' : ''}`}
               >
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-black leading-tight group-hover:underline">{c.title}</p>
                    <span className="text-[10px] font-black ms-mono bg-black text-white px-1.5 py-0.5 rounded uppercase">{c.submission_ids.length}</span>
                 </div>
                 <div className="flex items-center gap-1 h-1.5 rounded-full overflow-hidden border border-black bg-black/10 mt-3">
                    <div className="h-full bg-[var(--green)]" style={{ width: `${(c.positive/total)*100}%` }} />
                    <div className="h-full bg-[var(--yellow)]" style={{ width: `${(c.neutral/total)*100}%` }} />
                    <div className="h-full bg-[var(--coral)]" style={{ width: `${(c.negative/total)*100}%` }} />
                 </div>
               </button>
             );
           })}
        </div>
      )}

      {/* Past Debriefs */}
      {pastDebriefs.length > 0 && (
        <section className="rounded-2xl border-[2.5px] border-black bg-white overflow-hidden shadow-[4px_4px_0px_#000]">
           <button 
             onClick={() => setShowPastDebriefs(!showPastDebriefs)}
             className="w-full flex items-center justify-between p-4 bg-slate-50 border-b-[2.5px] border-black hover:bg-slate-100 transition-colors"
           >
              <div className="flex items-center gap-3">
                 <span className="text-xl">📋</span>
                 <h3 className="font-black uppercase text-sm tracking-tight">Recent Session Debriefs</h3>
              </div>
              <span className={`transition-transform duration-300 ${showPastDebriefs ? 'rotate-180' : ''}`}>▼</span>
           </button>
           {showPastDebriefs && (
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastDebriefs.map(d => (
                  <button 
                    key={d.id}
                    onClick={() => {
                      setDebriefResult(JSON.parse(d.report_json));
                      setDebriefStep(3);
                      setDebriefModalOpen(true);
                    }}
                    className="p-4 rounded-xl border-2 border-black bg-[var(--cream)] text-left hover:translate-x-[2px] hover:translate-y-[2px] transition-all shadow-[2px_2px_0px_#000] hover:shadow-none"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-[10px] font-black uppercase opacity-40 ms-mono">Generated {new Date(d.created_at).toLocaleDateString()}</p>
                       <span className="text-[10px] font-black ms-mono bg-black text-white px-1.5 py-0.5 rounded">{d.feedback_count} items</span>
                    </div>
                    <p className="font-black text-xs uppercase truncate mb-1">
                      {new Date(d.window_start).toLocaleDateString()} - {new Date(d.window_end).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] font-bold opacity-60 line-clamp-1 italic">
                      {JSON.parse(d.report_json).overview?.slice(0, 50)}...
                    </p>
                  </button>
                ))}
             </div>
           )}
        </section>
      )}

      {/* Suggested Issues Panel */}
      {suggestions.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span className="text-xl">🤖</span>
                 <h3 className="text-lg font-black uppercase tracking-tight">Suggested from Feedback</h3>
              </div>
              <button 
                onClick={() => fetchSuggestions(selectedBuildId, true)}
                disabled={suggestBusy}
                className="text-xs font-black uppercase tracking-widest text-ms-black/40 hover:text-ms-black transition-colors flex items-center gap-2"
              >
                <RefreshCw size={12} className={suggestBusy ? "animate-spin" : ""} />
                Regenerate
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestions.map((s, idx) => (
                <div key={idx} className="flex flex-col rounded-2xl border-[2.5px] border-black bg-white p-5 shadow-[4px_4px_0px_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
                   <div className="flex items-start justify-between mb-3">
                      <PriorityDot priority={s.priority as any} />
                      <div className="flex gap-2">
                        <TagChip type="category" label={s.category_tag} className="scale-75 origin-right" />
                      </div>
                   </div>
                   <h4 className="font-black text-sm mb-2 leading-tight">{s.title}</h4>
                   <p className="text-xs font-medium opacity-60 mb-6 flex-1 line-clamp-3">{s.description}</p>
                   
                   <div className="flex items-center gap-3 mt-auto">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 h-9 text-[10px] font-black uppercase"
                        onClick={() => {
                          setIssueForm(s);
                          setIssueDrawerOpen(true);
                        }}
                      >
                        Create Issue
                      </Button>
                      <button 
                        className="p-2 border-[2px] border-black hover:bg-black/5 rounded-lg transition-colors"
                        onClick={() => setSuggestions(prev => prev.filter((_, i) => i !== idx))}
                      >
                         <X size={16} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
         <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg border-[2px] border-black bg-white">
               {["all", "positive", "neutral", "negative"].map(s => (
                 <button
                   key={s}
                   onClick={() => setFilters({...filters, sentiment: s})}
                   className={`px-3 py-1.5 rounded font-black text-[10px] uppercase tracking-widest transition-all ${filters.sentiment === s ? 'bg-black text-white' : 'hover:bg-black/5'}`}
                 >
                   {s}
                 </button>
               ))}
            </div>
            <select
               className="h-10 rounded-lg border-[2px] border-black bg-white px-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[var(--yellow)]"
               value={filters.category}
               onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
               <option value="all">CATEGORY: ALL</option>
               {["Gameplay", "UI", "Performance", "Audio", "Crash", "Other"].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
            </select>
            <select
               className="h-10 rounded-lg border-[2px] border-black bg-white px-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[var(--yellow)]"
               value={filters.rating_min}
               onChange={(e) => setFilters({...filters, rating_min: e.target.value})}
            >
               {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>MIN RATING: {v}</option>)}
            </select>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
              <input
                type="text"
                placeholder="SEARCH FEEDBACK..."
                className="h-10 w-64 rounded-lg border-[2px] border-black bg-white pl-9 pr-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                value={filters.q}
                onChange={(e) => setFilters({...filters, q: e.target.value})}
              />
              {filters.q && (
                <button 
                  onClick={() => setFilters({...filters, q: ""})}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
         </div>
         {clusterFilterIds && (
            <Button variant="dark" size="sm" onClick={() => setClusterFilterIds(null)} className="h-10 flex items-center gap-2">
               <X size={14} /> CLEAR CLUSTER FILTER
            </Button>
         )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
           {[1,2,3,4,5].map(i => <Skeleton key={i} height={64} className="w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="table-container shadow-[6px_6px_0px_#000] border-[2.5px] border-black rounded-2xl overflow-hidden">
          <table className="w-full min-w-[1000px] bg-white">
            <thead className="bg-black/5 text-[10px] font-black uppercase tracking-[0.2em] text-[#888] border-b-[2.5px] border-black">
              <tr>
                <th className="px-4 py-4 text-left">Rating</th>
                <th className="px-4 py-4 text-left">Sentiment</th>
                <th className="px-4 py-4 text-left">Category</th>
                <th className="px-4 py-4 text-left">Message</th>
                <th className="px-4 py-4 text-left">Platform</th>
                <th className="px-4 py-4 text-left">Source</th>
                <th className="px-4 py-4 text-left">Build</th>
                <th className="px-4 py-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleFeedback.map((entry) => (
                <FeedbackRow 
                  key={entry.id} 
                  entry={entry} 
                  buildName={buildNameById.get(entry.build_id)} 
                  onClick={() => setDetailFeedback(entry)} 
                />
              ))}
            </tbody>
          </table>
          {visibleFeedback.length === 0 && (
            feedback.length === 0 ? (
              <EmptyState emoji="💬" message="No feedback yet" subtext="Generate a feedback link to start collecting." />
            ) : (
              <EmptyState emoji="🌵" message="No feedback matches" subtext="Try broadening your filters or check a different build." />
            )
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailFeedback && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-[600px] overflow-y-auto border-l-[2.5px] border-black bg-[var(--cream)] p-10 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Feedback Details</h2>
                <button onClick={() => setDetailFeedback(null)} className="p-2 border-[2px] border-black bg-white hover:bg-[var(--coral)]"><X /></button>
             </div>

             <div className="space-y-8">
                <section>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ms-mono">What they enjoyed</p>
                   <div className="p-5 rounded-xl border-[2px] border-black bg-white font-bold leading-relaxed">
                      {detailFeedback.text_enjoy || <span className="opacity-20 italic">No positive feedback left</span>}
                   </div>
                </section>
                <section>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ms-mono">What felt broken</p>
                   <div className="p-5 rounded-xl border-[2px] border-black bg-white font-bold leading-relaxed border-l-[8px] border-l-[var(--coral)]">
                      {detailFeedback.text_broken || <span className="opacity-20 italic">No negative feedback left</span>}
                   </div>
                </section>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-lg border-[2px] border-black bg-white">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">Rating</p>
                      <StarDisplay rating={detailFeedback.rating as any} />
                   </div>
                   <div className="p-4 rounded-lg border-[2px] border-black bg-white">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">Sentiment</p>
                      <SentimentBadge sentiment={detailFeedback.sentiment} />
                   </div>
                   <div className="p-4 rounded-lg border-[2px] border-black bg-white">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">Platform</p>
                      <TagChip type="platform" label={detailFeedback.platform_played || "Unknown"} />
                   </div>
                   <div className="p-4 rounded-lg border-[2px] border-black bg-white">
                      <p className="text-[9px] font-black uppercase opacity-40 mb-1">Build</p>
                      <MonoBadge label={buildNameById.get(detailFeedback.build_id) || detailFeedback.build_id} />
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Link Generator Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border-[3px] border-black bg-white p-8 shadow-[10px_10px_0px_#000]">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-black uppercase tracking-tighter">New Feedback Channel</h2>
               <button onClick={() => { setLinkModalOpen(false); setGeneratedUrl(""); }}><X /></button>
            </div>
            
            {!generatedUrl ? (
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-40 ms-mono">Select Build</label>
                    <select
                      className="w-full h-12 rounded-xl border-[2.5px] border-black px-4 font-bold"
                      value={linkBuildId}
                      onChange={(e) => setLinkBuildId(e.target.value)}
                    >
                      <option value="">Choose build...</option>
                      {builds.map((b) => <option key={b.id} value={b.id}>{b.version_name.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-40 ms-mono">Channel Label</label>
                    <input
                      className="w-full h-12 rounded-xl border-[2.5px] border-black px-4 font-bold"
                      placeholder="e.g. Discord Alpha Testers"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                    />
                 </div>
                 <Button variant="primary" className="w-full h-14 text-lg" onClick={generateLink}>GENERATE LINK</Button>
              </div>
            ) : (
              <div className="space-y-8 animate-in zoom-in-95">
                 <div className="p-4 rounded-xl bg-black/5 border-[2px] border-dashed border-black flex flex-col items-center gap-4">
                    {qrDataUrl && <Image src={qrDataUrl} alt="QR" width={200} height={200} unoptimized className="border-[3px] border-black" />}
                    <p className="text-center font-black text-sm ms-mono break-all">{generatedUrl}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <Button variant="secondary" className="h-12" onClick={() => {
                       navigator.clipboard.writeText(generatedUrl);
                       showToast("URL Copied", "success");
                    }}><Copy className="mr-2" /> COPY URL</Button>
                    <Button variant="dark" className="h-12" onClick={() => window.open(generatedUrl)}><ExternalLink className="mr-2" /> OPEN LINK</Button>
                 </div>
                 <Button variant="secondary" className="w-full" onClick={() => { setGeneratedUrl(""); setLinkModalOpen(false); }}>DONE</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Issue Drawer (Simplified for Suggestions) */}
      {issueDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-[500px] overflow-y-auto border-l-[2.5px] border-black bg-[var(--cream)] p-8 animate-in slide-in-from-right duration-300">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-3xl font-black uppercase tracking-tighter">File Issue</h3>
              <button
                type="button"
                className="p-2 border-[2.5px] border-black bg-white hover:bg-[var(--coral)] transition-colors"
                onClick={() => setIssueDrawerOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Title</label>
                <input
                  className="w-full h-12 rounded-lg border-[2.5px] border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Description</label>
                <textarea
                  className="w-full min-h-[150px] rounded-lg border-[2.5px] border-black p-4 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Priority</label>
                  <select
                    className="w-full h-10 rounded-lg border-[2.5px] border-black px-2 font-bold text-xs uppercase"
                    value={issueForm.priority}
                    onChange={(e) => setIssueForm({...issueForm, priority: e.target.value as any})}
                  >
                    {["blocker", "critical", "high", "medium", "low"].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Platform</label>
                  <input
                    className="w-full h-10 rounded-lg border-[2.5px] border-black px-3 font-bold text-xs"
                    value={issueForm.platform_tag}
                    onChange={(e) => setIssueForm({...issueForm, platform_tag: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                className="w-full h-14 text-lg" 
                variant="primary" 
                onClick={createIssueFromSuggestion} 
                disabled={creatingIssue}
              >
                {creatingIssue ? "Creating..." : "Submit Issue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Debrief Modal */}
      {debriefModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-[3px] border-black bg-white shadow-[12px_12px_0px_#000] animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 z-10 bg-white border-b-[2.5px] border-black p-6 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <span className="text-3xl">📋</span>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Session Debrief</h2>
               </div>
               <button 
                 onClick={() => {
                   setDebriefModalOpen(false);
                   setDebriefStep(1);
                   setDebriefResult(null);
                 }}
                 className="p-2 border-2 border-black bg-white hover:bg-[var(--coral)]"
               >
                 <X size={20} />
               </button>
            </div>

            <div className="p-8">
               {debriefStep === 1 && (
                 <div className="space-y-8">
                    <div className="p-6 rounded-2xl border-2 border-black bg-[var(--cream)] shadow-[4px_4px_0px_#000]">
                       <p className="font-black text-sm uppercase mb-6 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px]">1</span>
                          Define Report Window
                       </p>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ms-mono">Start Date</label>
                             <input 
                               type="date" 
                               className="w-full h-12 rounded-xl border-[2.5px] border-black px-4 font-bold"
                               value={debriefWindow.start}
                               onChange={(e) => setDebriefWindow({...debriefWindow, start: e.target.value})}
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ms-mono">End Date</label>
                             <input 
                               type="date" 
                               className="w-full h-12 rounded-xl border-[2.5px] border-black px-4 font-bold"
                               value={debriefWindow.end}
                               onChange={(e) => setDebriefWindow({...debriefWindow, end: e.target.value})}
                             />
                          </div>
                       </div>
                    </div>

                    <div className="bg-[var(--yellow)]/10 border-2 border-[var(--yellow)] rounded-xl p-4 flex items-start gap-3">
                       <span className="text-xl">💡</span>
                       <p className="text-xs font-bold leading-relaxed">
                          Session debriefs analyze sentiment, volume, and major friction points across the selected window. 
                          The AI requires at least <span className="underline">3 feedback entries</span> in the window to generate a meaningful report.
                       </p>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full h-14 text-lg font-black uppercase tracking-tight"
                      onClick={async () => {
                        try {
                          setDebriefBusy(true);
                          setDebriefStep(2);
                          const res = await fetch(`/api/projects/${params.id}/ai/session-debrief`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              window_start: debriefWindow.start,
                              window_end: debriefWindow.end
                            })
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || "Generation failed");
                          }
                          const data = await res.json();
                          setDebriefResult(data.data);
                          setDebriefStep(3);
                          fetchDebriefs();
                        } catch (e: any) {
                          showToast(e.message, "error");
                          setDebriefStep(1);
                        } finally {
                          setDebriefBusy(false);
                        }
                      }}
                    >
                      GENERATE REPORT
                    </Button>
                 </div>
               )}

               {debriefStep === 2 && (
                 <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="relative">
                       <div className="h-24 w-24 rounded-full border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_#000] animate-bounce">
                          <BrainCircuit size={48} className="text-[var(--purple)]" />
                       </div>
                       <div className="absolute inset-0 h-24 w-24 rounded-full border-4 border-black animate-ping opacity-20" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter">Analyzing Session Data...</h3>
                       <p className="ms-mono text-[10px] font-black opacity-40 uppercase mt-2">Gemma is connecting dots between player feedback and issue tracking</p>
                    </div>
                 </div>
               )}

               {debriefStep === 3 && debriefResult && (
                 <div className="space-y-8 animate-in fade-in duration-500">
                    <section className="p-6 rounded-2xl border-2 border-black bg-slate-50 border-l-[8px] border-l-[var(--purple)]">
                       <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 ms-mono">Executive Summary</h4>
                       <p className="font-bold leading-relaxed">{debriefResult.overview}</p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 ms-mono">Top Complaints</h4>
                          <div className="space-y-2">
                             {debriefResult.top_complaints?.map((c: string, i: number) => (
                               <div key={i} className="p-3 rounded-lg border-2 border-black bg-white flex items-center gap-3">
                                  <span className="text-lg">📉</span>
                                  <span className="text-xs font-black">{c}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 ms-mono">Top Praise</h4>
                          <div className="space-y-2">
                             {debriefResult.top_praise?.map((c: string, i: number) => (
                               <div key={i} className="p-3 rounded-lg border-2 border-black bg-white flex items-center gap-3">
                                  <span className="text-lg">🚀</span>
                                  <span className="text-xs font-black">{c}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <section className="p-6 rounded-2xl border-2 border-black bg-[var(--yellow)]/5">
                       <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ms-mono">Action Plan</h4>
                       <div className="space-y-3">
                          {debriefResult.recommended_actions?.map((a: string, i: number) => (
                            <div key={i} className="flex gap-3">
                               <div className="h-5 w-5 rounded border border-black bg-white flex items-center justify-center shrink-0 mt-0.5">
                                  <span className="text-[10px] font-black">{i+1}</span>
                               </div>
                               <p className="text-xs font-bold leading-relaxed">{a}</p>
                            </div>
                          ))}
                       </div>
                    </section>

                    <div className="p-6 rounded-2xl border-2 border-black bg-black text-white flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-full border-2 border-white flex items-center justify-center text-2xl ${debriefResult.overall_sentiment === 'positive' ? 'bg-green-500' : debriefResult.overall_sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                             {debriefResult.overall_sentiment === 'positive' ? '😊' : debriefResult.overall_sentiment === 'negative' ? '😠' : '😐'}
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 ms-mono">Overall Vibe</p>
                             <p className="font-black uppercase tracking-tight">{debriefResult.overall_sentiment}</p>
                          </div>
                       </div>
                       <Button 
                        variant="secondary" 
                        onClick={() => {
                          const { jsPDF } = require("jspdf");
                          require("jspdf-autotable");
                          const doc = new jsPDF();
                          
                          doc.setFontSize(22);
                          doc.text("Session Debrief Report", 14, 20);
                          
                          doc.setFontSize(10);
                          doc.text(`Project: ${params.id}`, 14, 28);
                          doc.text(`Window: ${debriefWindow.start} to ${debriefWindow.end}`, 14, 34);
                          doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);
                          
                          doc.setFontSize(14);
                          doc.text("Executive Summary", 14, 55);
                          doc.setFontSize(10);
                          const splitOverview = doc.splitTextToSize(debriefResult.overview || "", 180);
                          doc.text(splitOverview, 14, 62);
                          
                          let y = 62 + (splitOverview.length * 5) + 10;
                          
                          doc.setFontSize(14);
                          doc.text("Top Complaints", 14, y);
                          y += 7;
                          debriefResult.top_complaints?.forEach((c: string) => {
                             doc.text(`- ${c}`, 20, y);
                             y += 6;
                          });
                          
                          y += 4;
                          doc.setFontSize(14);
                          doc.text("Top Praise", 14, y);
                          y += 7;
                          debriefResult.top_praise?.forEach((c: string) => {
                             doc.text(`- ${c}`, 20, y);
                             y += 6;
                          });
                          
                          y += 4;
                          doc.setFontSize(14);
                          doc.text("Recommended Actions", 14, y);
                          y += 7;
                          debriefResult.recommended_actions?.forEach((a: string, i: number) => {
                             const splitAction = doc.splitTextToSize(`${i+1}. ${a}`, 170);
                             doc.text(splitAction, 20, y);
                             y += (splitAction.length * 5);
                          });
                          
                          doc.save(`debrief-${debriefWindow.start}-${debriefWindow.end}.pdf`);
                        }} 
                        className="h-12 border-white text-white hover:bg-white hover:text-black"
                       >
                          <Download size={18} className="mr-2" /> EXPORT PDF
                       </Button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
