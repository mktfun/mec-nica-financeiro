import { ChevronRight, Search } from "lucide-react";

interface TopbarProps {
  crumbs: string[];
}

export function Topbar({ crumbs }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b glass-panel px-6">
      <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {crumbs.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
            <span className={i === crumbs.length - 1 ? "text-foreground font-semibold" : ""}>{c}</span>
          </div>
        ))}
      </nav>
      <button className="flex items-center gap-2 rounded-lg glass-elevated px-3 py-1.5 text-[12px] text-muted-foreground w-56 hover:border-[oklch(1_0_0_/_12%)] transition-colors">
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Buscar OS, loja…</span>
        <kbd className="rounded border border-[oklch(1_0_0_/_10%)] bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>
    </header>
  );
}
