import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, FileText, AlertTriangle, Settings } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

const mobileItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/lojas", label: "Lojas", icon: Store },
  { to: "/conciliacao", label: "Concil.", icon: FileText },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-[220px]">
        <Topbar crumbs={crumbs} />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-10">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-[var(--sidebar)] grid grid-cols-5">
        {mobileItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
