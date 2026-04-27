"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MonoBadge } from "@/components/ui/primitives";

type ChangelogEntry = {
  id: string;
  version: string;
  created_at: string;
  content: {
    bug_fixes: string[];
    improvements: string[];
    new_features: string[];
  };
};

export default function PublicChangelogPage() {
  const { projectId } = useParams();
  const [data, setData] = useState<{ project_name: string; changelogs: ChangelogEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChangelogs() {
      try {
        const res = await fetch(`/api/public/changelog/${projectId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Project not found");
      } finally {
        setLoading(false);
      }
    }
    fetchChangelogs();
  }, [projectId]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
       <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4 text-center">
      <div className="max-w-md w-full rounded-lg border-2 border-black bg-white p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-xl font-bold text-red-600">⚠️ {error}</h1>
        <p className="mt-2 text-sm text-slate-500">Please check the URL or try again later.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Standalone Header */}
      <nav className="sticky top-0 z-10 border-b-2 border-black bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6">
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">{data?.project_name}</h1>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Changelog Archive</div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-16">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter sm:text-6xl">What's New</h2>
          <p className="mt-4 text-lg font-bold text-slate-500">Track our progress as we build the ultimate experience.</p>
        </header>

        <div className="space-y-16">
          {data?.changelogs.length === 0 ? (
            <div className="rounded-xl border-2 border-black bg-white p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xl font-bold text-slate-400 uppercase italic">No updates published yet.</p>
            </div>
          ) : (
            data?.changelogs.map((cl) => (
              <article key={cl.id} className="relative pl-8 sm:pl-16">
                {/* Timeline connector */}
                <div className="absolute left-0 top-0 h-full w-[2px] bg-black sm:left-4" />
                <div className="absolute left-[-5px] top-2 h-3 w-3 rounded-full border-2 border-black bg-[var(--yellow)] sm:left-[11px]" />

                <div className="space-y-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-3xl font-black italic uppercase leading-none">Version {cl.version}</span>
                    <div className="flex items-center gap-3">
                      <MonoBadge label={new Date(cl.created_at).toLocaleDateString()} />
                    </div>
                  </div>

                  <div className="grid gap-8 rounded-2xl border-2 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {/* Bug Fixes */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--coral)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--coral)]" />
                        Bug Fixes
                      </h4>
                      <ul className="space-y-2">
                        {cl.content.bug_fixes.length > 0 ? (
                          cl.content.bug_fixes.map((item, i) => (
                            <li key={i} className="text-sm font-semibold leading-snug text-slate-600">• {item}</li>
                          ))
                        ) : (
                          <li className="text-[10px] font-bold uppercase text-slate-300">Nothing fixed this round.</li>
                        )}
                      </ul>
                    </div>

                    {/* Improvements */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--blue)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--blue)]" />
                        Improvements
                      </h4>
                      <ul className="space-y-2">
                        {cl.content.improvements.length > 0 ? (
                          cl.content.improvements.map((item, i) => (
                            <li key={i} className="text-sm font-semibold leading-snug text-slate-600">• {item}</li>
                          ))
                        ) : (
                          <li className="text-[10px] font-bold uppercase text-slate-300">No refinements noted.</li>
                        )}
                      </ul>
                    </div>

                    {/* New Features */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--green)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
                        New Features
                      </h4>
                      <ul className="space-y-2">
                        {cl.content.new_features.length > 0 ? (
                          cl.content.new_features.map((item, i) => (
                            <li key={i} className="text-sm font-bold leading-snug text-black">→ {item}</li>
                          ))
                        ) : (
                          <li className="text-[10px] font-bold uppercase text-slate-300">No major features added.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      <footer className="border-t-2 border-black bg-white py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-2 opacity-30 transition-opacity hover:opacity-100">
           <h3 className="text-xs font-black uppercase tracking-[0.3em]">Mayhem-Sequence</h3>
           <p className="text-[10px] font-bold">Powered by Mayhem-Sequence Game Admin</p>
        </div>
      </footer>
    </div>
  );
}
