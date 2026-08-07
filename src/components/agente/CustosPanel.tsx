import { Card } from '@/components/ui/Card';
import { BarChart3, TrendingUp, Cpu, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function CustosPanel() {
  const [periodo, setPeriodo] = useState('mensal');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_execution_logs')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const getFilteredData = () => {
    if (!logs) return { chat: 0, engine: 0, chatReqs: 0, engineReqs: 0 };
    
    const now = new Date();
    let filterDate = new Date(0); // default all time
    
    if (periodo === 'hoje') {
      filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodo === 'semanal') {
      filterDate = new Date(now);
      filterDate.setDate(now.getDate() - 7);
    } else if (periodo === 'mensal') {
      filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredLogs = logs.filter(log => new Date(log.created_at) >= filterDate);

    let chatCost = 0;
    let engineCost = 0;
    let chatReqs = 0;
    let engineReqs = 0;

    filteredLogs.forEach(log => {
      const cost = Number(log.estimated_cost || 0);
      // Determine if it's agent or engine. We will use `provider === 'agent'` for chat
      // or if it's not set, fallback checks. Engine uses 'llm-matcher' or 'openai' without 'agent' tag.
      if (log.provider === 'agent') {
        chatCost += cost;
        chatReqs += 1;
      } else {
        engineCost += cost;
        engineReqs += 1;
      }
    });

    return { chat: chatCost, engine: engineCost, chatReqs, engineReqs };
  };

  const dadosAtuais = getFilteredData();
  const totalCost = dadosAtuais.chat + dadosAtuais.engine;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
              <BarChart3 size={20} className="text-[var(--color-primary)]" />
            </div>
            Custos de I.A.
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">Monitoramento de consumo real e gastos com LLMs (Agente e Motor).</p>
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

      {isLoading ? (
        <div className="text-center py-10 text-[var(--text-secondary)]">Carregando telemetria...</div>
      ) : (
        <>
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
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Motor (ConciliaçÁo)</p>
                  <h3 className="text-3xl font-display font-bold text-blue-400">
                    R$ {dadosAtuais.engine.toFixed(2).replace('.', ',')}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Workflow size={20} className="text-blue-400" />
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">{dadosAtuais.engineReqs} execuções de automaçÁo.</p>
            </Card>
          </div>

          <Card variant="glass" className="p-6">
             <h3 className="font-display font-semibold text-lg mb-4">Detalhamento</h3>
             <div className="bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-subtle)] p-8 text-center">
               <BarChart3 size={32} className="mx-auto text-[var(--text-tertiary)] mb-3 opacity-50" />
               <p className="text-sm font-medium text-[var(--text-secondary)]">A integraçÁo detalhada por token está ativa.</p>
               <p className="text-xs text-[var(--text-tertiary)] mt-1">Os custos estÁo sendo calculados com base no uso real reportado pelas APIs (estimativa via conversÁo de USD para BRL).</p>
             </div>
          </Card>
        </>
      )}
    </div>
  );
}
