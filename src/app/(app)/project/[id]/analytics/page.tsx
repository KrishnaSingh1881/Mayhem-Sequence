"use client";

import React, { useEffect, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Filter, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Target
} from "lucide-react";
import { Button, Skeleton, ErrorCard, EmptyState } from "@/components/ui";
import { useToast } from "@/components/providers/ToastProvider";

// Dynamic imports for charts to prevent SSR issues and reduce initial bundle
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

type AnalyticsState = {
  sentimentTrend: any[];
  feedbackVolume: any[];
  issueResolution: any[];
  avgRating: any[];
  builds: any[];
};

type RangePreset = "7d" | "30d" | "90d" | "custom";

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangePreset>("30d");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [selectedVelocityBuilds, setSelectedVelocityBuilds] = useState<string[]>([]);
  const [velocityData, setVelocityData] = useState<any[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsState>({
    sentimentTrend: [],
    feedbackVolume: [],
    issueResolution: [],
    avgRating: [],
    builds: []
  });

  const fetchVelocity = useCallback(async (bids: string[]) => {
    if (bids.length === 0) return;
    setVelocityLoading(true);
    try {
      const query = `?build_ids=${bids.join(",")}`;
      const res = await fetch(`/api/projects/${params.id}/analytics/feedback-velocity${query}`).then(r => r.json());
      setVelocityData(res);
    } catch (err) {
      showToast("Velocity sync failed", "error");
    } finally {
      setVelocityLoading(false);
    }
  }, [params.id, showToast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = range === "custom" ? customRange.from : `date('now', '-${range.replace('d', '')} days')`;
      const to = range === "custom" ? customRange.to : `date('now')`;
      
      const query = `?from=${from}&to=${to}&build_id=${selectedBuild}`;
      
      const [st, fv, ir, ar, blds] = await Promise.all([
        fetch(`/api/projects/${params.id}/analytics/sentiment-trend${query}`).then(r => r.json()),
        fetch(`/api/projects/${params.id}/analytics/feedback-volume${query}`).then(r => r.json()),
        fetch(`/api/projects/${params.id}/analytics/issue-resolution${query}`).then(r => r.json()),
        fetch(`/api/projects/${params.id}/analytics/avg-rating`).then(r => r.json()),
        fetch(`/api/projects/${params.id}/builds`).then(r => r.json())
      ]);

      const builds = blds.data || [];
      setData({
        sentimentTrend: st,
        feedbackVolume: fv,
        issueResolution: ir,
        avgRating: ar,
        builds
      });

      // Default velocity to last 5 builds if not set
      if (selectedVelocityBuilds.length === 0 && builds.length > 0) {
        const initial = builds.slice(0, 5).map((b: any) => b.id);
        setSelectedVelocityBuilds(initial);
        fetchVelocity(initial);
      }
    } catch (err) {
      setError("Failed to calculate intelligence metrics");
      showToast("Data aggregation failed", "error");
    } finally {
      setLoading(false);
    }
  }, [params.id, range, selectedBuild, customRange, showToast, selectedVelocityBuilds.length, fetchVelocity]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleVelocityBuild = (id: string) => {
    let next;
    if (selectedVelocityBuilds.includes(id)) {
      next = selectedVelocityBuilds.filter(bid => bid !== id);
    } else {
      if (selectedVelocityBuilds.length >= 5) {
        showToast("Maximum 5 builds for comparison", "warning");
        return;
      }
      next = [...selectedVelocityBuilds, id];
    }
    setSelectedVelocityBuilds(next);
    fetchVelocity(next);
  };

  const getLineColors = (index: number) => {
    const colors = ["#4361EE", "#F72585", "#4CC9F0", "#7209B7", "#FFD60A"];
    return colors[index % colors.length];
  };

  if (error) return <div className="p-8"><ErrorCard resource="analytics" onRetry={fetchAll} /></div>;

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="bg-black text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ms-mono animate-pulse">Live Intel</span>
              <Activity size={18} className="text-[var(--coral)]" />
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Intelligence Hub</h1>
           <p className="mt-2 text-sm font-bold opacity-40 uppercase tracking-widest ms-mono">Mayhem-Sequence Tactical Analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_#000]">
           <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg border-[2px] border-black">
              {(["7d", "30d", "90d", "custom"] as RangePreset[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded ${range === r ? "bg-black text-white" : "hover:bg-black/10"}`}
                >
                  {r === "custom" ? "Custom" : r}
                </button>
              ))}
           </div>

           <div className="h-10 w-[2px] bg-black/10 mx-1" />

           <select
             value={selectedBuild}
             onChange={(e) => setSelectedBuild(e.target.value)}
             className="h-12 rounded-xl border-[2.5px] border-black bg-white px-6 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-[var(--yellow)]/30 appearance-none min-w-[180px]"
           >
              <option value="all">Global Build View</option>
              {data.builds.map(b => <option key={b.id} value={b.id}>{b.version_name.toUpperCase()}</option>)}
           </select>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-end gap-4 p-6 rounded-2xl border-[3px] border-black bg-[var(--yellow)] shadow-[8px_8px_0px_#000] animate-in slide-in-from-top-4">
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase opacity-60 ms-mono">Deployment Start</p>
              <input 
                type="date"
                className="h-12 rounded-lg border-[2px] border-black px-4 font-bold"
                value={customRange.from}
                onChange={(e) => setCustomRange({...customRange, from: e.target.value})}
              />
           </div>
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase opacity-60 ms-mono">Deployment End</p>
              <input 
                type="date"
                className="h-12 rounded-lg border-[2px] border-black px-4 font-bold"
                value={customRange.to}
                onChange={(e) => setCustomRange({...customRange, to: e.target.value})}
              />
           </div>
           <Button variant="dark" className="h-12 px-8" onClick={fetchAll}>SYNC DATA</Button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Feedback Velocity (NEW FULL WIDTH) */}
        <section className="lg:col-span-2 group rounded-[2rem] border-[4px] border-black bg-white p-8 shadow-[12px_12px_0px_#000] transition-all">
           <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Activity size={28} className="text-[var(--blue)]" />
                  Feedback Velocity
                </h3>
                <p className="text-[10px] font-black uppercase opacity-30 ms-mono mt-1">Submission influx relative to build birth</p>
              </div>
              
              <div className="flex flex-wrap gap-2 max-w-xl justify-end">
                 {data.builds.slice(0, 8).map((b, idx) => (
                   <button
                     key={b.id}
                     onClick={() => toggleVelocityBuild(b.id)}
                     className={`px-3 py-1.5 rounded-lg border-[2px] border-black text-[9px] font-black uppercase transition-all ${selectedVelocityBuilds.includes(b.id) ? 'bg-black text-white shadow-[2px_2px_0px_var(--yellow)]' : 'bg-white hover:bg-black/5 opacity-50'}`}
                   >
                     {b.version_name}
                   </button>
                 ))}
              </div>
           </div>

           <div className="h-[400px] w-full">
              {velocityLoading ? <Skeleton className="h-full w-full rounded-xl" /> : velocityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={velocityData}>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ border: '3px solid black', borderRadius: '16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', boxShadow: '4px 4px 0px black' }} 
                        cursor={{ stroke: 'black', strokeWidth: 2, strokeDasharray: '4 4' }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20, fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }} />
                      {selectedVelocityBuilds.map((bid, idx) => {
                        const build = data.builds.find(b => b.id === bid);
                        if (!build) return null;
                        return (
                          <Line 
                            key={bid}
                            type="monotone" 
                            dataKey={build.version_name} 
                            stroke={getLineColors(idx)} 
                            strokeWidth={4} 
                            dot={{ r: 4, stroke: 'black', strokeWidth: 2, fill: 'white' }} 
                            activeDot={{ r: 8, stroke: 'black', strokeWidth: 3 }} 
                          />
                        );
                      })}
                   </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState emoji="⏱️" message="No velocity data" subtext="Select builds to compare feedback patterns." />}
           </div>

           {/* Insights */}
           <div className="mt-8 flex flex-wrap gap-4">
              {velocityData.length > 0 && selectedVelocityBuilds.length > 0 && (
                <>
                  <div className="bg-[var(--yellow)]/20 border-[2px] border-black p-4 rounded-xl flex items-center gap-3">
                    <Zap size={20} className="text-[var(--yellow)]" />
                    <p className="text-[10px] font-black uppercase tracking-tight">
                      {velocityData[0][data.builds.find(b => b.id === selectedVelocityBuilds[0])?.version_name || "Latest"]} received the highest initial volume
                    </p>
                  </div>
                  <div className="bg-[var(--blue)]/10 border-[2px] border-black p-4 rounded-xl flex items-center gap-3">
                    <Filter size={20} className="text-[var(--blue)]" />
                    <p className="text-[10px] font-black uppercase tracking-tight">
                      Peak feedback occurs usually between 12-24h post-deployment
                    </p>
                  </div>
                </>
              )}
           </div>
        </section>

        {/* Sentiment Trend */}
        <section className="group rounded-[2rem] border-[4px] border-black bg-white p-8 shadow-[12px_12px_0px_#000] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_#000] transition-all">
           <div className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  <TrendingUp size={28} className="text-[var(--blue)]" />
                  Sentiment Vector
                </h3>
                <p className="text-[10px] font-black uppercase opacity-30 ms-mono mt-1">Cross-build emotional trajectory</p>
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--green)]" /><span className="text-[10px] font-black uppercase">POS</span></div>
                 <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--coral)]" /><span className="text-[10px] font-black uppercase">NEG</span></div>
              </div>
           </div>
           
           <div className="h-[340px] w-full">
              {loading ? <Skeleton className="h-full w-full rounded-xl" /> : data.sentimentTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data.sentimentTrend}>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ border: '3px solid black', borderRadius: '16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', boxShadow: '4px 4px 0px black' }} 
                        cursor={{ stroke: 'black', strokeWidth: 2, strokeDasharray: '4 4' }}
                      />
                      <Line type="monotone" dataKey="positive" stroke="var(--green)" strokeWidth={6} dot={{ r: 0 }} activeDot={{ r: 8, stroke: 'black', strokeWidth: 3 }} />
                      <Line type="monotone" dataKey="negative" stroke="var(--coral)" strokeWidth={6} dot={{ r: 0 }} activeDot={{ r: 8, stroke: 'black', strokeWidth: 3 }} />
                   </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState emoji="📈" message="No sentiment data" subtext="Start collecting feedback to see trends." />}
           </div>
        </section>

        {/* Feedback Volume */}
        <section className="group rounded-[2rem] border-[4px] border-black bg-white p-8 shadow-[12px_12px_0px_#000] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_#000] transition-all">
           <div className="mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Calendar size={28} className="text-[var(--purple)]" />
                Submission Influx
              </h3>
              <p className="text-[10px] font-black uppercase opacity-30 ms-mono mt-1">Daily report volume aggregation</p>
           </div>
           
           <div className="h-[340px] w-full">
              {loading ? <Skeleton className="h-full w-full rounded-xl" /> : data.feedbackVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data.feedbackVolume}>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" hide />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ border: '3px solid black', borderRadius: '16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', boxShadow: '4px 4px 0px black' }} 
                      />
                      <Bar dataKey="count" fill="var(--yellow)" stroke="black" strokeWidth={3} radius={[8, 8, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState emoji="📊" message="No volume data" subtext="Reports will appear here once submitted." />}
           </div>
        </section>

        {/* Issue Resolution */}
        <section className="group rounded-[2rem] border-[4px] border-black bg-white p-8 shadow-[12px_12px_0px_#000] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_#000] transition-all">
           <div className="mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                <Zap size={28} className="text-[var(--yellow)]" />
                Fix Velocity
              </h3>
              <p className="text-[10px] font-black uppercase opacity-30 ms-mono mt-1">Opened vs Resolved issues by category</p>
           </div>
           
           <div className="h-[340px] w-full">
              {loading ? <Skeleton className="h-full w-full rounded-xl" /> : data.issueResolution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data.issueResolution} barGap={8}>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} dy={10} />
                      <Tooltip 
                        contentStyle={{ border: '3px solid black', borderRadius: '16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', boxShadow: '4px 4px 0px black' }} 
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20, fontWeight: 900, fontSize: 10, textTransform: 'uppercase' }} />
                      <Bar dataKey="opened" name="Found" fill="var(--coral)" stroke="black" strokeWidth={3} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resolved" name="Fixed" fill="var(--green)" stroke="black" strokeWidth={3} radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState emoji="🛠️" message="No issue data" subtext="Link issues to feedback to see velocity." />}
           </div>
        </section>

        {/* Avg Rating Leaderboard */}
        <section className="flex flex-col rounded-[2rem] border-[4px] border-black bg-black p-8 shadow-[12px_12px_0px_var(--coral)] text-white">
           <div className="mb-10 flex items-center justify-between">
              <div>
                 <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                   <Target size={28} className="text-[var(--yellow)]" />
                   Build Scoreboard
                 </h3>
                 <p className="text-[10px] font-black uppercase opacity-40 ms-mono mt-1">Version quality ranking</p>
              </div>
           </div>

           <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? [1,2,3].map(i => <Skeleton key={i} height={80} className="w-full rounded-2xl bg-white/10" />) : 
               data.avgRating.length > 0 ? data.avgRating.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 rounded-2xl border-[2px] border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-5">
                     <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black font-black text-xl border-[2.5px] border-white">
                        {idx + 1}
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase opacity-60 ms-mono">{b.version_name}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{b.feedback_count} BATTLE REPORTS</p>
                     </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-4xl font-black italic tracking-tighter leading-none">{b.avg_rating}</p>
                     <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${b.direction === 'up' ? 'bg-[var(--green)] text-black' : 'bg-[var(--coral)] text-white'}`}>
                        {b.direction === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(Number(b.delta)).toFixed(1)} PTS
                     </div>
                  </div>
                </div>
              )) : <p className="text-white/20 font-black uppercase text-center mt-10">No scores recorded yet</p>}
           </div>
        </section>

      </div>
    </div>
  );
}
