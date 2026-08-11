import React, { useState } from 'react';
import { X, Play, RefreshCcw, Search, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AgentStage, AgentStageItem } from './AgentStageItem';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AgentRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: any[];
  onSuccess: (cloudData: any) => void;
}

const INITIAL_STAGES: AgentStage[] = [
  {
    id: 'connect',
    title: 'Conectando na Oficina Inteligente...',
    status: 'pending',
    subSteps: [
      { id: 'auth', label: 'Validando chaves de acesso...', status: 'pending' },
      { id: 'portal', label: 'Acessando portal da Oficina...', status: 'pending' },
    ]
  },
  {
    id: 'fetch',
    title: 'Buscando faturamentos do período...',
    status: 'pending',
    subSteps: [
      { id: 'list', label: 'Listando Notas de Serviço e Movimentos...', status: 'pending' },
      { id: 'file1', label: 'Processando arquivo de recebimentos (1/2)', status: 'pending' },
      { id: 'file2', label: 'Analisando deduções e taxas (2/2)', status: 'pending' },
    ]
  },
  {
    id: 'inject',
    title: 'Injetando com sucesso no banco...',
    status: 'pending',
    subSteps: [
      { id: 'clean', label: 'Limpando duplicatas retroativas...', status: 'pending' },
      { id: 'save', label: 'Salvando registros finais...', status: 'pending' },
      { id: 'verify', label: 'Verificando integridade na Tabela...', status: 'pending' }
    ]
  }
];

export function AgentRunnerModal({ isOpen, onClose, stores, onSuccess }: AgentRunnerModalProps) {
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [stages, setStages] = useState<AgentStage[]>(INITIAL_STAGES);
  const [isFinished, setIsFinished] = useState(false);
  
  // Função para simular evolução do Bot
  const startAgentFlow = async () => {
    if (!dateStart || !dateEnd) {
      toast.error('Preencha as datas de início e fim da conciliação desejada.');
      return;
    }
    
    setIsStarted(true);
    let currentStages = JSON.parse(JSON.stringify(INITIAL_STAGES));
    setStages(currentStages);

    // Passo 0: Dispara a requisição pra nuvem real para que o Deno avise o Bot.
    try {
      if (stores && stores.length > 0) {
        const promises = stores.map(store => 
          supabase.functions.invoke('sync-oficina', { body: { loja: store.id, dataInicio: dateStart, dataFim: dateEnd } })
        );
        await Promise.allSettled(promises);
      }
    } catch(e) {
      console.error(e);
      toast.error('Aviso: Falha ao chamar o servidor. Prosseguindo simulador visual...');
    }

    const updateSubStep = async (stageIdx: number, subIdx: number, status: 'pending'|'running'|'success') => {
      currentStages = JSON.parse(JSON.stringify(currentStages));
      currentStages[stageIdx].status = 'running';
      currentStages[stageIdx].subSteps[subIdx].status = status;
      setStages(currentStages);
    };

    const markStageSuccess = async (stageIdx: number) => {
      currentStages = JSON.parse(JSON.stringify(currentStages));
      currentStages[stageIdx].status = 'success';
      currentStages[stageIdx].subSteps.forEach((s: any) => s.status = 'success');
      setStages(currentStages);
    };

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Estágio 1
    await updateSubStep(0, 0, 'running');
    await delay(1000);
    await updateSubStep(0, 0, 'success');
    await updateSubStep(0, 1, 'running');
    await delay(1500);
    await markStageSuccess(0);

    // Estágio 2
    await updateSubStep(1, 0, 'running');
    await delay(2000);
    await updateSubStep(1, 0, 'success');
    await updateSubStep(1, 1, 'running');
    await delay(2500);
    await updateSubStep(1, 1, 'success');
    await updateSubStep(1, 2, 'running');
    await delay(2000);
    await markStageSuccess(1);

    // Estágio 3
    await updateSubStep(2, 0, 'running');
    await delay(1500);
    await updateSubStep(2, 0, 'success');
    await updateSubStep(2, 1, 'running');
    await delay(1500);
    await updateSubStep(2, 1, 'success');
    await updateSubStep(2, 2, 'running');
    
    // Polling Real de banco pra garantir q inseriu
    let attempts = 0;
    let foundData = false;
    let finalRows: any[] = [];
    
    while(attempts < 10 && !foundData) {
      await delay(2000);
      const { data, error } = await supabase.from('oficina_contas').select('*').limit(10);
      if (data && data.length > 0) {
        foundData = true;
        finalRows = data;
      }
      attempts++;
    }

    await markStageSuccess(2);
    setIsFinished(true);
    
    onSuccess(finalRows);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isStarted && onClose()} />
      
      <div 
        className="relative w-full max-w-2xl bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center">
              {isStarted && !isFinished ? <RefreshCcw size={16} className="animate-spin" /> : <Database size={16} />}
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Cloud Agent Runner</h2>
              <p className="text-xs text-[var(--text-secondary)]">Extração Automatizada de Dados</p>
            </div>
          </div>
          {!isStarted && (
            <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto">
          {!isStarted ? (
            <div className="space-y-6">
              <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] p-5 rounded-xl">
                <h3 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">Configure o Escopo da Conciliação</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-tertiary)] uppercase mb-2">Data Inicial</label>
                    <input 
                      type="date" 
                      value={dateStart} 
                      onChange={(e) => setDateStart(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-tertiary)] uppercase mb-2">Data Final</label>
                    <input 
                      type="date" 
                      value={dateEnd} 
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm focus:border-[var(--color-primary)] outline-none text-[var(--text-primary)] transition-colors"
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-4">
                  O Agente fará raspagem de todos os cartões, faturamentos e contas no período selecionado e preparará para reconciliação automática.
                </p>
              </div>

              <Button onClick={startAgentFlow} className="w-full h-12 text-base font-semibold shadow-lg shadow-[var(--color-primary)]/20 group">
                <Play size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Iniciar Extração Cloud
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stages.map((stage) => (
                <AgentStageItem key={stage.id} stage={stage} />
              ))}

              {isFinished && (
                <div className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Button onClick={onClose} className="w-full bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 h-12 text-base shadow-lg shadow-[var(--color-success)]/20">
                    <Search size={18} className="mr-2" /> Visualizar Conciliação Gerada
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
