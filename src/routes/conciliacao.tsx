import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { summaryData } from '@/mock/data';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2">Conciliação</h1>
          <p className="text-[var(--text-secondary)] text-sm">Resumo financeiro e batimento de caixas de todas as lojas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-primary)]">
            <h3 className="text-[var(--text-secondary)] text-sm mb-2">Apurado Sistema (PDV)</h3>
            <div className="text-4xl font-display font-bold">
              <AnimatedNumber value={summaryData.totalIn + summaryData.totalDivergences} format="currency" />
            </div>
          </Card>
          
          <Card className="flex flex-col justify-center border-l-4 border-l-[var(--color-accent-teal)]">
            <h3 className="text-[var(--text-secondary)] text-sm mb-2">Liquidado em Conta</h3>
            <div className="text-4xl font-display font-bold text-[var(--color-accent-teal)]">
              <AnimatedNumber value={summaryData.totalIn} format="currency" />
            </div>
          </Card>
        </div>

        <Card variant="glass" className="mb-8 p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Rotina Diária Concluída</h2>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-6">
            O motor de conciliação processou 132 transações hoje. {summaryData.totalDivergences > 0 ? "Foram encontradas divergências que precisam de atenção." : "Todas as transações bateram perfeitamente."}
          </p>
          <Button variant="primary" className="gap-2 rounded-full">
            Ver Relatório Detalhado <ArrowRight size={18} />
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
