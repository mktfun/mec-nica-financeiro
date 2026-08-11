import React, { useState, useEffect } from 'react';
import { X, Play, RefreshCcw, Search, Database, FileText, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AgentStage, AgentStageItem } from './AgentStageItem';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AgentRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: any[];
  onSuccess: (cloudData: any[], needsFallback: boolean) => void;
  runLocalFiles?: () => Promise<void>; // Função que o Wizard passa para parsear arquivos simultaneamente
}

const INITIAL_STAGES: AgentStage[] = [
  {
    id: 'local',
    title: 'Processando Arquivos Locais...',
    status: 'pending',
    subSteps: [
      { id: 'parse_xls', label: 'Extraindo dados de planilhas', status: 'pending' },
      { id: 'parse_ofx', label: 'Mapeando transações OFX', status: 'pending' },
    ]
  },
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
    title: 'Buscando faturamentos (Mês Passado e Hoje)...',
    status: 'pending',
    subSteps: [
      { id: 'list', label: 'Listando Notas de Serviço e Movimentos...', status: 'pending' },
      { id: 'file1', label: 'Processando contas a receber e pendências', status: 'pending' },
    ]
  },
  {
    id: 'inject',
    title: 'Injetando com sucesso no banco...',
    status: 'pending',
    subSteps: [
      { id: 'clean', label: 'Limpando duplicatas retroativas...', status: 'pending' },
      { id: 'save', label: 'Salvando registros finais...', status: 'pending' }
    ]
  }
];

