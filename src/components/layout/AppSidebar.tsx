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

const items = [
  { to: "/", label: "Painel Geral", icon: LayoutDashboard, badge: null as string | null },
  { to: "/lojas", label: "Lojas", icon: Store, badge: "10" },
  { to: "/conciliacao", label: "Conciliação Diária", icon: FileText, badge: null },
  { to: "/patio", label: "Carros no Pátio", icon: Car, badge: null },
  { to: "/recebiveis", label: "Recebíveis", icon: Receipt, badge: null },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, badge: "3" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, badge: null },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[220px] flex-col border-r bg-[var(--sidebar)]">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Car className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-foreground">Mecânica Popular</div>
          <div className="text-[11px] text-muted-foreground">Financeiro</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150 border-l-2 min-h-[40px]",
                active
                  ? "bg-primary/15 text-foreground border-primary"
                  : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground border-transparent",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                ].join(" ")}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    item.label === "Alertas"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-[var(--surface-3)] text-muted-foreground",
                  ].join(" ")}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-[11px] font-semibold text-foreground">
            AF
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-medium text-foreground">Ana Financeiro</div>
            <div className="text-[11px] text-muted-foreground">Analista</div>
          </div>
        </div>
        <div className="rounded-md border bg-[var(--surface-2)] px-3 py-2 text-[11px] text-muted-foreground tabular">
          Hoje · 14/05/2026
        </div>
      </div>
    </aside>
  );
}
