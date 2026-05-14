import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Store, FileText, AlertTriangle, Settings, Menu, Car, Plus, HelpCircle, Receipt } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const mobileItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/conciliacao", label: "Concil.", icon: FileText },
  { to: "/patio", label: "Pátio", icon: Car },
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-[220px]">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-[var(--background)]/85 px-4 backdrop-blur">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-[var(--surface-2)] transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 bg-[var(--sidebar)]">
              <SheetHeader className="px-5 py-5 border-b">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Car className="h-4 w-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[14px] font-bold">Mecânica Popular</div>
                    <div className="text-[11px] text-muted-foreground">Financeiro</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="px-3 py-3 space-y-1">
                {drawerItems.map((it) => {
                  const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-[14px] font-medium min-h-[44px] transition-colors",
                        active
                          ? "bg-primary/15 text-foreground border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{it.label}</span>
                      {it.badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
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
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Car className="h-4 w-4 text-primary" />
            Mecânica Popular
          </div>
          <button
            onClick={() => setShortcutsOpen(true)}
            aria-label="Atalhos"
            className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-[var(--surface-2)] transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden md:block">
          <Topbar crumbs={crumbs} />
        </div>

        <main
          key={pathname}
          className="px-4 md:px-8 py-6 pb-24 md:pb-10 animate-in fade-in duration-150"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-[var(--sidebar)] grid grid-cols-5">
        {mobileItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] min-h-[56px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] min-h-[56px] text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="bg-[var(--sidebar)]">
          <SheetHeader>
            <SheetTitle className="text-left">Mais</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 py-4">
            {[
              { to: "/lojas", label: "Lojas", icon: Store },
              { to: "/recebiveis", label: "Recebíveis", icon: Receipt },
              { to: "/configuracoes", label: "Config.", icon: Settings },
            ].map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-[var(--surface-2)] py-4 text-[12px] text-foreground hover:bg-[var(--surface-3)] transition-colors min-h-[80px]"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {it.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating shortcuts trigger (desktop) */}
      <button
        onClick={() => setShortcutsOpen(true)}
        aria-label="Atalhos do teclado"
        className="hidden md:grid fixed bottom-6 right-6 z-30 h-10 w-10 place-items-center rounded-full border bg-[var(--surface-2)] text-muted-foreground shadow-lg hover:text-foreground hover:bg-[var(--surface-3)] transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atalhos do teclado</DialogTitle>
            <DialogDescription>
              Atalhos disponíveis em todo o painel financeiro.
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-2 divide-y divide-[color:var(--border)] rounded-md border bg-[var(--surface-1)]">
            {[
              ["Ir para Painel Geral", "G P"],
              ["Ir para Conciliação", "G C"],
              ["Ir para Carros no Pátio", "G O"],
              ["Ir para Alertas", "G A"],
              ["Buscar OS / loja", "/"],
              ["Salvar valores em caixa", "Cmd S"],
              ["Fechar diálogo", "Esc"],
            ].map(([label, keys]) => (
              <li key={label} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <span className="text-muted-foreground">{label}</span>
                <kbd className="rounded-md border bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-medium text-foreground tabular">
                  {keys}
                </kbd>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
