import { createFileRoute } from '@tanstack/react-router';
import { HeroBalance } from '@/components/dashboard/HeroBalance';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MotorStatus } from '@/components/dashboard/MotorStatus';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
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
          <div className="lg:col-span-1">
            {/* Espaço reservado para o Chart ou Mini-Relatório */}
            <div className="bg-[var(--bg-surface-elevated)] rounded-[var(--radius-lg)] p-6 border border-[var(--border-subtle)]">
              <h3 className="font-display font-semibold mb-4 text-sm text-[var(--text-secondary)] uppercase tracking-wider">
                Resumo da Semana
              </h3>
              <div className="h-48 flex items-center justify-center border border-dashed border-[var(--border-strong)] rounded-[var(--radius-md)]">
                <span className="text-[var(--text-tertiary)] text-sm">Gráfico de Fluxo de Caixa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
