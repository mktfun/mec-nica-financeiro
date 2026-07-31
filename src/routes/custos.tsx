import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { BarChart3, TrendingUp, Cpu, Workflow } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/custos')({
  component: CustosPage,
});

function CustosPage() {
  const [periodo, setPeriodo] = useState('mensal');

  // Valores mockados para MVP, até que a tabela de usage_logs seja preenchida na infra
  const dadosCustos = {
    mensal: { chat: 42.50, engine: 128.90, chatReqs: 1450, engineReqs: 430 },
    semanal: { chat: 12.30, engine: 35.10, chatReqs: 410, engineReqs: 120 },
    hoje: { chat: 2.10, engine: 5.40, chatReqs: 85, engineReqs: 18 },
  };

  const dadosAtuais = dadosCustos[periodo as keyof typeof dadosCustos];
  const totalCost = dadosAtuais.chat + dadosAtuais.engine;

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
                <BarChart3 size={20} className="text-[var(--color-primary)]" />
              </div>
              Custos de I.A.
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">Monitoramento de consumo e gastos com LLMs (Agente e Motor).</p>
          </div>

          <div className="flex bg-[var(--bg-surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)] w-fit">
            <button
              onClick={() => setPeriodo('hoje')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'hoje' ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodo('semanal')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'semanal' ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodo('mensal')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'mensal' ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Este Mês
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="glass" className="p-6 border-t-4 border-t-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Custo Total</p>
                <h3 className="text-3xl font-display font-bold text-[var(--text-primary)]">
                  R$ {totalCost.toFixed(2).replace('.', ',')}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-surface-hover)]">
                <TrendingUp size={20} className="text-[var(--text-secondary)]" />
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">Gasto consolidado no período selecionado.</p>
          </Card>

          <Card variant="glass" className="p-6 border-t-4 border-t-indigo-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">Chat (Agente)</p>
                <h3 className="text-3xl font-display font-bold text-indigo-400">
                  R$ {dadosAtuais.chat.toFixed(2).replace('.', ',')}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Cpu size={20} className="text-indigo-400" />
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">{dadosAtuais.chatReqs} requisições processadas.</p>
          </Card>

          <Card variant="glass" className="p-6 border-t-4 border-t-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Motor (Conciliação)</p>
                <h3 className="text-3xl font-display font-bold text-blue-400">
                  R$ {dadosAtuais.engine.toFixed(2).replace('.', ',')}
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Workflow size={20} className="text-blue-400" />
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">{dadosAtuais.engineReqs} execuções de automação.</p>
          </Card>
        </div>

        <Card variant="glass" className="p-6">
           <h3 className="font-display font-semibold text-lg mb-4">Detalhamento</h3>
           <div className="bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-subtle)] p-8 text-center">
             <BarChart3 size={32} className="mx-auto text-[var(--text-tertiary)] mb-3 opacity-50" />
             <p className="text-sm font-medium text-[var(--text-secondary)]">A integração detalhada por token está em desenvolvimento.</p>
             <p className="text-xs text-[var(--text-tertiary)] mt-1">Os gráficos de uso histórico (Claritas/LLM) estarão disponíveis em breve.</p>
           </div>
        </Card>
      </div>
    </AppShell>
  );
}
