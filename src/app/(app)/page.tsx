"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";

type Project = {
  id: string;
  name: string;
  genre: string;
  platforms: string[];
  description: string | null;
  status: string;
};

const GENRES = ["Action", "RPG", "Strategy", "Puzzle", "Simulation", "Sports", "Horror", "Adventure", "Other"];
const PLATFORMS = ["PC", "PlayStation", "Xbox", "Switch", "Mobile", "Web", "VR"];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    genre: "Action",
    platforms: ["PC"] as string[],
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = () => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  function togglePlatform(p: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setFormError("Project name is required.");
      return;
    }
    if (form.platforms.length === 0) {
      setFormError("Select at least one platform.");
      return;
    }
    try {
      setCreating(true);
      setFormError(null);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          genre: form.genre,
          platforms: form.platforms,
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }
      setShowModal(false);
      setForm({ name: "", genre: "Action", platforms: ["PC"], description: "" });
      fetchProjects();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl border-2 border-dashed border-slate-300" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Project Switcher</h1>
          <p className="text-slate-500 font-medium mt-1">Select a workspace to manage your game operations.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 h-12 bg-black text-white rounded-xl font-bold hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_var(--purple)] active:translate-y-0 active:shadow-none"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-200 rounded-3xl bg-white/50">
          <div className="w-20 h-20 bg-[var(--yellow)] border-2 border-black rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-[6px_6px_0px_#0d0d0d]">
            🎮
          </div>
          <h2 className="text-2xl font-black uppercase">No projects found</h2>
          <p className="text-slate-500 mt-2">Create your first project to get started.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 flex items-center gap-2 px-6 h-12 bg-black text-white rounded-xl font-bold hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_var(--purple)]"
          >
            <Plus size={18} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group relative bg-white border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_#0d0d0d] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_#0d0d0d] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--yellow)]/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-125" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-[var(--purple)] border-2 border-black rounded-lg flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0px_#0d0d0d]">
                    {project.name[0]}
                  </div>
                  <span className={`px-3 py-1 rounded-full border-2 border-black text-[10px] font-black uppercase ${project.status === 'active' ? 'bg-[var(--green)]' : 'bg-slate-200'}`}>
                    {project.status}
                  </span>
                </div>

                <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-[var(--purple)] transition-colors">{project.name}</h3>
                <p className="text-slate-500 text-sm font-medium mt-1 mb-4 line-clamp-2">{project.description || "No description provided."}</p>

                <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-slate-100">
                  <div className="flex gap-1 flex-wrap">
                    {project.platforms.map(p => (
                      <span key={p} className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">{p}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 font-bold text-sm">
                    <span>Enter</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--cream)] border-2 border-black rounded-2xl shadow-[8px_8px_0px_#0d0d0d] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b-2 border-black">
              <h2 className="text-2xl font-black uppercase tracking-tight">New Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="h-9 w-9 border-2 border-black rounded-lg bg-white flex items-center justify-center hover:bg-[var(--coral)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="rounded-lg border-2 border-[var(--coral)] bg-[var(--coral)]/10 px-4 py-3 text-sm font-bold text-red-700">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Project Name *</label>
                <input
                  className="w-full h-11 rounded-lg border-2 border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)]"
                  placeholder="e.g. Galaxy Siege"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Genre *</label>
                <select
                  className="w-full h-11 rounded-lg border-2 border-black px-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--yellow)] bg-white"
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Platforms *</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black uppercase transition-all ${
                        form.platforms.includes(p)
                          ? "bg-black text-white shadow-[2px_2px_0px_var(--purple)]"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Description</label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border-2 border-black p-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--yellow)] resize-none"
                  placeholder="Short description of the project..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full h-12 bg-black text-white rounded-xl font-black uppercase tracking-wide hover:translate-y-[-2px] transition-all shadow-[4px_4px_0px_var(--yellow)] disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0 active:shadow-none"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
