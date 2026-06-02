import { createFileRoute } from '@tanstack/react-router';
import { HeroBalance } from '@/components/dashboard/HeroBalance';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MotorStatus } from '@/components/dashboard/MotorStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { StoreRankingChart } from '@/components/dashboard/StoreRankingChart';
import { AppShell } from '@/components/layout/AppShell';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <HeroBalance />
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
