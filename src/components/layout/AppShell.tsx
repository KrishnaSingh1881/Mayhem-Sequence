"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Bug,
  MessageSquare,
  History,
  AlertCircle,
  Settings,
  Zap,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Download,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: {
    dotColor?: string;
  };
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const routeProjectId = params?.id as string | undefined;

  // Persist the last visited project so nav links work from any page
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (routeProjectId) {
      localStorage.setItem("ms_last_project", routeProjectId);
      setActiveProjectId(routeProjectId);
    } else {
      const stored = localStorage.getItem("ms_last_project");
      setActiveProjectId(stored);
    }
  }, [routeProjectId]);

  const pid = activeProjectId;

  const mainItems: NavItem[] = [
    { label: "Overview", href: pid ? `/project/${pid}` : "/", icon: <LayoutDashboard size={20} /> },
    { label: "Builds", href: pid ? `/project/${pid}/builds` : "/", icon: <Box size={20} /> },
    { label: "Issues", href: pid ? `/project/${pid}/issues` : "/", icon: <Bug size={20} /> },
    { label: "Feedback", href: pid ? `/project/${pid}/feedback` : "/", icon: <MessageSquare size={20} /> },
    { label: "Changelog", href: pid ? `/project/${pid}/changelog` : "/", icon: <History size={20} /> },
    {
      label: "Alerts",
      href: pid ? `/project/${pid}/alerts` : "/",
      icon: <AlertCircle size={20} />,
      badge: { dotColor: "var(--coral)" },
    },
  ];

  const aiItems: NavItem[] = [
    { label: "AI Insights", href: pid ? `/project/${pid}/ai` : "/", icon: <Zap size={20} /> },
  ];

  const settingsItems: NavItem[] = [
    { label: "Settings", href: pid ? `/project/${pid}/settings` : "/", icon: <Settings size={20} /> },
  ];

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;
  const sidebarWidth = isDesktop ? (collapsed ? "64px" : "240px") : "0px";

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      {(!collapsed || !isDesktop) && (
        <h3 className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#888] ms-mono">
          {title}
        </h3>
      )}
      <ul className="space-y-1 px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 h-10 px-3 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-[var(--yellow)] text-black border-[2px] border-black shadow-[2px_2px_0px_#0d0d0d]"
                      : "text-[#888] hover:bg-white/10 hover:text-[var(--cream)]"
                  }
                  ${collapsed && isDesktop ? "justify-center px-0" : ""}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="relative">
                  {item.icon}
                  {item.badge?.dotColor && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-black"
                      style={{ backgroundColor: item.badge.dotColor }}
                    />
                  )}
                </span>
                {(!collapsed || !isDesktop) && (
                  <span className="text-sm font-bold truncate">{item.label}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--black)] selection:bg-[var(--yellow)] selection:text-black">
      {/* Mobile overlay */}
      {!isDesktop && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-[#0d0d0d] text-[var(--cream)] border-r-[2.5px] border-black z-[110]
          transition-all duration-300 ease-in-out
          ${isDesktop ? "translate-x-0" : mobileOpen ? "translate-x-0 w-[240px]" : "-translate-x-full w-[240px]"}
        `}
        style={{ width: isDesktop ? sidebarWidth : "240px" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 mb-4">
            <Link
              href="/"
              className={`bg-[var(--yellow)] border-[2.5px] border-black p-2 rounded-lg text-black flex items-center gap-3 ${
                collapsed && isDesktop ? "justify-center" : ""
              }`}
            >
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-[var(--yellow)] font-black text-xl">
                M
              </div>
              {(!collapsed || !isDesktop) && (
                <span className="font-black text-sm tracking-tighter uppercase">Mayhem Seq</span>
              )}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {renderNavGroup("Main", mainItems)}
            {renderNavGroup("AI", aiItems)}
            {renderNavGroup("System", settingsItems)}
          </nav>

          <div className="p-4 border-t border-white/10">
            {isDesktop && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-center h-10 rounded-lg hover:bg-white/10 transition-colors mb-2"
              >
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            )}
            <div
              className={`flex items-center gap-3 ${collapsed && isDesktop ? "justify-center" : ""}`}
            >
              <div className="w-10 h-10 bg-[var(--purple)] border-[2px] border-black rounded-full flex items-center justify-center text-black font-bold shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || "??"}
              </div>
              {(!collapsed || !isDesktop) && (
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{user?.name || "Guest"}</p>
                  <p className="text-[10px] opacity-50 ms-mono truncate">
                    {user?.email || "Not logged in"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="transition-all duration-300" style={{ marginLeft: isDesktop ? sidebarWidth : "0px" }}>
        <header className="sticky top-0 z-[90] bg-[var(--cream)]/80 backdrop-blur-md border-b-[2.5px] border-black h-16 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            {!isDesktop && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 border-[2.5px] border-black bg-white shadow-[2px_2px_0px_#0d0d0d] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-xl font-black uppercase tracking-tight">
              {pathname === "/" ? "Dashboard" : pathname?.split("/").pop()?.replace(/-/g, " ")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-2 px-3 h-10 border-[2.5px] border-black bg-white shadow-[2px_2px_0px_#0d0d0d] ms-mono text-sm font-bold">
              <Search size={16} />
              <span>Search...</span>
            </button>
            <button className="p-2 border-[2.5px] border-black bg-white shadow-[2px_2px_0px_#0d0d0d]">
              <Bell size={20} />
            </button>
            <button className="hidden sm:flex items-center gap-2 px-4 h-10 border-[2.5px] border-black bg-[var(--yellow)] shadow-[2px_2px_0px_#0d0d0d] text-sm font-bold active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </header>

        <main className={`min-h-screen ${isMobile ? "p-3" : "p-8"}`}>{children}</main>
      </div>

      <style jsx global>{`
        .table-container {
          overflow-x: auto;
          border: 2.5px solid #0d0d0d;
          box-shadow: 4px 4px 0px #0d0d0d;
          background: white;
          width: 100%;
        }
        @media (max-width: 768px) {
          .table-container {
            margin: 0 -12px;
            width: calc(100% + 24px);
            border-left: none;
            border-right: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
