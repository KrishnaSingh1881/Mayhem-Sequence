"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button, MonoBadge, AIBadge } from "@/components/ui/primitives";

type ChangelogEntry = {
  id: string;
  project_id: string;
  build_id: string;
  version?: string;
  content: {
    bug_fixes: string[];
    improvements: string[];
    new_features: string[];
  };
  published: number;
  created_at: string;
};

type Build = {
  id: string;
  version: string;
};

export default function ChangelogEditorPage() {
  const { id: projectId } = useParams();
  const [history, setHistory] = useState<ChangelogEntry[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  
  // Editor State
  const [selectedChangelog, setSelectedChangelog] = useState<ChangelogEntry | null>(null);
  const [currentBuildId, setCurrentBuildId] = useState("");
  const [bugFixes, setBugFixes] = useState<string[]>([""]);
  const [improvements, setImprovements] = useState<string[]>([""]);
  const [features, setFeatures] = useState<string[]>([""]);
  const [isPublished, setIsPublished] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<{ section: string; index: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, bRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/changelogs`),
        fetch(`/api/projects/${projectId}/builds`)
      ]);
      const hData = await hRes.json();
      const bData = await bRes.json();
      setHistory(hData.data || []);
      setBuilds(bData.data || []);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetEditor = () => {
    setSelectedChangelog(null);
    setCurrentBuildId("");
    setBugFixes([""]);
    setImprovements([""]);
    setFeatures([""]);
    setIsPublished(false);
    setError(null);
  };

  const loadChangelog = (cl: ChangelogEntry) => {
    setSelectedChangelog(cl);
    setCurrentBuildId(cl.build_id);
    setBugFixes(cl.content.bug_fixes.length > 0 ? cl.content.bug_fixes : [""]);
    setImprovements(cl.content.improvements.length > 0 ? cl.content.improvements : [""]);
    setFeatures(cl.content.new_features.length > 0 ? cl.content.new_features : [""]);
    setIsPublished(cl.published === 1);
  };

  const handleAutoPopulate = async () => {
    if (!currentBuildId) return setError("Select a build first");
    setGenerating(true);
    try {
      const res = await fetch(`/api/builds/${currentBuildId}/changelog/preview`);
      const data = await res.json();
      setBugFixes(data.bug_fixes.length > 0 ? data.bug_fixes : [""]);
      setImprovements(data.improvements.length > 0 ? data.improvements : [""]);
      setFeatures(data.new_features.length > 0 ? data.new_features : [""]);
    } catch (err) {
      setError("Failed to preview issues");
    } finally {
      setGenerating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!currentBuildId) return setError("Select a build first");
    setGenerating(true);
    try {
      const res = await fetch(`/api/builds/${currentBuildId}/ai/changelog`, { method: "POST" });
      const data = await res.json();
      if (data.changelog) {
         // Assuming AI returns a text block, we might need to parse it or it returns JSON
         // For this spec, let's assume the AI route returns structured JSON or we map the text
         // Standard mapping if text:
         setBugFixes([data.changelog]); 
      }
    } catch (err) {
      setError("AI Service Unavailable");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentBuildId) return setError("Build ID is required");
    setSaving(true);
    const content = {
      bug_fixes: bugFixes.filter(Boolean),
      improvements: improvements.filter(Boolean),
      new_features: features.filter(Boolean)
    };

    try {
      const url = selectedChangelog 
        ? `/api/changelogs/${selectedChangelog.id}` 
        : `/api/projects/${projectId}/changelogs`;
      
      const res = await fetch(url, {
        method: selectedChangelog ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          build_id: currentBuildId,
          content,
          published: isPublished ? 1 : 0
        })
      });

      if (!res.ok) throw new Error("Save operation failed");
      
      await fetchData();
      resetEditor();
    } catch (err) {
      setError("Failed to save changelog");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (pendingFocus) {
      const el = document.getElementById(`input-${pendingFocus.section}-${pendingFocus.index}`);
      if (el) {
        (el as HTMLInputElement).focus();
        setPendingFocus(null);
      }
    }
  }, [pendingFocus]);

  const renderSection = (title: string, items: string[], setItems: (vals: string[]) => void, color: string) => (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="group flex gap-2">
            <input
              id={`input-${title}-${idx}`}
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[idx] = e.target.value;
                setItems(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  const next = [...items];
                  next.splice(idx + 1, 0, "");
                  setItems(next);
                  setPendingFocus({ section: title, index: idx + 1 });
                }
              }}
              className="flex-1 rounded-none border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all focus:translate-x-[-1px] focus:translate-y-[-1px] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              placeholder={`Add ${title.toLowerCase()}...`}
            />
            <button
              onClick={() => setItems(items.filter((_, i) => i !== idx))}
              className="flex h-10 w-10 items-center justify-center border-2 border-black bg-[var(--coral)] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => setItems([...items, ""])}
          className="ms-mono text-[10px] font-black uppercase tracking-wider text-black underline decoration-2 underline-offset-4 hover:text-[var(--blue)] transition-colors"
        >
          + Add Line
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      {/* Left Panel: History */}
      <aside className="flex w-72 flex-col rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b-2 border-black bg-[#fafafa] px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button 
            onClick={resetEditor}
            className={`w-full rounded-lg p-3 text-left transition-colors border-2 ${!selectedChangelog ? 'border-black bg-[var(--yellow)]' : 'border-transparent hover:bg-slate-50'}`}
          >
            <span className="text-xs font-bold uppercase tracking-tight">+ New Changelog</span>
          </button>
          {history.map((cl) => (
            <button
              key={cl.id}
              onClick={() => loadChangelog(cl)}
              className={`w-full rounded-lg p-3 text-left transition-colors border-2 ${selectedChangelog?.id === cl.id ? 'border-black bg-[var(--yellow)]' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black italic">v{cl.version || "?.??"}</span>
                <MonoBadge label={cl.published ? "Live" : "Draft"} />
              </div>
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                {new Date(cl.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Right Panel: Editor */}
      <main className="flex-1 overflow-y-auto rounded-xl border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#fafafa] px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-widest">
              {selectedChangelog ? "Edit Changelog" : "New Changelog"}
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black">Build:</label>
              <select
                value={currentBuildId}
                onChange={(e) => setCurrentBuildId(e.target.value)}
                className="rounded-none border-2 border-black bg-white px-2 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              >
                <option value="">Select Version</option>
                {builds.map(b => <option key={b.id} value={b.id}>{b.version}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="secondary" size="xs" onClick={handleAutoPopulate} disabled={generating}>
               Auto-Populate
             </Button>
             <Button variant="dark" size="xs" onClick={handleAIGenerate} disabled={generating}>
               <AIBadge />
               AI Generate
             </Button>
          </div>
        </div>

        <div className="p-8 space-y-10">
          {error && <div className="rounded border-2 border-black bg-red-50 p-4 text-xs font-bold text-red-600">⚠️ {error}</div>}
          
          <div className="rounded-none bg-black p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,255,157,0.3)]">
             <p className="ms-mono text-[10px] font-black text-[var(--green)] uppercase tracking-widest text-center">
               ▸ AI-GENERATED CONTENT. REVIEW BEFORE PUBLISHING.
             </p>
          </div>

          <div className="space-y-10">
            {renderSection("Bug Fixes", bugFixes, setBugFixes, "var(--coral)")}
            {renderSection("Improvements", improvements, setImprovements, "var(--blue)")}
            {renderSection("New Features", features, setFeatures, "var(--green)")}
          </div>

          <div className="flex items-center justify-between border-t-2 border-black pt-8">
            <div className="flex items-center gap-6">
              <span className="text-xs font-black uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    checked={!isPublished} 
                    onChange={() => setIsPublished(false)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 border-2 border-black transition-all ${!isPublished ? 'bg-[var(--yellow)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`} />
                  <span className={`text-xs font-black uppercase tracking-tight transition-colors ${!isPublished ? 'text-black' : 'text-slate-400 group-hover:text-black'}`}>Draft</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    checked={isPublished} 
                    onChange={() => setIsPublished(true)}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 border-2 border-black transition-all ${isPublished ? 'bg-[var(--green)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`} />
                  <span className={`text-xs font-black uppercase tracking-tight transition-colors ${isPublished ? 'text-black' : 'text-slate-400 group-hover:text-black'}`}>Published</span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={resetEditor}>Discard</Button>
              <Button variant="dark" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : (selectedChangelog ? "Update Changelog" : "Create Changelog")}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
