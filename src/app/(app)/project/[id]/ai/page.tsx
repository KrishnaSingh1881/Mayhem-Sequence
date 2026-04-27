"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button, AIOutputBox, AIBadge } from "@/components/ui/primitives";

type Build = {
  id: string;
  version_name: string;
};

export default function ProjectAIPage() {
  const params = useParams();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [buildA, setBuildA] = useState("");
  const [buildB, setBuildB] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuilds() {
      try {
        const res = await fetch(`/api/projects/${params.id}/builds`);
        if (!res.ok) throw new Error("Failed to load builds");
        const data = await res.json();
        setBuilds(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    }
    fetchBuilds();
  }, [params.id]);

  async function handleCompare() {
    if (!buildA || !buildB) {
      setError("Please select two builds to compare");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/builds/compare/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseBuildId: buildA, targetBuildId: buildB }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Comparison failed");
      }

      const data = await res.json();
      setResult(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Lab</h1>
          <p className="text-muted-foreground">Experiment with build comparisons and analysis</p>
        </div>
        <AIBadge label="Experimental" />
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-4 text-xl font-bold">Compare Builds</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Base Build (Older)</label>
              <select
                className="w-full rounded border-2 border-black px-3 py-2"
                value={buildA}
                onChange={(e) => setBuildA(e.target.value)}
              >
                <option value="">Select build...</option>
                {builds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.version_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Target Build (Newer)</label>
              <select
                className="w-full rounded border-2 border-black px-3 py-2"
                value={buildB}
                onChange={(e) => setBuildB(e.target.value)}
              >
                <option value="">Select build...</option>
                {builds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.version_name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              variant="dark"
              onClick={handleCompare}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Compare with AI"}
            </Button>
          </div>
        </section>

        <section className="flex flex-col justify-center rounded-lg border-2 border-black bg-[var(--cream)] p-6 italic">
          <p className="text-sm font-medium">
            AI Compare examines issues resolved, feedback sentiment shifts, and developer notes between two versions to identify performance trends and regression risks.
          </p>
        </section>
      </div>

      {error && (
        <div className="rounded border-2 border-black bg-red-100 p-4 font-bold text-red-600">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Comparison Analysis</h3>
          <AIOutputBox>{result}</AIOutputBox>
        </div>
      )}
    </div>
  );
}
