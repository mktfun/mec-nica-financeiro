import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  FileText,
  Car,
  Receipt,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Painel Geral", icon: LayoutDashboard, badge: null as string | null },
  { to: "/lojas", label: "Lojas", icon: Store, badge: "10" },
  { to: "/conciliacao", label: "Conciliação", icon: FileText, badge: null },
  { to: "/patio", label: "Pátio", icon: Car, badge: null },
  { to: "/recebiveis", label: "Recebíveis", icon: Receipt, badge: null },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, badge: "3" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, badge: null },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[200px] flex-col glass-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary shadow-[0_0_12px_oklch(0.62_0.19_259_/_20%)]">
          <Car className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold text-foreground">Mecânica Popular</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Financeiro</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-primary/12 text-foreground shadow-[inset_3px_0_0_var(--primary),_-4px_0_12px_oklch(0.62_0.19_259_/_15%)]"
                  : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[20px] text-center",
                    item.label === "Alertas"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-[var(--surface-3)] text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-4 h-px bg-[oklch(1_0_0_/_5%)]" />

      {/* Footer */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
            AF
          </div>
          <div className="leading-tight">
            <div className="text-[12px] font-semibold text-foreground">Ana Financeiro</div>
            <div className="text-[10px] text-muted-foreground">Analista</div>
          </div>
        </div>
        <div className="rounded-lg glass-panel px-3 py-2 text-[10px] font-medium text-muted-foreground tabular text-center">
          Hoje · 15/05/2026
        </div>
      </div>
    </aside>
  );
}
