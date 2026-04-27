"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  is_read: number;
  created_at: string;
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("Count fetch failed", err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error("Notifications fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const markAsRead = async (nid: string) => {
    try {
      await fetch(`/api/notifications/${nid}/read`, { method: "PATCH" });
      setNotifications(prev => prev.map(n => n.id === nid ? { ...n, is_read: 1 } : n));
      fetchUnreadCount();
    } catch (err) {
      console.error("Mark read failed", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read failed", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "issue": return "🐛";
      case "build": return "📦";
      case "feedback": return "💬";
      default: return "🔔";
    }
  };

  const getNavigationUrl = (n: Notification) => {
    if (!n.project_id) return "#";
    if (n.entity_type === "issue") return `/project/${n.project_id}/issues`; // Assuming list view for now or can expand to detail
    if (n.entity_type === "build") return `/project/${n.project_id}/builds`;
    if (n.entity_type === "feedback") return `/project/${n.project_id}/feedback`;
    return `/project/${n.project_id}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded border border-[#1f1f1f] bg-white text-lg transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="ms-mono absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-bold text-white border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] origin-top-right rounded-lg border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-black bg-[#fafafa] px-4 py-2">
            <h3 className="text-xs font-extrabold uppercase tracking-widest">Notifications</h3>
            <button
              onClick={markAllAsRead}
              className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-black"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse uppercase">
                Synchronizing...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase italic">
                No recent activity.
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={getNavigationUrl(n)}
                  onClick={() => markAsRead(n.id)}
                  className={`flex gap-3 border-b border-slate-100 p-4 transition-colors hover:bg-slate-50 ${
                    !n.is_read ? "border-l-[3px] border-l-[var(--coral)]" : ""
                  }`}
                >
                  <span className="text-xl shrink-0">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`line-clamp-2 text-xs leading-relaxed ${!n.is_read ? "font-bold text-black" : "text-slate-600"}`}>
                      {n.message}
                    </p>
                    <p className="ms-mono mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <Link 
            href="#" 
            className="block border-t-2 border-black bg-[#fafafa] py-2 text-center text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100"
          >
            View All History
          </Link>
        </div>
      )}
    </div>
  );
}
