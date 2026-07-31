import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Input } from "../ui/Input";

export function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Mobile Logo */}
        <div className="md:hidden font-display font-bold text-xl tracking-tight">MP.</div>
        
        {/* Real-time clock for investor impression */}
        <div className="hidden md:flex items-center gap-2 text-[var(--text-secondary)]">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)] animate-pulse" />
          <span className="font-display font-medium text-sm tracking-wide">Sincronizado • {time}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="hidden md:block w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
            <Input 
              placeholder="Buscar lojas, transações..." 
              className="pl-10 h-10 rounded-full bg-[var(--bg-surface-elevated)] border-transparent focus-visible:ring-1 focus-visible:ring-[var(--border-strong)]"
            />
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-[var(--color-accent-danger)] rounded-full border-2 border-[var(--bg-surface-elevated)]" />
        </motion.button>
        
        <ThemeToggle />
        
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-display font-bold overflow-hidden shadow-sm">
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=494fdf" alt="User Avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
