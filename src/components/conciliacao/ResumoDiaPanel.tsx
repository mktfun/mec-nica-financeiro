import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  AlertOctagon, Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight, Landmark, Wallet, Receipt, ShoppingBag, Edit2, Database, ShieldCheck, X
} from 'lucide-react';
import { useDailySnapshot, usePreviousDaySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { calculateGlobalConciliacao, GlobalConciliacaoInput } from '@/lib/modulo1Calculations';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { DailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { toast } from 'sonner';

interface ResumoDiaPanelProps {
  selectedDate: string;
  onDayChange: (offset: number) => void;
  onDateSelect: (date: string) => void;
  divergenciaGlobal: number;
  isApproved: boolean;
  detalhesCount: number;
  totalSistema: number;
  totalBancarioIn: number;
  totalBancarioRaw: number;
  totalOfxIn?: number;
  totalOfxOut?: number;
  storesData?: any[];
  availableDates?: string[];
  summary?: DailyReconciliationSummary | null;
}

export function ResumoDiaPanel({
  selectedDate,
  onDayChange,
  onDateSelect,
  divergenciaGlobal,
  isApproved,
  detalhesCount,
  totalSistema,
  totalBancarioIn,
  totalBancarioRaw,
  totalOfxIn = 0,
  totalOfxOut = 0,
  storesData = [],
  availableDates = [],
  summary = null
}: ResumoDiaPanelProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Lê o snapshot do dia selecionado (que já contém os inputs manuais salvos)
  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  // Lê o snapshot da conciliação imediatamente anterior
  const { data: previousSnapshot } = usePreviousDaySnapshot(selectedDate);
  const saveSnapshot = useSaveDailySnapshot();

  // Estados locais para edição dos campos manuais
  const [faturamentoInput, setFaturamentoInput] = useState<number>(0);
  const [dinheiroMpInput, setDinheiroMpInput] = useState<number>(0);
  const [aReceberInput, setAReceberInput] = useState<number>(0);
  const [contasInput, setContasInput] = useState<number>(0);

  // Faturamento Anterior (Ant) vem do snapshot anterior ou metadados de Marco Zero
  const faturamentoAnteriorGlobal = summary?.faturamento_anterior 
    ?? previousSnapshot?.faturamento 
    ?? (currentSnapshot?.metadata as any)?.faturamento_anterior 
    ?? 0;

  // Caixa Anterior vem do fechamento anterior ou do metadata do snapshot atual (Marco Zero)
  const caixaAnteriorGlobal = summary?.caixa_anterior 
    ?? previousSnapshot?.caixa_atual 
    ?? (currentSnapshot?.metadata as any)?.caixa_anterior 
    ?? 0;

  // Hidratação a partir dos dados do banco ao trocar de data ou carregar snapshot
  useEffect(() => {
    const initialFaturamento = currentSnapshot?.faturamento 
      ?? (summary?.faturamento_anterior && summary?.faturamento_ofx ? (summary.faturamento_anterior + summary.faturamento_ofx) : (summary?.faturamento_ofx || 0));
    
    setFaturamentoInput(Number(initialFaturamento) || 0);
    setDinheiroMpInput(Number(currentSnapshot?.dinheiro_mp ?? summary?.dinheiro_mp ?? 0));
    setAReceberInput(Number(currentSnapshot?.a_receber_manual ?? summary?.a_receber ?? 0));
    setContasInput(Number(currentSnapshot?.contas_a_pagar ?? summary?.contas_manual ?? 0));
    setIsEditing(false);
  }, [selectedDate, currentSnapshot, summary]);

  // Valores ativos baseados no modo de edição (isEditing ? input local : snapshot persistido / summary)
  const faturamentoAcumuladoHoje = isEditing ? faturamentoInput : (currentSnapshot?.faturamento ?? faturamentoInput);
  const dinheiroMpValor = isEditing ? dinheiroMpInput : (currentSnapshot?.dinheiro_mp ?? summary?.dinheiro_mp ?? 0);
  const aReceberValor = isEditing ? aReceberInput : (currentSnapshot?.a_receber_manual ?? summary?.a_receber ?? 0);
  const contasManualValor = isEditing ? contasInput : (currentSnapshot?.contas_a_pagar ?? summary?.contas_manual ?? 0);

  // Pilares Automáticos
  const saldoBancosValor = summary?.total_saldo_banco ?? currentSnapshot?.saldo_bancario ?? totalBancarioIn;
  const naLojaValor = summary?.na_loja_os ?? currentSnapshot?.total_patio ?? 0;
  const jurosRedeValor = summary?.juros_rede ?? currentSnapshot?.juros_rede ?? 0;
  const faturamentoOutrosValor = Number(currentSnapshot?.faturamento_outros_valor ?? summary?.faturamento_outros ?? 0);

  // Cálculo Odômetro do Faturamento Líquido do Dia + Ajustes Justificados
  const faturamentoLiquidoDia = faturamentoAnteriorGlobal > 0 
    ? (faturamentoAcumuladoHoje - faturamentoAnteriorGlobal) 
    : faturamentoAcumuladoHoje;
  const faturamentoTotalComAjustes = faturamentoLiquidoDia + faturamentoOutrosValor;

  // Matemática Consolidada
  const caixaAtualCalculado = saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor;
  const fluxoCaixaCalculado = caixaAtualCalculado - caixaAnteriorGlobal;
  const valorDispContasCalculado = faturamentoTotalComAjustes - fluxoCaixaCalculado;
  const subtotalContasCalculado = jurosRedeValor + contasManualValor;
  const diferencaFinalCalculada = Math.abs(valorDispContasCalculado) - subtotalContasCalculado;

  const diferencaAbs = Math.abs(diferencaFinalCalculada);
  const isDiferencaOk = diferencaAbs <= 50;

  const handleCancel = () => {
    const initialFaturamento = currentSnapshot?.faturamento 
      ?? (summary?.faturamento_anterior && summary?.faturamento_ofx ? (summary.faturamento_anterior + summary.faturamento_ofx) : (summary?.faturamento_ofx || 0));
    setFaturamentoInput(Number(initialFaturamento) || 0);
    setDinheiroMpInput(Number(currentSnapshot?.dinheiro_mp ?? summary?.dinheiro_mp ?? 0));
    setAReceberInput(Number(currentSnapshot?.a_receber_manual ?? summary?.a_receber ?? 0));
    setContasInput(Number(currentSnapshot?.contas_a_pagar ?? summary?.contas_manual ?? 0));
    setIsEditing(false);
    toast.info('Edição cancelada. Valores restaurados.');
  };

  const handleSave = async () => {
    try {
      // Gravar na_loja_os no histórico de cada loja se disponível
      if (storesData && storesData.length > 0) {
        const promises = Object.values(storesData).map(s => 
          supabase.from('reconciliations').upsert({
            store_id: s.store_id || (s as any).id,
            date: selectedDate,
            na_loja_os: s.na_loja_os,
            status: 'validated'
          }, { onConflict: 'store_id,date' })
        );
        await Promise.all(promises);
      }

      // Ao salvar, atualiza as colunas de resultado no snapshot de hoje
      await saveSnapshot.mutateAsync({
        date: selectedDate,
        caixa_atual: caixaAtualCalculado,
        // O Faturamento persistido é a leitura acumulada (odômetro) do dia
        faturamento: faturamentoAcumuladoHoje,
        dinheiro_mp: dinheiroMpValor,
        total_recebiveis: aReceberValor,
        total_patio: naLojaValor,
        saldo_bancario: saldoBancosValor,
        a_receber_manual: aReceberValor,
        faturamento_outros_valor: faturamentoOutrosValor,
        faturamento_outros_desc: currentSnapshot?.faturamento_outros_desc || null,
        contas_a_pagar: contasManualValor,
        provisao: 0,
        saldo_negativo_itau: currentSnapshot?.saldo_negativo_itau || 0,
        juros_rede: jurosRedeValor,
        notes: 'Fechamento diário salvo via painel de conciliação.',
      });

      await queryClient.invalidateQueries({ queryKey: ['daily-snapshot', selectedDate] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary', selectedDate] });

      setIsSaved(true);
      setIsEditing(false);
      toast.success('Fechamento diário gravado com sucesso!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      toast.error('Erro ao gravar fechamento: ' + (err.message || err));
    }
  };

  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;

  if (isMarcoZero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-3xl shadow-xl overflow-hidden p-6"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl mt-1 shrink-0">
              <Database size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-white tracking-tight">Implantação Marco Zero</h1>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Estado Inicial Implantado
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xl">
                Esta data é o lastro patrimonial inicial das filiais. Os saldos e ordens de serviço legadas foram consolidadas e ancoradas no sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => onDayChange(-1)}
              disabled={availableDates.length > 0 && selectedDate === availableDates[0]}
              className="p-2 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-mono font-bold text-sm text-emerald-400">
              <CalendarDays size={16} />
              {selectedDate.split('-').reverse().join('/')}
            </div>
            <button
              onClick={() => onDayChange(1)}
              disabled={availableDates.length > 0 && selectedDate === availableDates[availableDates.length - 1]}
              className="p-2 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCÁRIO INICIAL</span>
            <p className="text-xl font-bold font-mono text-[var(--color-accent-light-blue)]">
              <AnimatedNumber value={currentSnapshot?.saldo_bancario || 0} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato OFX Marco Zero</span>
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO EM CAIXA</span>
            <p className="text-xl font-bold font-mono text-[var(--color-accent-teal)]">
              <AnimatedNumber value={currentSnapshot?.dinheiro_mp || 0} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Conferência física</span>
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER (BOLETOS)</span>
            <p className="text-xl font-bold font-mono text-[var(--color-primary)]">
              <AnimatedNumber value={currentSnapshot?.a_receber_manual || 0} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Carteira inicial a liquidar</span>
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">ESTOQUE / OS PÁTIO</span>
            <p className="text-xl font-bold font-mono text-[var(--color-accent-warning)]">
              <AnimatedNumber value={currentSnapshot?.total_patio || 0} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Carros no pátio implantados</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-500/10 -mx-6 -mb-6 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-400" />
            <span className="text-sm font-semibold text-white">Patrimônio Inicial Ancorado (Caixa de Partida)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            <AnimatedNumber value={currentSnapshot?.caixa_atual || 0} format="currency" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
    >
      {/* Top Header Section */}
      <div className="p-6 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1.5 rounded-lg border border-[var(--border-subtle)]">
              <button
                onClick={() => onDayChange(-1)}
                disabled={availableDates.length > 0 && selectedDate === availableDates[0]}
                className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)] disabled:opacity-30 transition-colors"
                title="Dia anterior"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 font-mono font-bold text-sm text-[var(--text-primary)]">
                <CalendarDays size={16} className="text-[var(--color-primary)]" />
                {selectedDate ? selectedDate.split('-').reverse().join('/') : 'Carregando...'}
              </div>

              <button
                onClick={() => onDayChange(1)}
                disabled={availableDates.length > 0 && selectedDate === availableDates[availableDates.length - 1]}
                className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)] disabled:opacity-30 transition-colors"
                title="Próximo dia"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {isEditing && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-2.5 py-1 animate-pulse">
                Modo Edição Ativo
              </Badge>
            )}
          </div>

          <div className="flex gap-6 text-right font-sans tabular-nums">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Apurado Sistema (Fechamento)</p>
              <p className="text-xl font-display font-bold text-[var(--text-primary)]"><AnimatedNumber value={totalSistema} format="currency" /></p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider mb-1">Entradas OFX (Fechamento)</p>
              <p className="text-xl font-display font-bold text-[var(--color-primary)]"><AnimatedNumber value={totalBancarioIn} format="currency" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid das Métricas */}
      <div className="p-6 bg-[var(--bg-canvas)]">
        
        {/* 5 Pilares Iniciais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          
          {/* 1. Saldo Banco */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCO ITAÚ</span>
              <Landmark size={15} className="text-[var(--color-accent-light-blue)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-light-blue)]">
              <AnimatedNumber value={saldoBancosValor} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX global</span>
          </div>

          {/* 2. Dinheiro MP */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP</span>
              <Wallet size={15} className="text-[var(--color-accent-teal)]" />
            </div>
            {isEditing ? (
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-tertiary)]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={dinheiroMpInput || ''}
                  onChange={(e) => setDinheiroMpInput(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--color-accent-teal)]/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-[var(--color-accent-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-teal)]"
                />
              </div>
            ) : (
              <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-teal)]">
                <AnimatedNumber value={dinheiroMpValor} format="currency" />
              </p>
            )}
            <span className="text-[10px] text-[var(--text-tertiary)] block">Preenchido na importação</span>
          </div>

          {/* 3. A Receber */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER</span>
              <Receipt size={15} className="text-[var(--color-primary)]" />
            </div>
            {isEditing ? (
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-tertiary)]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={aReceberInput || ''}
                  onChange={(e) => setAReceberInput(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--color-primary)]/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
            ) : (
              <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-primary)]">
                <AnimatedNumber value={aReceberValor} format="currency" />
              </p>
            )}
            <span className="text-[10px] text-[var(--text-tertiary)] block">Boletos/Descontos manuais</span>
          </div>

          {/* 4. Na Loja OS */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">NA LOJA OS</span>
              <ShoppingBag size={15} className="text-[var(--color-accent-warning)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-warning)]">
              <AnimatedNumber value={naLojaValor} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes</span>
          </div>

          {/* 5. Contas Manual */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">CONTAS (MANUAL)</span>
              <Receipt size={15} className="text-[var(--color-accent-danger)]" />
            </div>
            {isEditing ? (
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-tertiary)]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={contasInput || ''}
                  onChange={(e) => setContasInput(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--color-accent-danger)]/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-[var(--color-accent-danger)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-danger)]"
                />
              </div>
            ) : (
              <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-danger)]">
                <AnimatedNumber value={contasManualValor} format="currency" />
              </p>
            )}
            <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1">
              <span>Juros: <AnimatedNumber value={jurosRedeValor} format="currency" /></span>
              <span title="Total de Saídas no Extrato OFX importado" className="border-b border-dashed border-[var(--text-tertiary)]/30 cursor-help text-[var(--text-tertiary)]/70 hover:text-[var(--text-tertiary)]">
                OFX Out: -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(totalOfxOut))}
              </span>
            </div>
          </div>

        </div>

        {/* Dashboard de Consolidação & Diferença */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Card Grandão - Consolidação */}
          <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 uppercase text-xs tracking-wider">Consolidação do Dia</h3>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Caixa Atual */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Caixa Atual</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  <AnimatedNumber value={caixaAtualCalculado} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Descontado saldo negativo (Itaú)</span>
              </div>

              {/* Fluxo de Caixa */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Fluxo de Caixa</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  <AnimatedNumber value={fluxoCaixaCalculado} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)] block mt-1">Caixa atual vs Conciliação Anterior</span>
              </div>

              {/* Faturamento Líquido (Odômetro) */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Faturamento Líquido</span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface-hover)] px-1.5 rounded">
                    Ant: <AnimatedNumber value={faturamentoAnteriorGlobal} format="currency" />
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-1 mt-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={faturamentoInput || ''}
                      onChange={(e) => setFaturamentoInput(Number(e.target.value))}
                      placeholder="Odômetro Acumulado Hoje"
                      className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--color-primary)]/40 rounded-lg py-1 px-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-[10px] text-[var(--color-primary)] font-semibold block">
                      = Líquido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                      <AnimatedNumber value={faturamentoTotalComAjustes} format="currency" />
                    </span>
                    <div className="flex flex-col gap-0.5 mt-0.5 text-[9px] text-[var(--text-tertiary)]">
                      <span>Odômetro: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}</span>
                      {faturamentoOutrosValor > 0 && (
                        <span className="text-[var(--color-accent-teal)] font-medium">
                          + Justificados: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoOutrosValor)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Valor Disp. Contas */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Valor Disp. Contas</span>
                <span className="text-lg font-bold text-[var(--color-primary-bright)] mt-1 block">
                  <AnimatedNumber value={valorDispContasCalculado} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Faturamento Líquido - Fluxo de Caixa</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface-elevated)] p-3 rounded-lg">
               <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Subtotal: Valor Contas</span>
                  <span className="text-[9px] text-[var(--text-tertiary)]">Juros (REDE) + Contas (Manual)</span>
               </div>
               <span className="text-lg font-bold text-[var(--color-accent-warning)]">
                 <AnimatedNumber value={subtotalContasCalculado} format="currency" />
               </span>
            </div>
          </div>

          {/* Card Lateral - Diferença Verde/Vermelho */}
          <div className={`p-6 rounded-xl border flex flex-col justify-center items-center text-center shadow-lg transition-colors ${
            isDiferencaOk
              ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30'
              : 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30'
          }`}>
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
               isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
             }`}>Diferença Final</h3>
             
             <p className={`text-4xl font-display font-bold tabular-nums ${
               isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
             }`}>
               <AnimatedNumber value={diferencaFinalCalculada} format="currency" />
             </p>
             
             <p className={`text-xs mt-3 opacity-80 ${
               isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
             }`}>
               {isDiferencaOk 
                 ? 'Variação dentro do limite seguro (± R$ 50).' 
                 : 'Variação fora da tolerância de ± R$ 50. Verifique os lançamentos!'}
             </p>
          </div>
        </div>

        {/* Barra de Ações com Trava de Edição */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4 mt-6">
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-2 px-6 py-2 text-sm border-[var(--color-primary)]/40 text-[var(--text-primary)] hover:bg-[var(--color-primary)]/10"
            >
              <Edit2 size={16} />
              Editar Fechamento
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={saveSnapshot.isPending}
                className="gap-2 px-5 py-2 text-sm text-[var(--text-tertiary)] hover:text-white"
              >
                <X size={16} />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saveSnapshot.isPending}
                className="gap-2 px-6 py-2 text-sm bg-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/90 text-black font-semibold"
              >
                <Save size={16} />
                {saveSnapshot.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
