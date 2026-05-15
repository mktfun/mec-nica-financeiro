import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, PieChart, Store, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "/", label: "Home", icon: Home },
  { id: "/conciliacao", label: "Contas", icon: PieChart },
  { id: "/lojas", label: "Lojas", icon: Store },
  { id: "/alertas", label: "Alertas", icon: AlertTriangle },
  { id: "/configuracoes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center justify-between px-6 pb-6 pt-3 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-t border-[var(--border-subtle)] safe-area-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname === item.id;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            to={item.id}
            className="relative flex flex-col items-center justify-center gap-1 w-16"
          >
            <div className="relative flex items-center justify-center w-12 h-12">
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 bg-[var(--bg-surface-elevated)] rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon 
                size={22} 
                className={cn(
                  "transition-colors", 
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--text-tertiary)]"
                )} 
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
