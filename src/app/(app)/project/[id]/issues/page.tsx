"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  Button,
  MonoBadge,
  PriorityDot,
  StatusPill,
  TagChip,
  Skeleton,
  EmptyState,
  ErrorCard,
} from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";
import { X, LayoutList, Columns, AlertTriangle, ExternalLink } from "lucide-react";

type PageProps = {
  params: {
    id: string;
  };
};

type ViewMode = "list" | "kanban";
type SortKey = "priority" | "status" | "updated_at";
type SortDir = "asc" | "desc";

type Issue = {
  id: string;
  title: string;
  priority: "blocker" | "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "qa" | "resolved";
  assignee_id: string | null;
  assignee_name?: string | null;
  platform_tag: string | null;
  category_tag: string | null;
  build_id: string | null;
  updated_at: string;
  description?: string | null;
};

type Member = { user_id: string; role: string; name?: string };
type Build = { id: string; version_name: string };
type SavedFilter = {
  id: string;
  name: string;
  filter_config: Record<string, string>;
};

type Filters = {
  priority: string;
  status: string;
  assignee_id: string;
  build_id: string;
  platform_tag: string;
  category_tag: string;
};

const STORAGE_KEY = "ms_issues_view";
const PAGE_SIZE = 20;
const DEFAULT_FILTERS: Filters = {
  priority: "all",
  status: "all",
  assignee_id: "all",
  build_id: "all",
  platform_tag: "all",
  category_tag: "all",
};

function relativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function avatarText(name?: string | null) {
  if (!name) return "A";
  return name.slice(0, 1).toUpperCase();
}

function priorityRank(priority: Issue["priority"]) {
  return { blocker: 5, critical: 4, high: 3, medium: 2, low: 1 }[priority] ?? 0;
}

// Optimized components
const IssueRow = memo(({ 
  issue, 
  buildName, 
  projectId 
}: { 
  issue: Issue; 
  buildName?: string; 
  projectId: string 
}) => (
  <tr
    className={`cursor-pointer border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
      issue.status === "resolved" ? "opacity-60" : ""
    }`}
    onClick={() => {
      window.location.href = `/project/${projectId}/issues/${issue.id}`;
    }}
  >
    <td className="px-4 py-3 ms-mono text-xs text-[#888]">{issue.id.slice(0, 8)}</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <PriorityDot priority={issue.priority} />
        <span className={`font-bold ${issue.status === "resolved" ? "line-through opacity-50" : ""}`}>
          {issue.title}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <StatusPill status={issue.status} />
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-black bg-[var(--yellow)] text-[10px] font-black">
          {avatarText(issue.assignee_name || issue.assignee_id)}
        </span>
        <span className="text-sm font-semibold">{issue.assignee_name || issue.assignee_id || "-"}</span>
      </div>
    </td>
    <td className="px-4 py-3">
      {issue.platform_tag ? <TagChip type="platform" label={issue.platform_tag} /> : "-"}
    </td>
    <td className="px-4 py-3">
      {issue.category_tag ? <TagChip type="category" label={issue.category_tag} /> : "-"}
    </td>
    <td className="px-4 py-3">
      {issue.build_id ? <MonoBadge label={buildName || issue.build_id.slice(0, 8)} /> : "-"}
    </td>
    <td className="px-4 py-3 text-xs font-bold opacity-50 ms-mono uppercase">
      {relativeTime(issue.updated_at)}
    </td>
  </tr>
));
IssueRow.displayName = "IssueRow";

