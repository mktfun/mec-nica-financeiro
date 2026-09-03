import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Layers, 
  Cpu, 
  Check, 
  FileSpreadsheet, 
  CreditCard, 
  Building2, 
  Receipt,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Fase1PatioOsReview } from './Fase1PatioOsReview';
import { Fase2RedeVsOsReview } from './Fase2RedeVsOsReview';
import { Fase3OfxReconciliation } from './Fase3OfxReconciliation';
import { Fase4ContasVsSaidasReview } from './Fase4ContasVsSaidasReview';
import { supabase } from '@/lib/supabase';

export type ManualPhaseNumber = 1 | 2 | 3 | 4;

export interface FechamentoManualWizardProps {
  targetDate: string;
  initialPhase?: ManualPhaseNumber;
  onBackToSelector: () => void;
  onSwitchToAi: () => void;
  onCompleteClose?: () => void;
  className?: string;
}

const PHASES = [
  { step: 1 as ManualPhaseNumber, name: '1. OSs do Pátio', desc: 'Faturamento Base & Grade Excel', icon: FileSpreadsheet },
  { step: 2 as ManualPhaseNumber, name: '2. Vendas Rede', desc: 'Cartões x OSs Balcão', icon: CreditCard },
  { step: 3 as ManualPhaseNumber, name: '3. Extratos OFX', desc: 'PIX & Liquidações Rede', icon: Building2 },
  { step: 4 as ManualPhaseNumber, name: '4. Contas a Pagar', desc: 'Débitos, DRE & Selagem', icon: Receipt },
];

export function FechamentoManualWizard({
  targetDate,
  initialPhase = 1,
  onBackToSelector,
  onSwitchToAi,
  onCompleteClose,
  className = ''
}: FechamentoManualWizardProps) {
  const [currentPhase, setCurrentPhase] = useState<ManualPhaseNumber>(initialPhase);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);

  // 1. Hidratar fase inicial da sessão no PostgreSQL se existir
  useEffect(() => {
    async function loadSession() {
      if (!targetDate) return;
      try {
        const { data, error } = await (supabase as any).rpc('get_pipeline_session_state', {
          p_target_date: targetDate
        });
        if (!error && data) {
          if (data.current_step && data.current_step >= 1 && data.current_step <= 4) {
            setCurrentPhase(data.current_step as ManualPhaseNumber);
          }
          if (Array.isArray(data.steps_completed)) {
            const completedNums: number[] = [];
            if (data.steps_completed.includes('stage_1_os')) completedNums.push(1);
            if (data.steps_completed.includes('stage_2_rede')) completedNums.push(2);
            if (data.steps_completed.includes('stage_3_ofx')) completedNums.push(3);
            if (data.steps_completed.includes('stage_4_contas')) completedNums.push(4);
            setCompletedPhases(completedNums);
          }
        }
      } catch (err) {
        console.warn('Erro ao hidratar sessão manual:', err);
      }
    }
    loadSession();
  }, [targetDate]);

  const handlePhaseAdvance = (next: ManualPhaseNumber) => {
    setCompletedPhases(prev => Array.from(new Set([...prev, currentPhase])));
    setCurrentPhase(next);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. BARRA SUPERIOR DE NAVEGAÇÃO E BIFURCAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToSelector}
            className="h-9 px-3 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
            title="Voltar para a tela de escolha de modalidade"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Escolha de Modo
          </Button>

          <div className="h-5 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30">
              MODO MANUAL (SEM IA)
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Fechamento de <strong>{targetDate}</strong>
            </span>
          </div>
        </div>

        {/* Botão de Alternar para o Chat Hydra a qualquer momento */}
        <Button
          type="button"
          onClick={onSwitchToAi}
          className="h-9 px-3.5 bg-zinc-800 hover:bg-indigo-900/60 text-indigo-300 hover:text-indigo-200 border border-zinc-700 hover:border-indigo-500/40 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm"
        >
          <Cpu size={14} className="text-indigo-400" />
          Alternar para Chat com IA (Hydra)
        </Button>
      </div>

      {/* 2. STEPPER DAS 4 FASES SEQUENCIAIS */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-2.5 sm:p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PHASES.map((phase) => {
            const isActive = currentPhase === phase.step;
            const isDone = completedPhases.includes(phase.step) || currentPhase > phase.step;
            const isClickable = isDone || isActive;
            const Icon = phase.icon;

            return (
              <button
                key={phase.step}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentPhase(phase.step)}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-zinc-800/90 border border-emerald-500/40 shadow-sm shadow-emerald-950/40' 
                    : isDone 
                    ? 'hover:bg-zinc-800/50 cursor-pointer border border-transparent' 
                    : 'opacity-40 cursor-not-allowed border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/40'
                    : isDone
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {isDone ? <Check size={14} className="stroke-[3]" /> : phase.step}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate leading-tight ${
                    isActive ? 'text-zinc-100' : isDone ? 'text-emerald-300' : 'text-zinc-500'
                  }`}>
                    {phase.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate hidden sm:block">
                    {phase.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEÚDO ATIVO DA FASE SELECIONADA */}
      <div className="animate-in fade-in duration-200">
        {currentPhase === 1 && (
          <Fase1PatioOsReview
            targetDate={targetDate}
            onAdvance={() => handlePhaseAdvance(2)}
          />
        )}

        {currentPhase === 2 && (
          <Fase2RedeVsOsReview
            targetDate={targetDate}
            onAdvance={() => handlePhaseAdvance(3)}
            onBack={() => setCurrentPhase(1)}
          />
        )}

        {currentPhase === 3 && (
          <Fase3OfxReconciliation
            targetDate={targetDate}
            onAdvance={() => handlePhaseAdvance(4)}
            onBack={() => setCurrentPhase(2)}
          />
        )}

        {currentPhase === 4 && (
          <Fase4ContasVsSaidasReview
            targetDate={targetDate}
            onBack={() => setCurrentPhase(3)}
            onCloseDaySuccess={onCompleteClose || onBackToSelector}
          />
        )}
      </div>
    </div>
  );
}
