import Link from "next/link";

const navItems = [
  { label: "Overview", href: "" },
  { label: "Builds", href: "/builds" },
  { label: "Issues", href: "/issues" },
  { label: "Feedback", href: "/feedback" },
  { label: "Changelog", href: "/changelog" },
  { label: "Alerts", href: "/alerts" },
  { label: "Settings", href: "/settings" },
  { label: "AI", href: "/ai" },
];

type SidebarProps = {
  projectId?: string;
};

export default function Sidebar({ projectId = "demo-project" }: SidebarProps) {
  const base = `/project/${projectId}`;

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 p-4 text-slate-100">
      <h2 className="text-lg font-semibold">Mayhem Sequence</h2>
      <p className="mt-1 text-xs text-slate-400">Protected workspace</p>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={`${base}${item.href}`}
            className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
