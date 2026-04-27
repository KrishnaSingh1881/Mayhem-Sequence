type TopbarProps = {
  title?: string;
};

export default function Topbar({ title = "Dashboard" }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
      <span className="text-xs text-slate-500">Signed in</span>
    </header>
  );
}