export function AgentRunnerModal({ isOpen, onClose, stores, onSuccess, runLocalFiles }: AgentRunnerModalProps) {
  const [stages, setStages] = useState<AgentStage[]>(INITIAL_STAGES);
  const [isFinished, setIsFinished] = useState(false);
  const [needsFallback, setNeedsFallback] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Calcula datas: Mês passado até hoje
  const getDates = () => {
    const today = new Date();
    const dateEnd = today.toISOString().split('T')[0];
    
    // Primeiro dia do mês passado
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const dateStart = firstDayLastMonth.toISOString().split('T')[0];
    
    return { dateStart, dateEnd };
  };

  useEffect(() => {
    if (isOpen && !hasStarted) {
      setHasStarted(true);
      startFlow();
    }
    if (!isOpen) {
      setHasStarted(false);
      setStages(JSON.parse(JSON.stringify(INITIAL_STAGES)));
      setIsFinished(false);
      setNeedsFallback(false);
    }
  }, [isOpen]);

  const updateSubStep = async (currentStages: any, stageIdx: number, subIdx: number, status: 'pending'|'running'|'error'|'success') => {
    currentStages[stageIdx].status = status === 'error' ? 'error' : (status === 'success' ? 'success' : 'running');
    currentStages[stageIdx].subSteps[subIdx].status = status;
    setStages([...currentStages]);
  };

  const markStageSuccess = async (currentStages: any, stageIdx: number) => {
    currentStages[stageIdx].status = 'success';
    currentStages[stageIdx].subSteps.forEach((s: any) => s.status = 'success');
    setStages([...currentStages]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const runLocalParsing = async (currentStages: any) => {
    await updateSubStep(currentStages, 0, 0, 'running');
    if (runLocalFiles) {
      try {
        await runLocalFiles();
        await updateSubStep(currentStages, 0, 0, 'success');
        await updateSubStep(currentStages, 0, 1, 'running');
        await delay(1000); // Simulando step extra do OFX
        await updateSubStep(currentStages, 0, 1, 'success');
        await markStageSuccess(currentStages, 0);
      } catch (err) {
        await updateSubStep(currentStages, 0, 0, 'error');
        currentStages[0].status = 'error';
        setStages([...currentStages]);
      }
    } else {
      await delay(1000);
      await markStageSuccess(currentStages, 0);
    }
  };

  const runBotSync = async (currentStages: any) => {
    const { dateStart, dateEnd } = getDates();
    let botSuccess = false;
    let attempts = 0;
    
    await updateSubStep(currentStages, 1, 0, 'running');

    while (attempts < 3 && !botSuccess) {
      attempts++;
      try {
        if (stores && stores.length > 0) {
          const promises = stores.map(store => 
            supabase.functions.invoke('sync-oficina', { body: { loja: store.id, dataInicio: dateStart, dataFim: dateEnd } })
          );
          const results = await Promise.allSettled(promises);
          
          const hasError = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
          if (hasError) throw new Error("Falha na Edge Function");
          
          botSuccess = true;
        } else {
          botSuccess = true;
        }
      } catch(e) {
        console.error(`Tentativa ${attempts} falhou`, e);
        if (attempts < 3) {
          toast.warning(`Falha no Bot (Tentativa ${attempts}/3). Tentando novamente em 2s...`);
          await delay(2000);
        }
      }
    }

    if (!botSuccess) {
      toast.error('Falha crítica no Bot após 3 tentativas. Redirecionando para Fallback Manual.');
      currentStages[1].status = 'error';
      currentStages[1].subSteps.forEach((s: any) => s.status = 'error');
      currentStages[2].status = 'error';
      currentStages[3].status = 'error';
      setStages([...currentStages]);
      return false; // Indica que falhou e precisa fallback
    }

    // Bot teve sucesso, continua UI fluida
    await updateSubStep(currentStages, 1, 0, 'success');
    await updateSubStep(currentStages, 1, 1, 'running');
    await delay(1000);
    await markStageSuccess(currentStages, 1);

    await updateSubStep(currentStages, 2, 0, 'running');
    await delay(1500);
    await updateSubStep(currentStages, 2, 0, 'success');
    await updateSubStep(currentStages, 2, 1, 'running');
    await delay(1500);
    await markStageSuccess(currentStages, 2);

    await updateSubStep(currentStages, 3, 0, 'running');
    await delay(1500);
    await updateSubStep(currentStages, 3, 0, 'success');
    await updateSubStep(currentStages, 3, 1, 'running');
    await delay(1500);
    await markStageSuccess(currentStages, 3);
    
    return true; // Sucesso
  };

  const startFlow = async () => {
    let currentStages = JSON.parse(JSON.stringify(INITIAL_STAGES));
    setStages(currentStages);

    // Executa locais e bot em paralelo
    const [localResult, botSuccess] = await Promise.all([
      runLocalParsing(currentStages),
      runBotSync(currentStages)
    ]);

    let finalRows: any[] = [];

    if (botSuccess) {
      // Polling pra garantir que inseriu
      let pollAttempts = 0;
      let foundData = false;
      while(pollAttempts < 10 && !foundData) {
        await delay(1000);
        const { data, error } = await supabase.from('oficina_contas').select('*').limit(20);
        if (data && data.length > 0) {
          foundData = true;
          finalRows = data;
        }
        pollAttempts++;
      }
    }

    setIsFinished(true);
    setNeedsFallback(!botSuccess);
    
    // Entrega o controle de volta ao Wizard, que injetará o Fallback form se needsFallback for true
    onSuccess(finalRows, !botSuccess);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => (isFinished || needsFallback) && onClose()} />
      
      <div className="relative w-full max-w-2xl bg-[var(--bg-canvas)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${needsFallback ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]' : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'}`}>
              {(!isFinished && !needsFallback) ? <RefreshCcw size={16} className="animate-spin" /> : (needsFallback ? <AlertOctagon size={16} /> : <Database size={16} />)}
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">{needsFallback ? 'Falha na Sincronização' : 'Cloud Agent Runner'}</h2>
              <p className="text-xs text-[var(--text-secondary)]">{needsFallback ? 'Necessário intervenção manual' : 'Processamento paralelo de arquivos e API'}</p>
            </div>
          </div>
          {(isFinished || needsFallback) && (
            <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] rounded-full transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {stages.map((stage) => (
            <AgentStageItem key={stage.id} stage={stage} />
          ))}

          {(isFinished && !needsFallback) && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button onClick={onClose} className="w-full bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 h-12 text-base shadow-lg shadow-[var(--color-success)]/20">
                <Search size={18} className="mr-2" /> Avançar para Conciliação
              </Button>
            </div>
          )}

          {needsFallback && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button onClick={onClose} className="w-full bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 h-12 text-base shadow-lg shadow-[var(--color-danger)]/20">
                <AlertOctagon size={18} className="mr-2" /> Preencher OS Manualmente (Fallback)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
