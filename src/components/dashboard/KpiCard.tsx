import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone: "success" | "destructive" | "neutral" | "warning";
}

const toneMap = {
  success: "text-[color:var(--success)] bg-[color:var(--success)]/12",
  destructive: "text-destructive bg-destructive/12",
  neutral: "text-muted-foreground bg-[var(--surface-3)]",
  warning: "text-[color:var(--warning)] bg-[color:var(--warning)]/12",
};

export function KpiCard({ label, value, sub, icon: Icon, tone }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-all duration-150 hover:border-white/12">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-[24px] font-semibold text-foreground tabular tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
