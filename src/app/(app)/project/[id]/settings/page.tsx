"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, MonoBadge } from "@/components/ui";

type PageProps = {
  params: {
    id: string;
  };
};

type Tab = "general" | "members" | "thresholds" | "danger";

type ProjectData = {
  id: string;
  name: string;
  description: string;
  genre: string;
  platforms: string;
  status: string;
  cover_image_url: string;
};

type Member = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  invited_at: string;
  invite_token: string;
};

type Config = {
  negative_feedback_threshold: number;
  bug_volume_threshold: number;
  show_leaderboard: boolean;
};

export default function ProjectSettingsPage({ params }: PageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [config, setConfig] = useState<Config>({
    negative_feedback_threshold: 10,
    bug_volume_threshold: 5,
    show_leaderboard: true
  });

  const [inviteForm, setInviteForm] = useState({ email: "", role: "developer" });
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, mRes, cRes] = await Promise.all([
        fetch(`/api/projects/${params.id}`),
        fetch(`/api/projects/${params.id}/members`),
        fetch(`/api/projects/${params.id}/config`)
      ]);

      if (pRes.status === 403) {
        router.push(`/project/${params.id}`);
        return;
      }

      const pData = await pRes.json();
      const mData = await mRes.json();
      const cData = await cRes.json();
      
      setProject(pData.project);
      setMembers(mData.members || []);
      setInvites(mData.pending || []);
      if (cData.config) {
        setConfig({
          ...cData.config,
          show_leaderboard: cData.config.show_leaderboard === 1
        });
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to load settings");
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch(`/api/projects/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(project)
        }),
        fetch(`/api/projects/${params.id}/config`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ show_leaderboard: config.show_leaderboard })
        })
      ]);
      alert("Settings updated!");
    } catch (err) {
      setError("Failed to update general settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/projects/${params.id}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      alert("Thresholds updated!");
    } catch (err) {
      setError("Failed to update thresholds");
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${params.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (data.inviteLink) {
        setLastInviteLink(data.inviteLink);
        setInviteForm({ email: "", role: "developer" });
        fetchData();
      } else {
        alert(data.error || "Invite failed");
      }
    } catch (err) {
      alert("Invite failed");
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    try {
      await fetch(`/api/projects/${params.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      fetchData();
    } catch (err) {
      alert("Role update failed");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from project?`)) return;
    try {
      await fetch(`/api/projects/${params.id}/members/${userId}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert("Removal failed");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await fetch(`/api/projects/${params.id}/invites/${inviteId}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert("Revoke failed");
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== project?.name) {
      alert("Project name mismatch!");
      return;
    }
    if (!confirm("FINAL WARNING: This will delete ALL data. Proceed?")) return;
    try {
      await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
      router.push("/");
    } catch (err) {
      alert("Deletion failed");
    }
  };

  if (loading) return <div className="p-8 font-syne text-xl">Loading project settings...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black uppercase tracking-tight">Project Settings</h1>
        <MonoBadge label={project?.status || "active"} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 rounded-xl border-2 border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {(["general", "members", "thresholds", "danger"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === t ? "bg-black text-white" : "hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border-2 border-[var(--coral)] bg-[#fff4ef] p-4 text-sm font-bold">
          {error}
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && project && (
        <form onSubmit={handleUpdateGeneral} className="rounded-2xl border-2 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase">Project Name</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                className="w-full rounded-lg border-2 border-black px-4 py-3 font-bold focus:bg-[var(--yellow)] outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase">Genre</label>
              <select
                value={project.genre}
                onChange={(e) => setProject({ ...project, genre: e.target.value })}
                className="w-full rounded-lg border-2 border-black px-4 py-3 font-bold"
              >
                <option>Action</option>
                <option>RPG</option>
                <option>Strategy</option>
                <option>Simulation</option>
                <option>Platformer</option>
                <option>Horror</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase">Description</label>
            <textarea
              value={project.description || ""}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              className="h-32 w-full rounded-lg border-2 border-black px-4 py-3 font-bold outline-none focus:bg-[var(--yellow)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase">Platforms</label>
            <input
              type="text"
              value={project.platforms}
              onChange={(e) => setProject({ ...project, platforms: e.target.value })}
              placeholder="PC, Mobile, Consoles..."
              className="w-full rounded-lg border-2 border-black px-4 py-3 font-bold"
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-black uppercase">Global Status</label>
             <div className="flex gap-4">
                {["active", "archived", "shipped"].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="status" 
                      checked={project.status === s} 
                      onChange={() => setProject({...project, status: s})}
                      className="accent-black h-4 w-4"
                    />
                    <span className="text-sm font-bold capitalize">{s}</span>
                  </label>
                ))}
             </div>
          </div>

          <div className="space-y-2 py-4 border-t-2 border-black border-dashed">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.show_leaderboard}
                onChange={(e) => setConfig({ ...config, show_leaderboard: e.target.checked })}
                className="h-5 w-5 accent-black"
              />
              <div>
                <p className="text-sm font-black uppercase">Show Tester Leaderboard</p>
                <p className="text-[10px] font-bold text-slate-500">Visible to all team members on the project overview page.</p>
              </div>
            </label>
          </div>

          <Button type="submit" variant="dark" disabled={saving}>
            {saving ? "Saving Changes..." : "Save General Settings"}
          </Button>
        </form>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-8">
          {/* Invite Section */}
          <section className="rounded-2xl border-2 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
             <h3 className="mb-4 text-xl font-black uppercase tracking-tight">Invite Team Member</h3>
             <form onSubmit={handleSendInvite} className="flex flex-wrap gap-4">
                <input
                  type="email"
                  required
                  placeholder="name@studio.com"
                  className="flex-1 min-w-[200px] rounded-lg border-2 border-black px-4 py-3 font-bold"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                />
                <select 
                  className="rounded-lg border-2 border-black px-4 py-3 font-bold"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="qa">QA</option>
                  <option value="player">External Player</option>
                </select>
                <Button type="submit" variant="primary">Send Invite</Button>
             </form>

             {lastInviteLink && (
               <div className="mt-6 rounded-lg border-2 border-black bg-[var(--yellow)] p-4">
                  <p className="text-xs font-black uppercase mb-2">Invite link generated!</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={lastInviteLink} 
                      className="flex-1 bg-white border border-black p-2 text-xs font-mono"
                    />
                    <Button size="sm" onClick={() => navigator.clipboard.writeText(lastInviteLink)}>Copy</Button>
                  </div>
                  <p className="mt-2 text-[10px] font-bold">Share this link manually since email is not configured.</p>
               </div>
             )}
          </section>

          {/* Members List */}
          <section className="rounded-2xl border-2 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
             <table className="w-full text-left text-sm">
                <thead className="bg-[#f6f6f6] border-b-2 border-black">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map(m => (
                    <tr key={m.user_id}>
                      <td className="px-6 py-4">
                        <p className="font-bold">{m.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{m.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className="rounded border border-black bg-[#fafafa] px-2 py-1 text-xs font-bold"
                          value={m.role}
                          onChange={(e) => handleUpdateMemberRole(m.user_id, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                          <option value="qa">QA</option>
                          <option value="player">External</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="text-[var(--coral)] font-black hover:underline"
                          onClick={() => handleRemoveMember(m.user_id, m.name)}
                        >
                          REMOVE
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invites.map(i => (
                    <tr key={i.id} className="bg-slate-50 italic opacity-70">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-400">{i.email}</p>
                        <p className="text-[10px] font-black uppercase not-italic">Pending Invite</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase">{i.role}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        {new Date(i.invited_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                          className="text-black font-black hover:underline text-xs"
                          onClick={() => handleRevokeInvite(i.id)}
                         >
                           REVOKE
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </section>
        </div>
      )}

      {/* Thresholds Tab */}
      {activeTab === "thresholds" && (
        <form onSubmit={handleUpdateConfig} className="rounded-2xl border-2 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-8">
           <h3 className="text-xl font-black uppercase tracking-tight">Automation Thresholds</h3>
           <p className="text-sm text-slate-500">Define when the project should trigger critical alerts and dashboard highlights.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <label className="block text-sm font-black uppercase">
                   Negative Feedback Spike
                 </label>
                 <div className="flex items-center gap-4">
                   <input 
                    type="number"
                    min="1"
                    max="100"
                    className="w-24 rounded-lg border-2 border-black p-3 text-xl font-black"
                    value={config.negative_feedback_threshold}
                    onChange={(e) => setConfig({...config, negative_feedback_threshold: parseInt(e.target.value)})}
                   />
                   <span className="text-xs font-bold text-slate-400">Unique submissions within 24h</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="block text-sm font-black uppercase">
                   High Bug Volume (Resolved)
                 </label>
                 <div className="flex items-center gap-4">
                   <input 
                    type="number"
                    min="1"
                    max="50"
                    className="w-24 rounded-lg border-2 border-black p-3 text-xl font-black"
                    value={config.bug_volume_threshold}
                    onChange={(e) => setConfig({...config, bug_volume_threshold: parseInt(e.target.value)})}
                   />
                   <span className="text-xs font-bold text-slate-400">Resolved bugs per build average</span>
                 </div>
              </div>
           </div>

           <Button type="submit" variant="dark" disabled={saving}>
             {saving ? "Saving..." : "Update Thresholds"}
           </Button>
        </form>
      )}

      {/* Danger Zone */}
      {activeTab === "danger" && (
        <div className="rounded-2xl border-2 border-[var(--coral)] bg-[#fff4ef] p-8 shadow-[12px_12px_0px_0px_var(--coral)] space-y-6">
           <h3 className="text-2xl font-black uppercase text-[var(--coral)]">Irreversible Actions</h3>
           <p className="text-sm font-bold">Deleting the project will remove all builds, feedback logs, and issue history. This is permanent.</p>
           
           <div className="space-y-2">
              <label className="text-xs font-black uppercase">Type project name <span className="text-[var(--coral)]">"{project?.name}"</span> to confirm</label>
              <input 
                type="text"
                placeholder="Confirm project name"
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-3 font-bold outline-none"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
           </div>

           <Button 
            className="w-full bg-[var(--coral)] border-2 border-black text-white py-4"
            onClick={handleDeleteProject}
            disabled={deleteConfirm !== project?.name}
           >
             DELETE PROJECT PERMANENTLY
           </Button>
        </div>
      )}
    </div>
  );
}
