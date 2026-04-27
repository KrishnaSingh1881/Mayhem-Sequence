"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button, PriorityDot, StatusPill, TagChip } from "@/components/ui";

type PageProps = {
  params: {
    id: string;
    iid: string;
  };
};

type IssueDetail = {
  id: string;
  title: string;
  description: string | null;
  priority: "blocker" | "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "qa" | "resolved";
  assignee_id: string | null;
  assignee_name: string | null;
  build_id: string | null;
  platform_tag: string | null;
  category_tag: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type Comment = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

function prettyDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
}

export default function IssueDetailPage({ params }: PageProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`/api/issues/${params.iid}`);
    if (!response.ok) {
      throw new Error("Failed to load issue detail");
    }
    const data = await response.json();
    setIssue(data.issue as IssueDetail);
    setComments((data.comments || []) as Comment[]);
  }, [params.iid]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        await fetchDetail();
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [fetchDetail]);

  async function updateStatus(nextStatus: IssueDetail["status"]) {
    try {
      setBusy(true);
      const response = await fetch(`/api/issues/${params.iid}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      await fetchDetail();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    try {
      setBusy(true);
      const response = await fetch(`/api/issues/${params.iid}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (!response.ok) throw new Error("Failed to submit comment");
      setCommentText("");
      await fetchDetail();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit comment");
    } finally {
      setBusy(false);
    }
  }

  async function deleteIssue() {
    if (!window.confirm("Delete this issue?")) return;
    try {
      setBusy(true);
      const response = await fetch(`/api/issues/${params.iid}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete issue");
      window.location.href = `/project/${params.id}/issues`;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete issue");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded border border-black bg-white p-4">Loading issue...</div>;
  }

  if (!issue) {
    return <div className="rounded border-2 border-[var(--coral)] bg-[#fff4ef] p-4">Issue not found.</div>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border-2 border-[var(--coral)] bg-[#fff4ef] p-3 text-sm font-semibold">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[65%_35%]">
        <section className="space-y-4 rounded-lg border-2 border-black bg-white p-4">
          <div className="flex items-center gap-2">
            <PriorityDot priority={issue.priority} />
            <h1 className="text-2xl font-extrabold">{issue.title}</h1>
          </div>

          <div className="prose max-w-none rounded border border-black bg-[#fafafa] p-3">
            <ReactMarkdown>{issue.description || "_No description provided._"}</ReactMarkdown>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold">Comments</h2>
            <textarea
              className="h-24 w-full rounded border-2 border-black px-3 py-2"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a comment..."
            />
            <Button variant="primary" onClick={submitComment} disabled={busy}>
              Submit Comment
            </Button>
            <div className="space-y-2">
              {comments.map((comment) => (
                <article key={comment.id} className="rounded border border-black p-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                    <span>{comment.author_name}</span>
                    <span>{prettyDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-3 rounded-lg border-2 border-black bg-white p-4">
          <h2 className="text-lg font-extrabold">Metadata</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Priority</span>
              <span className="capitalize">{issue.priority}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Status</span>
              <StatusPill status={issue.status} />
            </div>
            <label className="block space-y-1">
              <span className="font-semibold">Change status</span>
              <select
                className="w-full rounded border-2 border-black px-2 py-2"
                value={issue.status}
                onChange={(event) => updateStatus(event.target.value as IssueDetail["status"])}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="qa">QA</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Assignee</span>
              <span>{issue.assignee_name || issue.assignee_id || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Build</span>
              <span>{issue.build_id || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Platform</span>
              {issue.platform_tag ? <TagChip type="platform" label={issue.platform_tag} /> : <span>-</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Category</span>
              {issue.category_tag ? <TagChip type="category" label={issue.category_tag} /> : <span>-</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Created</span>
              <span>{prettyDate(issue.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Updated</span>
              <span>{prettyDate(issue.updated_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Resolved</span>
              <span>{prettyDate(issue.resolved_at)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full" variant="secondary" onClick={() => window.history.back()}>
              Back
            </Button>
            <Button className="w-full" variant="coral" onClick={deleteIssue} disabled={busy}>
              Delete
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
