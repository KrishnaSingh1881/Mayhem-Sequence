"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, MonoBadge } from "@/components/ui/primitives";

type ProjectInfo = {
  project_name: string;
  version: string;
  closed?: boolean;
};

export default function PublicFeedbackPage() {
  const { token } = useParams();
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [details, setDetails] = useState({ enjoyed: "", broken: "" });
  const [category, setCategory] = useState("Bug");
  const [platform, setPlatform] = useState("PC");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/public/feedback/${token}`);
        const data = await res.json();
        if (!res.ok) {
          if (data.closed) setInfo(data);
          else setError(data.error || "Session not found");
        } else {
          setInfo(data);
        }
      } catch (err) {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return setError("Please select a rating");
    
    setLoading(true);
    try {
      const res = await fetch(`/api/public/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, details, category, platform }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !info) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent" />
    </div>
  );

  if (error && !info) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
      <div className="max-w-md w-full rounded-xl border-2 border-black bg-white p-8 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-2xl font-bold text-red-600">⚠️ Error</h1>
        <p className="mt-4 font-medium text-slate-600">{error}</p>
      </div>
    </div>
  );

  if (info?.closed) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4">
      <div className="max-w-md w-full rounded-xl border-2 border-black bg-white p-8 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-extrabold uppercase">{info.project_name}</h1>
        <div className="mt-6 space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-3xl">🔒</div>
          <p className="text-lg font-bold">Feedback collection for this build is closed.</p>
          <p className="text-sm text-slate-500">Thank you for your interest in improving the game!</p>
        </div>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-4 text-center">
      <div className="max-w-md w-full rounded-xl border-2 border-black bg-white p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--green)] border-2 border-black text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          🎮
        </div>
        <h2 className="mt-8 text-3xl font-black italic uppercase">Thanks!</h2>
        <p className="mt-4 text-lg font-bold leading-tight">Your feedback was recorded for {info?.project_name}.</p>
        <p className="mt-2 text-sm font-medium text-slate-500">Every piece of feedback helps us build a better experience.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)] pb-12">
      <nav className="flex h-16 items-center justify-between border-b-2 border-black bg-white px-6">
        <h1 className="text-xl font-black uppercase tracking-tighter italic">{info?.project_name}</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Build</span>
          <MonoBadge label={info?.version || "v?.?.?"} />
        </div>
      </nav>

      <main className="mt-12 flex justify-center px-4">
        <div className="w-full max-w-[520px] rounded-2xl border-2 border-black bg-white p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
          <header className="mb-8">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Share Your Feedback</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">Help the developers make this build better.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Rating */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Overall Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="text-4xl transition-transform hover:scale-110 active:scale-95"
                    onClick={() => {
                      setRating(star);
                      if (error) setError(null);
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <span className={(hoverRating >= star || rating >= star) ? "text-[var(--amber)]" : "text-slate-200"}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              {rating === 0 && (
                <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider">
                  Please select a rating to continue
                </p>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">What did you enjoy?</label>
                <textarea
                  className={`w-full h-24 rounded-lg border-2 p-3 text-sm font-medium focus:ring-0 focus:border-black transition-colors ${
                    !details.enjoyed.trim() && !details.broken.trim() && error ? "border-[var(--coral)] bg-[var(--coral)]/5" : "border-black"
                  }`}
                  placeholder="Tell us what felt right..."
                  value={details.enjoyed}
                  onChange={(e) => setDetails({ ...details, enjoyed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">What felt broken or confusing?</label>
                <textarea
                  className={`w-full h-24 rounded-lg border-2 p-3 text-sm font-medium focus:ring-0 focus:border-black transition-colors ${
                    !details.enjoyed.trim() && !details.broken.trim() && error ? "border-[var(--coral)] bg-[var(--coral)]/5" : "border-black"
                  }`}
                  placeholder="Bugs, UI issues, or balance problems..."
                  value={details.broken}
                  onChange={(e) => setDetails({ ...details, broken: e.target.value })}
                />
                {!details.enjoyed.trim() && !details.broken.trim() && error && (
                  <p className="text-[10px] font-black ms-mono text-[var(--coral)] uppercase tracking-wider">
                    Please provide at least some detail in either box
                  </p>
                )}
              </div>
            </div>

            {/* Selects */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Category</label>
                <div className="flex flex-wrap gap-2">
                  {["Bug", "UX Issue", "Balance", "Performance", "Feature"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full border-2 border-black px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                        category === cat ? "bg-black text-white" : "bg-white text-black hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {["PC", "Mobile", "Console", "Other"].map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setPlatform(plat)}
                      className={`rounded-full border-2 border-black px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
                        platform === plat ? "bg-black text-white" : "bg-white text-black hover:bg-slate-50"
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              variant="dark"
              type="submit"
              size="lg"
              className="w-full !rounded-xl !py-6 text-lg font-black uppercase tracking-tight shadow-[0px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none bg-[var(--yellow)] border-2 border-black text-black"
              disabled={loading}
            >
              {loading ? "Sending..." : "Submit Feedback"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