export default function ProjectIssuesPage({ params }: PageProps) {
  const { showToast } = useToast();
  const [view, setView] = useState<ViewMode>("list");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingIssueId, setDraggingIssueId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<Issue["status"] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "medium" as Issue["priority"],
    assignee_id: "",
    platform_tag: "PC",
    category_tag: "Gameplay",
    build_id: "",
  });
  const [similarIssues, setSimilarIssues] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "list" || stored === "kanban") setView(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    if (createForm.title.length < 3) {
      setSimilarIssues([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicates(true);
        const res = await fetch(`/api/projects/${params.id}/issues/similar?q=${encodeURIComponent(createForm.title)}`);
        if (res.ok) {
          const data = await res.json();
          setSimilarIssues(data.issues || []);
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [createForm.title, params.id]);

  const fetchSavedFilters = useCallback(async () => {
    const res = await fetch(`/api/projects/${params.id}/saved-filters?screen=issues`);
    if (res.ok) {
      const data = await res.json();
      setSavedFilters((data.data || []) as SavedFilter[]);
    }
  }, [params.id]);

  const fetchBaseData = useCallback(async () => {
    const [membersRes, buildsRes] = await Promise.all([
      fetch(`/api/projects/${params.id}/members`),
      fetch(`/api/projects/${params.id}/builds?limit=100`),
    ]);
    const membersData = await membersRes.json();
    const buildsData = await buildsRes.json();
    setMembers((membersData.data || []) as Member[]);
    setBuilds((buildsData.data || []) as Build[]);
  }, [params.id]);

  const fetchIssues = useCallback(async (targetPage: number, append = false) => {
    const query = new URLSearchParams();
    query.set("page", String(targetPage));
    query.set("limit", String(PAGE_SIZE));
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") query.set(key, value);
    });

    const res = await fetch(`/api/projects/${params.id}/issues?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to load issues");
    const data = await res.json();
    const next = (data.data || []) as Issue[];
    setHasMore(next.length >= PAGE_SIZE);
    setIssues((prev) => (append ? [...prev, ...next] : next));
  }, [filters, params.id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchBaseData(), fetchSavedFilters(), fetchIssues(1, false)]);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [fetchBaseData, fetchSavedFilters, fetchIssues]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.name || m.user_id).toLowerCase().includes(q));
  }, [memberSearch, members]);

  const sortedIssues = useMemo(() => {
    const next = [...issues];
    next.sort((l, r) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "updated_at") return (new Date(l.updated_at).getTime() - new Date(r.updated_at).getTime()) * dir;
      if (sortKey === "priority") return (priorityRank(l.priority) - priorityRank(r.priority)) * dir;
      return l.status.localeCompare(r.status) * dir;
    });
    return next;
  }, [issues, sortDir, sortKey]);

  const buildNameById = useMemo(() => {
    const map = new Map<string, string>();
    builds.forEach((b) => map.set(b.id, b.version_name));
    return map;
  }, [builds]);

  async function createIssue() {
    if (!createForm.title.trim()) {
      showToast("Issue title is required", "error");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch(`/api/projects/${params.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || null,
          priority: createForm.priority,
          assignee_id: createForm.assignee_id || null,
          platform_tag: createForm.platform_tag || null,
          category_tag: createForm.category_tag || null,
          build_id: createForm.build_id || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create issue");
      
      const data = await res.json();
      
      if (data.warning?.type === 'possible_duplicate') {
        showToast(
          <div className="flex flex-col gap-1">
            <span>This issue looks similar to #{data.warning.matched_issue_id.slice(0, 8)}.</span>
            <a 
              href={`/project/${params.id}/issues/${data.warning.matched_issue_id}`} 
              className="underline hover:text-black/70 flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              View it? <ExternalLink size={10} />
            </a>
          </div>, 
          "warning"
        );
      } else {
        showToast("Issue created!", "success");
      }

      setDrawerOpen(false);
      setSimilarIssues([]);
      setCreateForm({
        title: "",
        description: "",
        priority: "medium",
        assignee_id: "",
        platform_tag: "PC",
        category_tag: "Gameplay",
        build_id: "",
      });
      await fetchIssues(1, false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Creation failed", "error");
    } finally {
      setCreating(false);
    }
  }

  async function updateIssueStatus(issueId: string, status: Issue["status"]) {
    const res = await fetch(`/api/issues/${issueId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    setIssues(prev => prev.map(i => (i.id === issueId ? { ...i, status } : i)));
    showToast("Status updated", "success");
  }

  if (error) return <div className="p-8"><ErrorCard resource="issues" onRetry={loadData} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Issue Tracker</h1>
        <Button variant="primary" onClick={() => setDrawerOpen(true)} className="h-12 px-8">
          + New Issue
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg border-[2px] border-black">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-sm transition-all ${view === "list" ? "bg-[var(--cream)] shadow-[2px_2px_0px_var(--black)]" : "opacity-50"}`}
          >
            <LayoutList size={16} /> List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-bold text-sm transition-all ${view === "kanban" ? "bg-[var(--cream)] shadow-[2px_2px_0px_var(--black)]" : "opacity-50"}`}
          >
            <Columns size={16} /> Kanban
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedFilters.map((f) => (
            <button
              key={f.id}
              className="px-3 py-1.5 rounded-lg border-[2px] border-black bg-[var(--cream)] text-xs font-bold shadow-[2px_2px_0px_var(--black)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2"
              onClick={() => {
                const config = typeof f.filter_config === 'string' ? JSON.parse(f.filter_config) : f.filter_config;
                setFilters({ ...DEFAULT_FILTERS, ...config });
              }}
            >
              <span className="opacity-50">🔖</span> {f.name}
            </button>
          ))}
          <Button variant="secondary" size="sm" onClick={() => {
            const name = prompt("Filter name?");
            if (name) showToast("Filter saved (simulated)", "success");
          }}>+ Save View</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl border-[2.5px] border-black bg-[var(--cream)] shadow-[var(--shadow)]">
        {(["priority", "status", "platform_tag", "category_tag"] as const).map(key => (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
            className="rounded-md border-[2px] border-black bg-[var(--cream)] px-3 py-2 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-[var(--yellow)] outline-none"
          >
            <option value="all">{key.replace("_tag", "")}: All</option>
            {/* Options based on actual values would go here */}
            {key === "priority" && ["blocker", "critical", "high", "medium", "low"].map(v => <option key={v} value={v}>{v}</option>)}
            {key === "status" && ["open", "in_progress", "qa", "resolved"].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        ))}
        {/* Additional selects for builds and members */}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={60} className="w-full rounded-lg" />)}
        </div>
      ) : view === "list" ? (
        <div className="table-container">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-black/5 text-[10px] font-black uppercase tracking-[0.2em] text-[#888]">
              <tr>
                <th className="px-4 py-4 text-left">ID</th>
                <th className="px-4 py-4 text-left cursor-pointer hover:text-black transition-colors" onClick={() => toggleSort("priority")}>Issue</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-left">Assignee</th>
                <th className="px-4 py-4 text-left">Platform</th>
                <th className="px-4 py-4 text-left">Category</th>
                <th className="px-4 py-4 text-left">Build</th>
                <th className="px-4 py-4 text-left cursor-pointer hover:text-black transition-colors" onClick={() => toggleSort("updated_at")}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedIssues.map((issue) => (
                <IssueRow 
                  key={issue.id} 
                  issue={issue} 
                  projectId={params.id} 
                  buildName={buildNameById.get(issue.build_id || "")} 
                />
              ))}
            </tbody>
          </table>
          {sortedIssues.length === 0 && (
            <EmptyState emoji="🐛" message="No issues found" subtext="This project is clean — for now." />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Kanban implementation */}
          {["open", "in_progress", "qa", "resolved"].map((status) => (
             <div key={status} className="flex flex-col gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full border border-black ${status === 'open' ? 'bg-white' : status === 'in_progress' ? 'bg-[var(--blue)]' : status === 'qa' ? 'bg-[var(--purple)]' : 'bg-[var(--green)]'}`} />
                    {status.replace("_", " ")}
                  </div>
                  <span className="opacity-30 ms-mono">{issues.filter(i => i.status === status).length}</span>
                </h3>
                <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-xl bg-black/[0.03] border-[2px] border-dashed border-black/10">
                  {issues.filter(i => i.status === status).map(issue => (
                    <div 
                      key={issue.id} 
                      className="p-4 rounded-lg border-[2.5px] border-black bg-[var(--cream)] shadow-[3px_3px_0px_var(--black)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
                      onClick={() => window.location.href = `/project/${params.id}/issues/${issue.id}`}
                    >
                       <p className="font-bold text-sm leading-tight mb-3">{issue.title}</p>
                       <div className="flex flex-wrap gap-2 items-center">
                          <PriorityDot priority={issue.priority} />
                          <TagChip type="category" label={issue.category_tag || "General"} />
                          <div className="ml-auto flex -space-x-2">
                             <span className="flex h-6 w-6 items-center justify-center rounded-full border border-black bg-[var(--yellow)] text-[8px] font-black">
                                {avatarText(issue.assignee_name || issue.assignee_id)}
                             </span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          ))}
        </div>
      )}

      {/* Create Issue Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-[500px] overflow-y-auto border-l-[2.5px] border-black bg-[var(--cream)] p-8 animate-in slide-in-from-right duration-300">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-3xl font-black uppercase tracking-tighter">Create Issue</h3>
              <button
                type="button"
                className="p-2 border-[2.5px] border-black bg-white hover:bg-[var(--coral)] transition-colors"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Title</label>
                <input
                  className={`w-full h-12 rounded-lg border-[2.5px] border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)] transition-colors ${
                    !createForm.title.trim() && creating ? "border-[var(--coral)] bg-[var(--coral)]/5" : ""
                  }`}
                  placeholder="Summarize the problem..."
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                />
                {!createForm.title.trim() && creating && (
                  <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider">
                    Title is required to file an issue
                  </p>
                )}

                {similarIssues.length > 0 && (
                  <div className="rounded-lg border-2 border-black bg-[var(--yellow)]/10 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--yellow)] flex items-center gap-2">
                      <AlertTriangle size={12} /> Similar open issues found:
                    </p>
                    <div className="space-y-2">
                      {similarIssues.map((issue) => (
                        <div key={issue.id} className="flex items-center justify-between gap-4 bg-white/50 p-2 rounded border border-black/10">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <PriorityDot priority={issue.priority} />
                            <span className="text-xs font-bold truncate">{issue.title}</span>
                            <StatusPill status={issue.status} />
                          </div>
                          <a 
                            href={`/project/${params.id}/issues/${issue.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-black uppercase underline hover:text-black flex items-center gap-1 shrink-0"
                          >
                            View <ExternalLink size={10} />
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold opacity-60 text-center italic">These may be duplicates. Continue creating anyway?</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Description</label>
                <textarea
                  className="w-full min-h-[150px] rounded-lg border-[2.5px] border-black p-4 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  placeholder="Steps to reproduce, expected vs actual..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest opacity-60 ms-mono">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["blocker", "critical", "high", "medium", "low"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCreateForm({...createForm, priority: p})}
                      className={`
                        h-10 rounded-lg border-[2.5px] border-black font-bold text-[10px] uppercase
                        ${createForm.priority === p ? "bg-[var(--yellow)] shadow-[2px_2px_0px_#000]" : "bg-white"}
                      `}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full h-14 text-lg" 
                variant="primary" 
                onClick={createIssue} 
                disabled={creating}
              >
                {creating ? "Creating..." : "Submit Issue"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
