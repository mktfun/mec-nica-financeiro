import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiCardProps {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  icon: LucideIcon;
  tone: "success" | "destructive" | "neutral" | "warning";
  data?: { value: number }[];
}

const toneConfig = {
  success: {
    icon: "bg-[color:var(--success)]/15 text-[color:var(--success)] shadow-[0_0_12px_oklch(0.72_0.18_145_/_25%)]",
    gradient: "from-[color:var(--success)]/8 via-transparent to-transparent",
    stroke: "var(--success)",
  },
  destructive: {
    icon: "bg-destructive/15 text-destructive shadow-[0_0_12px_oklch(0.64_0.22_25_/_25%)]",
    gradient: "from-destructive/8 via-transparent to-transparent",
    stroke: "var(--destructive)",
  },
  neutral: {
    icon: "bg-[var(--surface-3)] text-muted-foreground",
    gradient: "from-primary/5 via-transparent to-transparent",
    stroke: "var(--primary)",
  },
  warning: {
    icon: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] shadow-[0_0_12px_oklch(0.77_0.17_70_/_25%)]",
    gradient: "from-[color:var(--warning)]/8 via-transparent to-transparent",
    stroke: "var(--warning)",
  },
};

export function KpiCard({ label, value, format, sub, icon: Icon, tone, data }: KpiCardProps) {
  const cfg = toneConfig[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl glass-elevated p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_oklch(0_0_0_/_30%)] group">
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} pointer-events-none`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${cfg.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <CountUp
          value={value}
          format={format}
          className="mt-2 block text-[28px] font-extrabold text-foreground tabular tracking-tighter"
        />
        {sub && <div className="mt-1 text-[11px] font-medium text-muted-foreground">{sub}</div>}
      </div>

      {/* Sparkline */}
      {data && data.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={cfg.stroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
