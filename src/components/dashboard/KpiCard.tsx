import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiCardProps {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  icon: LucideIcon;
  tone: "success" | "destructive" | "neutral" | "warning";
  data?: { value: number }[];
  index?: number;
}

const toneMap = {
  success: "text-[color:var(--success)] bg-[color:var(--success)]/12 shadow-[0_0_15px_rgba(34,197,94,0.2)]",
  destructive: "text-destructive bg-destructive/12 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
  neutral: "text-muted-foreground bg-[var(--surface-3)]",
  warning: "text-[color:var(--warning)] bg-[color:var(--warning)]/12 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
};

const strokeMap = {
  success: "var(--success)",
  destructive: "var(--destructive)",
  neutral: "var(--muted-foreground)",
  warning: "var(--warning)",
};

export function KpiCard({ label, value, format, sub, icon: Icon, tone, data, index = 0 }: KpiCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-card p-4 sm:p-5 glass-panel transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-start justify-between relative z-10">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <CountUp
        value={value}
        format={format}
        className="mt-3 block text-[22px] sm:text-[24px] font-bold text-foreground tabular tracking-tight text-glow"
      />
      {sub && <div className="mt-1 text-[12px] text-muted-foreground relative z-10">{sub}</div>}
      
      {data && data.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={strokeMap[tone]} 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
