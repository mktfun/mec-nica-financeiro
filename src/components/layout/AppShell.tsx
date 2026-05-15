import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Store, FileText, AlertTriangle, Settings, Menu, Car, Plus, Receipt } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/conciliacao", label: "Concil.", icon: FileText },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
];

const drawerItems = [
  { to: "/", label: "Painel Geral", icon: LayoutDashboard },
  { to: "/lojas", label: "Lojas", icon: Store, badge: "10" },
  { to: "/conciliacao", label: "Conciliação Diária", icon: FileText },
  { to: "/patio", label: "Carros no Pátio", icon: Car },
  { to: "/recebiveis", label: "Recebíveis", icon: Receipt },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle, badge: "3" },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const moreItems = [
  { to: "/lojas", label: "Lojas", icon: Store },
  { to: "/patio", label: "Pátio", icon: Car },
  { to: "/recebiveis", label: "Recebíveis", icon: Receipt },
  { to: "/configuracoes", label: "Config.", icon: Settings },
];

export function AppShell({
  children,
  crumbs,
}: {
  children: React.ReactNode;
  crumbs: string[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-[200px]">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b glass-panel px-4">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-[var(--surface-2)] transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 glass-sidebar">
              <SheetHeader className="px-5 py-5 border-b border-[oklch(1_0_0_/_5%)]">
                <SheetTitle className="flex items-center gap-3 text-left">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[13px] font-bold">Mecânica Popular</div>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Financeiro</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="px-3 py-3 space-y-0.5">
                {drawerItems.map((it) => {
                  const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium min-h-[44px] transition-all duration-200",
                        active
                          ? "bg-primary/12 text-foreground shadow-[inset_3px_0_0_var(--primary)]"
                          : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                      <span className="flex-1">{it.label}</span>
                      {it.badge && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            it.label === "Alertas"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-[var(--surface-3)] text-muted-foreground",
                          )}
                        >
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
            <Car className="h-4 w-4 text-primary" />
            Mecânica Popular
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Desktop topbar */}
        <div className="hidden md:block">
          <Topbar crumbs={crumbs} />
        </div>

        {/* Main content — CSS animation only, no framer-motion */}
        <main key={pathname} className="page-enter px-4 md:px-8 py-6 pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — 4 items */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t glass-panel grid grid-cols-4">
        {mobileNavItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium min-h-[56px] transition-colors relative",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <span className="absolute top-1.5 h-1 w-5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              )}
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium min-h-[56px] text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>

      {/* More drawer (mobile) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="glass-panel rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-left text-[15px]">Mais</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2 py-4">
            {moreItems.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl glass-elevated py-4 text-[11px] font-medium text-foreground hover:bg-[var(--surface-3)] transition-colors min-h-[80px]"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
