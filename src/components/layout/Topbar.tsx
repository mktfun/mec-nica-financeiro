import { ChevronRight, Search } from "lucide-react";

interface TopbarProps {
  crumbs: string[];
}

export function Topbar({ crumbs }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-[var(--background)]/80 px-6 backdrop-blur">
      <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {crumbs.map((c, i) => (
          <div key={c} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : ""}>{c}</span>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-md border bg-[var(--surface-1)] px-3 py-1.5 text-[12px] text-muted-foreground w-64">
          <Search className="h-3.5 w-3.5" />
          <span>Buscar OS, loja, recebível…</span>
        </div>
      </div>
    </header>
  );
}
