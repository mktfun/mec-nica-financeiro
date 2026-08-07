import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, PieChart, Store, AlertTriangle, Settings, Car, DollarSign, FileText, LogOut, FileSpreadsheet, Bot, Terminal, Workflow, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/useAuth";

const navItems = [
  { id: "/", label: "VisÁo Geral", icon: Home },
  { id: "/conciliacao", label: "ConciliaçÁo", icon: PieChart },
  { id: "/lojas", label: "Lojas", icon: Store },
  { id: "/patio", label: "Pátio", icon: Car },
  { id: "/recebiveis", label: "Recebíveis", icon: DollarSign },
  { id: "/alertas", label: "Alertas", icon: AlertTriangle },
  { id: "/importacoes", label: "Importações", icon: FileSpreadsheet },
];

export function Sidebar() {
  const location = useLocation();
  const { logout } = useLogout();

  return (
    <aside className="h-full flex flex-col py-8 px-4">
      <div className="px-4 mb-12">
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white">
            <span className="text-sm">MP</span>
          </div>
          Mecânica Popular
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.id || (item.id !== '/' && location.pathname.startsWith(item.id));
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.id}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-full)] font-medium text-sm transition-colors z-10",
                isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-full)] -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={20} className={cn("transition-colors", isActive && "text-[var(--color-primary)]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <Link
          to="/proposta"
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-full)] font-medium text-sm transition-colors w-full",
            location.pathname === "/proposta" ? "text-[var(--text-primary)] bg-[var(--bg-surface-elevated)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          )}
        >
          <FileText size={20} className={cn("transition-colors", location.pathname === "/proposta" && "text-[var(--color-primary)]")} />
          Proposta
        </Link>
        <Link
          to="/configuracoes"
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-full)] font-medium text-sm transition-colors w-full",
            location.pathname === "/configuracoes" ? "text-[var(--text-primary)] bg-[var(--bg-surface-elevated)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]"
          )}
        >
          <Settings size={20} className={cn("transition-colors", location.pathname === "/configuracoes" && "text-[var(--color-primary)]")} />
          Configurações
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-full)] font-medium text-sm transition-colors w-full text-[var(--color-accent-danger)]/70 hover:text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/5"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  );
}
