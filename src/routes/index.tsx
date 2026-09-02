import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAvailableConciliacaoDates } from '@/hooks/useDailySnapshot';
import { useExecutiveDashboard } from '@/hooks/useExecutiveDashboard';
import { ExecutiveHeader } from '@/components/dashboard/ExecutiveHeader';
import { ExecutiveKpiBentoGrid } from '@/components/dashboard/ExecutiveKpiBentoGrid';
import { ExecutiveFivePillarsBar } from '@/components/dashboard/ExecutiveFivePillarsBar';
import { ExecutiveStoreMatrix } from '@/components/dashboard/ExecutiveStoreMatrix';
import { ExecutiveMacroCharts } from '@/components/dashboard/ExecutiveMacroCharts';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: availableDates = [], isLoading: loadingDates } = useAvailableConciliacaoDates();
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    }
  }, [availableDates, selectedDate]);

  const { data, isLoading } = useExecutiveDashboard(selectedDate || '2026-09-01');

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-6 pb-12">
        
        {/* ── 1. HEADER EXECUTIVO & SELETOR DE FECHAMENTOS ── */}
        <ExecutiveHeader
          data={data}
          isLoading={isLoading || loadingDates}
          selectedDate={selectedDate || data?.date || '2026-09-01'}
          onSelectDate={setSelectedDate}
          availableDates={availableDates}
        />

        {/* ── 2. BENTO GRID DOS 6 KPIS MESTRES ── */}
        <ExecutiveKpiBentoGrid
          data={data}
          isLoading={isLoading}
        />

        {/* ── 3. EQUAÇÃO DOS 5 PILARES DE CAIXA ── */}
        <ExecutiveFivePillarsBar
          data={data}
          isLoading={isLoading}
        />

        {/* ── 4. MATRIZ DE PERFORMANCE DAS 10 FILIAIS ── */}
        <ExecutiveStoreMatrix
          stores={data?.stores || []}
          isLoading={isLoading}
        />

        {/* ── 5. GRÁFICOS DE TENDÊNCIA MACRO ── */}
        <ExecutiveMacroCharts
          historicoMacro={data?.historicoMacro || []}
          isLoading={isLoading}
        />

      </div>
    </AppShell>
  );
}
