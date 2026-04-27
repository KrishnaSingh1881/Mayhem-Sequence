"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AIBadge, Button, LabelBadge, SentimentBar, SentimentBadge } from "@/components/ui";
import { Skeleton, ErrorCard, EmptyState } from "@/components/ui/FeedbackStates";

type PageProps = {
  params: { id: string };
};

type Project = {
  id: string;
  name: string;
};

type Build = {
  id: string;
  version_name: string;
  label: "main" | "testing" | "experimental" | "archived";
  created_at: string;
};

type Issue = {
  id: string;
  priority: "blocker" | "critical" | "high" | "medium" | "low";
  build_id: string | null;
};

type Feedback = {
  id: string;
  rating: number;
  text_enjoy: string | null;
  text_broken: string | null;
  sentiment: "positive" | "neutral" | "negative";
  source: string;
  submitted_by: string | null;
  category_tag: string | null;
  platform_tag: string | null;
  created_at: string;
};

type Alert = {
  id: string;
  message: string;
  created_at: string;
};

type Member = {
  user_id: string;
  role: "admin" | "developer" | "qa" | "player";
};

type CurrentUser = {
  id: string;
  name: string;
};

type DashboardData = {
  project: Project | null;
  mainBuild: Build | null;
  allBuilds: Build[];
  openIssues: Issue[];
  feedbackRecent: Feedback[];
  feedbackLast14Days: Feedback[];
  unreadAlert: Alert | null;
  role: "admin" | "developer" | "qa" | "player" | null;
  config: { show_leaderboard: number } | null;
  leaderboard: any[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function timeAgo(dateString: string) {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

function scoreLabel(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

function excerpt(feedback: Feedback) {
  const raw = feedback.text_broken || feedback.text_enjoy || "No details provided";
  return raw.length > 72 ? `${raw.slice(0, 72)}...` : raw;
}

export default function ProjectPage({ params }: PageProps) {
  const [data, setData] = useState<DashboardData>({
    project: null,
    mainBuild: null,
    allBuilds: [],
    openIssues: [],
    feedbackRecent: [],
    feedbackLast14Days: [],
    unreadAlert: null,
    role: null,
    config: null,
    leaderboard: [],
  });
  const [loading, setLoading] = useState(true);
  const [alertBusy, setAlertBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      await fetch("/api/cron/check-alerts", { method: "POST" }).catch(() => null);

      const [
        projectRes,
        mainBuildRes,
        allBuildsRes,
        issuesRes,
        alertRes,
        meRes,
        membersRes,
        configRes,
        leaderboardRes,
      ] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/builds?label=main&limit=1`),
        fetch(`/api/projects/${params.id}/builds?limit=50`),
        fetch(`/api/projects/${params.id}/issues?status=open&limit=200`),
        fetch(`/api/projects/${params.id}/alerts?is_read=0&limit=1`),
        fetch("/api/auth/me"),
        fetch(`/api/projects/${params.id}/members`),
        fetch(`/api/projects/${params.id}/config`),
        fetch(`/api/projects/${params.id}/leaderboard`),
      ]);

      if (!projectRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const projectData = await projectRes.json();
      const mainBuildData = await mainBuildRes.json();
      const allBuildsData = await allBuildsRes.json();
      const issuesData = await issuesRes.json();
      const alertData = await alertRes.json();
      const meData = await meRes.json();
      const membersData = await membersRes.json();
      const configData = await configRes.json();
      const leaderboardData = await leaderboardRes.json();

      const mainBuild = (mainBuildData.data?.[0] || null) as Build | null;
      const user = (meData.user || null) as CurrentUser | null;
      const members = (membersData.data || []) as Member[];
      const role = user
        ? (members.find((member) => member.user_id === user.id)?.role ?? "admin")
        : null;

      const feedbackLast14Res = await fetch(
        `/api/projects/${params.id}/feedback?date_from=14daysago${mainBuild ? `&build_id=${mainBuild.id}` : ""}&limit=200`
      );
      const feedbackLast14Data = await feedbackLast14Res.json();
      const feedbackLast14Days = (feedbackLast14Data.data || []) as Feedback[];
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const feedbackRecent = feedbackLast14Days.filter(
        (entry) => new Date(entry.created_at).getTime() >= weekAgo
      );

      setData({
        project: (projectData.project || null) as Project | null,
        mainBuild,
        allBuilds: (allBuildsData.data || []) as Build[],
        openIssues: (issuesData.data || []) as Issue[],
        feedbackRecent,
        feedbackLast14Days,
        unreadAlert: ((alertData.data || [])[0] || null) as Alert | null,
        role,
        config: configData.config || null,
        leaderboard: Array.isArray(leaderboardData) ? leaderboardData : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const priorityCounts = useMemo(() => {
    const counts = { blocker: 0, critical: 0, high: 0, medium: 0, low: 0 };
    data.openIssues.forEach((issue) => {
      counts[issue.priority] += 1;
    });
    return counts;
  }, [data.openIssues]);

  const feedbackSentiment = useMemo(() => {
    return data.feedbackRecent.reduce(
      (acc, item) => {
        acc[item.sentiment] += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );
  }, [data.feedbackRecent]);

  const healthScore = useMemo(() => {
    let score = 100;
    score -= priorityCounts.blocker * 15;
    score -= priorityCounts.critical * 10;
    score -= priorityCounts.high * 5;

    const totalFeedback = data.feedbackRecent.length;
    const negative = feedbackSentiment.negative;
    const negativeRatio = totalFeedback === 0 ? 0 : negative / totalFeedback;
    score -= negativeRatio * 20;

    if (
      data.mainBuild &&
      totalFeedback === 0 &&
      Date.now() - new Date(data.mainBuild.created_at).getTime() > 7 * 24 * 60 * 60 * 1000
    ) {
      score -= 10;
    }
    return clamp(Math.round(score), 0, 100);
  }, [data.mainBuild, data.feedbackRecent.length, feedbackSentiment.negative, priorityCounts]);

  const openIssuesDelta = useMemo(() => {
    const current = data.openIssues.length;
    const latestBuild = data.allBuilds[0];
    const previousBuild = data.allBuilds[1];
    if (!latestBuild || !previousBuild) return 0;

    const currentCount = data.openIssues.filter((issue) => issue.build_id === latestBuild.id).length;
    const prevCount = data.openIssues.filter((issue) => issue.build_id === previousBuild.id).length;
    return currentCount - prevCount || current;
  }, [data.allBuilds, data.openIssues]);

  const feedbackDelta = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
    const currentFeedback = data.feedbackLast14Days.filter(
      (entry) => new Date(entry.created_at).getTime() >= weekAgo
    ).length;
    const previousFeedback = data.feedbackLast14Days.filter((entry) => {
      const t = new Date(entry.created_at).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    return currentFeedback - previousFeedback;
  }, [data.feedbackLast14Days]);

  async function dismissAlert() {
    if (!data.unreadAlert) return;
    try {
      setAlertBusy(true);
      await fetch(`/api/alerts/${data.unreadAlert.id}/read`, { method: "PATCH" });
      setData((prev) => ({ ...prev, unreadAlert: null }));
    } finally {
      setAlertBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorCard resource={`dashboard data: ${error}`} onRetry={fetchData} />;
  }

  if (!data.project) {
    return <EmptyState emoji="🕵️" message="Project not found" subtext="The project you're looking for doesn't exist or you don't have access." />;
  }

  const maxPriority = Math.max(1, ...Object.values(priorityCounts));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{data.project.name}</h1>
          <p className="ms-mono text-xs opacity-60">ID: {data.project.id}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/project/${params.id}/settings`}>
            <Button variant="secondary">Settings</Button>
          </Link>
          <Button variant="primary">New Build</Button>
        </div>
      </div>

      {data.unreadAlert ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-black bg-[var(--coral)] p-3 text-sm font-semibold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="min-w-0">
            <p className="truncate font-bold">⚠️ {data.unreadAlert.message}</p>
            <p className="ms-mono text-[10px] opacity-80">{timeAgo(data.unreadAlert.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/project/${params.id}/alerts`} className="text-xs underline hover:no-underline font-bold">
              View All
            </Link>
            <button
              type="button"
              disabled={alertBusy}
              className="h-7 w-7 rounded border-2 border-black bg-white font-bold hover:translate-y-[-2px] active:translate-y-[0px] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              onClick={dismissAlert}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border-2 border-black bg-[var(--yellow)] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Latest Main Build</p>
          <p className="ms-mono mt-2 text-3xl font-bold">{data.mainBuild?.version_name || "N/A"}</p>
          {data.mainBuild ? <LabelBadge label={data.mainBuild.label} className="mt-2" /> : <p className="text-xs mt-1 opacity-60">No main build promoted</p>}
        </div>
        
        <div className="rounded-lg border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Open Issues</p>
          <p className="mt-2 text-3xl font-extrabold">{data.openIssues.length}</p>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
            <span className={openIssuesDelta > 0 ? "text-[var(--coral)]" : "text-[var(--green)]"}>
              {openIssuesDelta > 0 ? "▲" : openIssuesDelta < 0 ? "▼" : "•"} {Math.abs(openIssuesDelta)}
            </span>
            <span className="opacity-60">vs previous build</span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-black bg-[var(--coral)] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Recent Feedback</p>
          <p className="mt-2 text-3xl font-extrabold">{data.feedbackRecent.length}</p>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
             <span className={feedbackDelta >= 0 ? "text-[var(--green)]" : "text-black"}>
              {feedbackDelta > 0 ? "▲" : feedbackDelta < 0 ? "▼" : "•"} {Math.abs(feedbackDelta)}
            </span>
            <span className="opacity-60">weekly change</span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-black bg-black p-4 text-[var(--cream)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-40">Health Score</p>
          {data.role === "qa" || data.role === "player" ? (
            <p className="mt-3 text-sm font-bold">LOCKED FOR ROLE</p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-extrabold">{healthScore}</p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-[#333] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--green)]"
                  style={{ width: `${healthScore}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] font-bold tracking-widest uppercase text-[var(--green)]">{scoreLabel(healthScore)}</p>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Issue Breakdown</h2>
            <Link href={`/project/${params.id}/issues`} className="text-xs font-bold underline hover:no-underline">
              Full Tracker
            </Link>
          </div>
          <div className="space-y-3">
            {(["blocker", "critical", "high", "medium", "low"] as const).map((priority) => (
              <div key={priority} className="grid grid-cols-[80px_1fr_30px] items-center gap-4 text-[10px] font-bold">
                <div className="uppercase tracking-widest opacity-60">{priority}</div>
                <div className="h-2.5 rounded-full border border-black bg-[#f2f2f2] overflow-hidden">
                  <div
                    className="h-full"
                    style={{ 
                      width: `${(priorityCounts[priority] / maxPriority) * 100}%`,
                      background: priority === 'blocker' ? '#ff0000' : priority === 'critical' ? 'var(--coral)' : priority === 'high' ? 'var(--yellow)' : priority === 'medium' ? 'var(--yellow)' : 'var(--green)'
                    }}
                  />
                </div>
                <div className="text-right">{priorityCounts[priority]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Pulse Feed</h2>
            <Link href={`/project/${params.id}/feedback`} className="text-xs font-bold underline hover:no-underline">
              All Signals
            </Link>
          </div>
          <div className="space-y-3">
            {data.feedbackRecent.slice(0, 4).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-md border-2 border-black p-2 bg-[var(--cream)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{excerpt(entry)}</p>
                  <p className="ms-mono text-[9px] opacity-60">{"★".repeat(entry.rating)} • {entry.category_tag}</p>
                </div>
                <SentimentBadge sentiment={entry.sentiment} />
              </div>
            ))}
            {data.feedbackRecent.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 opacity-40">
                <p className="text-4xl mb-2">📡</p>
                <p className="text-xs font-bold">No recent signals detected</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-extrabold uppercase tracking-tight mb-4">Sentiment Map</h2>
          <SentimentBar
            className="h-8 rounded-md border-2 border-black overflow-hidden"
            positive={feedbackSentiment.positive}
            neutral={feedbackSentiment.neutral}
            negative={feedbackSentiment.negative}
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border-2 border-black bg-[var(--green)] p-2 text-center">
              <p className="text-[9px] font-bold uppercase opacity-60">Positive</p>
              <p className="text-lg font-black">{feedbackSentiment.positive}</p>
            </div>
            <div className="rounded-md border-2 border-black bg-white p-2 text-center">
              <p className="text-[9px] font-bold uppercase opacity-60">Neutral</p>
              <p className="text-lg font-black">{feedbackSentiment.neutral}</p>
            </div>
            <div className="rounded-md border-2 border-black bg-[var(--coral)] p-2 text-center">
              <p className="text-[9px] font-bold uppercase opacity-60">Negative</p>
              <p className="text-lg font-black">{feedbackSentiment.negative}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border-2 border-black bg-[var(--yellow)] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-extrabold uppercase tracking-tight mb-4">Quick Command</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button className="font-bold border-2" variant="dark">Upload Build</Button>
            <Button className="font-bold border-2" variant="secondary">Invite Team</Button>
            <Button className="font-bold border-2" variant="secondary">Export Data</Button>
            <AIBadge className="w-full justify-center rounded-md py-2 text-center font-bold border-2 border-black cursor-pointer" label="Generate Log" />
          </div>
        </div>
      </section>

      {data.config?.show_leaderboard === 1 && data.role !== "player" && (
        <section className="mt-8 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tight">🏆 Tester Leaderboard</h2>
            <div className="h-px flex-1 bg-black opacity-10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.leaderboard.slice(0, 3).map((entry, idx) => {
              const colors = [
                { bg: "#FFD700", label: "GOLD", emoji: "👑" },
                { bg: "#C0C0C0", label: "SILVER", emoji: "🥈" },
                { bg: "#CD7F32", label: "BRONZE", emoji: "🥉" }
              ];
              const theme = colors[idx];
              
              return (
                <div 
                  key={entry.user_id} 
                  className="relative overflow-hidden rounded-2xl border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center"
                  style={{ backgroundColor: theme.bg }}
                >
                  <div className="absolute top-2 right-4 text-4xl opacity-20 font-black italic">#{idx + 1}</div>
                  <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-full border-4 border-black bg-white flex items-center justify-center text-3xl font-black overflow-hidden shadow-inner">
                      {entry.name[0]}
                    </div>
                    {idx === 0 && <span className="absolute -top-2 -right-2 text-3xl drop-shadow-md">{theme.emoji}</span>}
                  </div>
                  <h3 className="text-xl font-black uppercase truncate w-full">{entry.name}</h3>
                  <p className="ms-mono text-[10px] font-bold opacity-60 uppercase mb-4">{entry.role}</p>
                  
                  <div className="mb-6 flex flex-col items-center">
                    <span className="text-4xl font-black">{entry.score}</span>
                    <span className="ms-mono text-[10px] font-bold opacity-60">TOTAL POINTS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full text-[9px] font-black uppercase text-left">
                    <div className="bg-black/5 rounded p-1.5 border border-black/10">
                      <span className="block opacity-60">Filed</span>
                      <span className="text-sm">{entry.issues_filed}</span>
                    </div>
                    <div className="bg-black/5 rounded p-1.5 border border-black/10">
                      <span className="block opacity-60">Resolved</span>
                      <span className="text-sm">{entry.issues_resolved}</span>
                    </div>
                    <div className="bg-black/5 rounded p-1.5 border border-black/10">
                      <span className="block opacity-60">Feedback</span>
                      <span className="text-sm">{entry.feedback_submitted}</span>
                    </div>
                    <div className="bg-black/5 rounded p-1.5 border border-black/10">
                      <span className="block opacity-60">Comments</span>
                      <span className="text-sm">{entry.comments_made}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {data.leaderboard.length > 3 && (
            <div className="rounded-2xl border-2 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <table className="w-full text-left text-sm font-bold">
                <thead className="bg-[#f6f6f6] border-b-2 border-black">
                  <tr className="ms-mono text-[10px] uppercase opacity-60">
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Tester</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Filed</th>
                    <th className="px-6 py-4">Resolved</th>
                    <th className="px-6 py-4">Feedback</th>
                    <th className="px-6 py-4">Comments</th>
                    <th className="px-6 py-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/5">
                  {data.leaderboard.slice(3).map((entry, idx) => (
                    <tr key={entry.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 ms-mono">#{idx + 4}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full border-2 border-black bg-[var(--cream)] flex items-center justify-center text-xs font-black">
                             {entry.name[0]}
                           </div>
                           <span>{entry.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs opacity-60 uppercase">{entry.role}</td>
                      <td className="px-6 py-4">{entry.issues_filed}</td>
                      <td className="px-6 py-4">{entry.issues_resolved}</td>
                      <td className="px-6 py-4">{entry.feedback_submitted}</td>
                      <td className="px-6 py-4">{entry.comments_made}</td>
                      <td className="px-6 py-4 text-right text-xl font-black">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="ms-mono text-[10px] text-slate-400 text-center uppercase tracking-widest">
            This resets with each project — it reflects all-time activity.
          </p>
        </section>
      )}
    </div>
  );
}

