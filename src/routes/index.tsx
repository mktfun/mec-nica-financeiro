import { createFileRoute } from '@tanstack/react-router';
import { HeroBalance } from '@/components/dashboard/HeroBalance';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MotorStatus } from '@/components/dashboard/MotorStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StoreRankingChart } from '@/components/dashboard/StoreRankingChart';
import { AppShell } from '@/components/layout/AppShell';
import { useState } from 'react';
import { getDefaultDate } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = getDefaultDate();
    const [year, month] = today.split('-');
    return `${year}-${month}`;
  });

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display font-bold text-3xl text-white">Visão Geral</h1>
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg shadow-sm">
            <CalendarDays size={16} className="text-[var(--color-primary)]" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        <HeroBalance monthStr={selectedMonth} />
        <QuickActions />
        <MotorStatus />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          <div className="lg:col-span-1 min-h-[400px]">
            <StoreRankingChart />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
