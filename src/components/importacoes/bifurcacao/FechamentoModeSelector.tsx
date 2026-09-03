import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Cpu, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Coins,
  Receipt,
  Scale
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type FechamentoMode = 'manual' | 'ai';

export interface FechamentoModeSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelectMode: (mode: FechamentoMode) => void;
  isDayClosed?: boolean;
  deltaCurrent?: number;
  className?: string;
}

export function FechamentoModeSelector({
  selectedDate,
  onDateChange,
  onSelectMode,
  isDayClosed = false,
  deltaCurrent,
  className = ''
}: FechamentoModeSelectorProps) {
  // Funções utilitárias de manipulação de data
  const handleShiftDate = (days: number) => {
    if (!selectedDate) return;
    const parts = selectedDate.split('-');
    const cur = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    cur.setDate(cur.getDate() + days);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  const handleSetRelative = (type: 'today' | 'yesterday') => {
    const now = new Date();
    if (type === 'yesterday') {
      now.setDate(now.getDate() - 1);
    }
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onDateChange(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. BARRA SUPERIOR DE DATA E STATUS CONTÁBIL */}
      <Card className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Data de Fechamento Contábil
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-zinc-950 border border-zinc-750 text-zinc-100 text-sm font-mono font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-zinc-500 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                  title="Dia anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                  title="Próximo dia"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos e Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleSetRelative('yesterday')}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer"
          >
            Ontem (D-1)
          </button>
          <button
            type="button"
            onClick={() => handleSetRelative('today')}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-all cursor-pointer"
          >
            Hoje
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1 hidden sm:block" />

          {isDayClosed ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <CheckCircle2 size={14} />
              Dia Homologado / Fechado
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <AlertCircle size={14} />
              Em Aberto / Não Selado
            </div>
          )}
        </div>
      </Card>

      {/* 2. HEADER DA ESCOLHA DE MODALIDADE */}
      <div className="px-1">
        <h2 className="text-xl font-bold text-zinc-100">
          Como deseja realizar a conciliação deste dia?
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Selecione a abordagem operacional adequada para o fechamento de <span className="font-mono text-zinc-200 font-bold">{selectedDate}</span>. Ambas convergem para a mesma autoridade contábil do banco.
        </p>
      </div>

      {/* 3. OS 2 CARDS DE ESCOLHA ESTRATÉGICA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: MODO MANUAL PASSO A PASSO (ZERO IA) */}
        <div 
          onClick={() => onSelectMode('manual')}
          className="group relative bg-zinc-900/60 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-7 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg shadow-black/30 hover:shadow-emerald-950/20"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                <Layers size={24} />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-emerald-400 border border-emerald-500/30">
                Sem IA · 100% Determinístico
              </span>
            </div>

            <h3 className="text-lg font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
              Modo Manual Passo a Passo
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Você no controle total de cada etapa. Ingestão setorizada por tipo de documento em 4 fases sequenciais com tabelas de conferência estilo Excel, sem qualquer intervenção de inteligência artificial.
            </p>

            <div className="mt-6 space-y-2.5 border-t border-zinc-800/80 pt-4">
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <FileSpreadsheet size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Fase 1:</strong> Só OSs do pátio com grade sanfona e ajuste de pendentes 1 a 1.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Coins size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Fase 2:</strong> Só Vendas Rede, pré-matching de cartões e resolução de sobras.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Scale size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Fase 3:</strong> Só 10 OFX Itaú, batimento de PIX e cálculo do que entrou vs D+1.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Receipt size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Fase 4:</strong> Só Contas a Pagar, batimento de saídas e receitas DRE até fechar.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800/60">
            <Button 
              type="button" 
              className="w-full h-11 bg-zinc-800 group-hover:bg-emerald-600 text-zinc-200 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm"
            >
              Iniciar Fechamento Manual (4 Fases)
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>

        {/* CARD 2: MODO CONVERSACIONAL COM IA (HYDRA) */}
        <div 
          onClick={() => onSelectMode('ai')}
          className="group relative bg-zinc-900/60 hover:bg-zinc-900 border-2 border-zinc-800 hover:border-indigo-500/60 rounded-2xl p-7 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg shadow-black/30 hover:shadow-indigo-950/20"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-all">
                <Cpu size={24} />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-indigo-300 border border-indigo-500/30">
                Hydra Multi-Braço · Tela Cheia
              </span>
            </div>

            <h3 className="text-lg font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
              Modo Conversacional com IA
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              A inteligência contábil Hydra assume a condução em tela cheia. Cruza as 10 filiais, caça PIXs órfãos, formula propostas com botões inline e recalcula o Delta em tempo real a cada confirmação.
            </p>

            <div className="mt-6 space-y-2.5 border-t border-zinc-800/80 pt-4">
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <ShieldCheck size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Auditoria Ativa:</strong> 6 braços analíticos investigando discrepâncias de caixa e pátio.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <CheckCircle2 size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Cartões Inline:</strong> Propostas de resolução aprovadas via teclado (1, 2, Enter, Esc).</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Scale size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Live Delta:</strong> Placar dos 5 Pilares no topo recalculado centavo a centavo no PostgreSQL.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <Coins size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                <span><strong>Equalização Final:</strong> Guia as correções necessárias até zerar a diferença (Δ = R$ 0,00).</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800/60">
            <Button 
              type="button" 
              className="w-full h-11 bg-zinc-800 group-hover:bg-indigo-600 text-zinc-200 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm"
            >
              Abrir Workspace Conversacional Hydra
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
