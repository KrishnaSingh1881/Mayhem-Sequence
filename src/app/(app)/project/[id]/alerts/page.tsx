"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, MonoBadge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

type Alert = {
  id: string;
  type: string;
  message: string;
  build_id: string | null;
  version_name: string | null;
  is_read: number;
  created_at: string;
};

export default function ProjectAlertsPage() {
  const params = useParams();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const isReadParam = filter === "all" ? "all" : filter === "read" ? "true" : "false";
      const res = await fetch(`/api/projects/${params.id}/alerts?is_read=${isReadParam}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [params.id, filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function markRead(aid: string) {
    try {
      const res = await fetch(`/api/alerts/${aid}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Action failed");
      setAlerts((prev) => prev.map((a) => (a.id === aid ? { ...a, is_read: 1 } : a)));
      if (filter === "unread") {
        setAlerts((prev) => prev.filter((a) => a.id !== aid));
      }
    } catch (err) {
      alert("Failed to mark alert as read");
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch(`/api/projects/${params.id}/alerts/read-all`, { method: "PATCH" });
      if (!res.ok) throw new Error("Action failed");
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: 1 })));
      if (filter === "unread") {
        setAlerts([]);
      }
    } catch (err) {
      alert("Failed to mark all as read");
    }
  }

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          {unreadCount > 0 && (
            <span className="ms-mono rounded-full bg-[var(--coral)] px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex rounded-md border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  filter === f ? "bg-black text-white" : "hover:bg-slate-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded border-2 border-black bg-red-100 p-4 font-bold text-red-600">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border-2 border-black border-dashed py-20 text-center text-slate-400">
            No {filter !== "all" ? filter : ""} alerts found.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative flex items-center gap-4 rounded-lg border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-1 ${
                !alert.is_read ? "border-l-[12px]" : "opacity-70"
              }`}
              style={{
                borderLeftColor: !alert.is_read 
                  ? (alert.type.includes("BUG") || alert.type.includes("NEGATIVE") ? "var(--coral)" : "var(--yellow)")
                  : "undefined"
              }}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <MonoBadge
                    label={alert.type.replace(/_/g, " ")}
                    className="text-[10px]"
                  />
                  {alert.version_name && (
                    <span className="ms-mono text-[11px] font-bold text-slate-500 uppercase">
                      • Build {alert.version_name}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900">{alert.message}</p>
                <p className="ms-mono text-[10px] uppercase text-slate-500">
                  {timeAgo(alert.created_at)}
                </p>
              </div>
              {!alert.is_read && (
                <button
                  onClick={() => markRead(alert.id)}
                  className="rounded border-2 border-black bg-[var(--yellow)] px-3 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                >
                  READ
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
