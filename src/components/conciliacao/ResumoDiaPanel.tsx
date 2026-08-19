import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight, Landmark, Wallet, Receipt, ShoppingBag, Edit2, Database, ShieldCheck, X
} from 'lucide-react';
import { useDailySnapshot, usePreviousDaySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { useJustifiedTransactions } from '@/hooks/useJustifiedTransactions';
import { useReconciliationInsights } from '@/hooks/useReconciliationInsights';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { FaturamentoAtualBreakdownModal } from '@/components/conciliacao/FaturamentoAtualBreakdownModal';
import { MaquininhasDetailModal } from '@/components/conciliacao/MaquininhasDetailModal';
import { WhisperDot } from '@/components/conciliacao/WhisperDot';
import { AuditTrailBar } from '@/components/conciliacao/AuditTrailBar';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { DailyReconciliationSummary, usePosTripleReconciliation } from '@/hooks/useBackendConciliacao';
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
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isMaquininhasModalOpen, setIsMaquininhasModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tripleReconData, isLoading: loadingTripleRecon } = usePosTripleReconciliation(selectedDate);

  // Lê o snapshot do dia selecionado (que já contém os inputs manuais salvos)
  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  // Lê o snapshot da conciliação imediatamente anterior
  const { data: previousSnapshot } = usePreviousDaySnapshot(selectedDate);
  const saveSnapshot = useSaveDailySnapshot();
  const { data: justifiedData } = useJustifiedTransactions(selectedDate);
  const { data: insights } = useReconciliationInsights(selectedDate, summary);
  const { canEditData } = useUserPermissions();

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

  // Sincroniza estados locais apenas quando não estiver no meio de uma edição ativa
  useEffect(() => {
    if (!isEditing) {
      const initialFaturamento = currentSnapshot?.faturamento 
        ?? (summary?.faturamento_anterior && summary?.faturamento_ofx ? (summary.faturamento_anterior + summary.faturamento_ofx) : (summary?.faturamento_ofx || 0));
      setFaturamentoInput(Number(initialFaturamento) || 0);
      setDinheiroMpInput(Number(currentSnapshot?.dinheiro_mp ?? summary?.dinheiro_mp ?? 0));
      setAReceberInput(Number(currentSnapshot?.a_receber_manual ?? summary?.a_receber ?? 0));
      setContasInput(Number(currentSnapshot?.contas_a_pagar ?? summary?.contas_manual ?? 0));
    }
  }, [currentSnapshot, summary, isEditing]);

  // Valores ativos baseados no modo de edição (isEditing ? input local : snapshot persistido / summary)
  const faturamentoAcumuladoHoje = isEditing ? faturamentoInput : (currentSnapshot?.faturamento ?? faturamentoInput);
  const dinheiroMpValor = isEditing ? dinheiroMpInput : (currentSnapshot?.dinheiro_mp ?? summary?.dinheiro_mp ?? 0);
  const aReceberValor = isEditing ? aReceberInput : (currentSnapshot?.a_receber_manual ?? summary?.a_receber ?? 0);
  const contasManualValor = isEditing ? contasInput : (currentSnapshot?.contas_a_pagar ?? summary?.contas_manual ?? 0);

  // Pilares Automáticos
  const saldoBancosValor = summary?.total_saldo_banco ?? currentSnapshot?.saldo_bancario ?? totalBancarioIn;
  const naLojaValor = summary?.na_loja_os ?? currentSnapshot?.total_patio ?? 0;
  const jurosRedeValor = summary?.juros_rede ?? currentSnapshot?.juros_rede ?? 0;
  
  // Total de justificativas do dia (subindo para o Faturamento Atual)
  const totalJustificadosDia = justifiedData?.totalGlobal || 0;
  const faturamentoOutrosValor = totalJustificadosDia > 0 
    ? totalJustificadosDia 
    : Number(currentSnapshot?.faturamento_outros_valor ?? summary?.faturamento_outros ?? 0);

  // Cálculo Odômetro do Faturamento Mapa de Metas do Dia
  const faturamentoLiquidoDia = faturamentoAnteriorGlobal > 0 
    ? (faturamentoAcumuladoHoje - faturamentoAnteriorGlobal) 
    : faturamentoAcumuladoHoje;
    
  // Faturamento Atual = Mapa de Metas + Transações Justificadas
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
              className="p-2 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="relative flex items-center gap-2 px-3 py-1 font-mono font-bold text-sm text-emerald-400 cursor-pointer hover:text-emerald-300">
              <CalendarDays size={16} />
              <span>{selectedDate ? selectedDate.split('-').reverse().join('/') : 'Carregando...'}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value && onDateSelect) {
                    onDateSelect(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Clique para escolher uma data"
              />
            </div>
            <button
              onClick={() => onDayChange(1)}
              disabled={availableDates.length > 0 && selectedDate === availableDates[availableDates.length - 1]}
              className="p-2 hover:bg-white/10 rounded-lg text-white/70 disabled:opacity-30 transition-colors cursor-pointer"
              title="Próximo dia"
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
      <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-zinc-900/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
              <button
                onClick={() => onDayChange(-1)}
                disabled={availableDates.length > 0 && selectedDate === availableDates[0]}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                title="Dia anterior"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>

              <div className="relative flex items-center gap-2 px-3 py-1 font-mono font-bold text-sm text-zinc-100 cursor-pointer hover:text-indigo-300">
                <CalendarDays size={16} className="text-indigo-400" />
                <span>{selectedDate ? selectedDate.split('-').reverse().join('/') : 'Carregando...'}</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value && onDateSelect) {
                      onDateSelect(e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Clique para escolher uma data no calendário"
                />
              </div>

              <button
                onClick={() => onDayChange(1)}
                disabled={availableDates.length > 0 && selectedDate === availableDates[availableDates.length - 1]}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
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

          <div className="flex items-center gap-3 self-end md:self-auto font-sans tabular-nums">
            <div className="bg-zinc-950/80 px-3.5 py-1.5 rounded-xl border border-zinc-800/80 text-right">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Apurado Sistema</p>
              <p className="text-base font-bold font-mono text-zinc-100">
                <AnimatedNumber value={totalSistema} format="currency" />
              </p>
            </div>
            <div className="bg-zinc-950/80 px-3.5 py-1.5 rounded-xl border border-zinc-800/80 text-right">
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Entradas OFX</p>
              <p className="text-base font-bold font-mono text-indigo-300">
                <AnimatedNumber value={totalBancarioIn} format="currency" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid das Métricas */}
      <div className="p-5 sm:p-6 bg-zinc-950">
        
        {/* 5 Pilares Iniciais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
          
          {/* 1. Saldo Bancos + Cartões */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">SALDO BANCOS</span>
                  <WhisperDot dot={insights?.dots.saldo_banco} />
                </div>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Landmark size={14} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tracking-tight">
                <AnimatedNumber value={summary?.total_saldo_banco ?? (saldoBancosValor + (tripleReconData?.total_nao_entrou || 0))} format="currency" />
              </p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-zinc-800/80 flex flex-col gap-1 text-[11px] font-mono text-zinc-400">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">OFX:</span>
                <span className="text-zinc-300"><AnimatedNumber value={summary?.saldo_bancos_ofx ?? saldoBancosValor} format="currency" /></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">+ Maq:</span>
                <button
                  type="button"
                  onClick={() => setIsMaquininhasModalOpen(true)}
                  title="Maquininhas Não Entradas (A Compensar). Clique para detalhar."
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1 hover:underline cursor-pointer"
                >
                  + <AnimatedNumber value={summary?.cartoes_a_compensar ?? (tripleReconData?.total_nao_entrou || 0)} format="currency" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Dinheiro MP */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">DINHEIRO MP</span>
                  <WhisperDot dot={insights?.dots.dinheiro_mp} />
                </div>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet size={14} />
                </div>
              </div>
              {isEditing ? (
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={dinheiroMpInput || ''}
                    onChange={(e) => setDinheiroMpInput(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-zinc-950 border border-emerald-500/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  <AnimatedNumber value={dinheiroMpValor} format="currency" />
                </p>
              )}
            </div>
            <div className="pt-2.5 mt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex justify-between items-center">
              <span>Tipo:</span>
              <span className="text-zinc-400">Em Espécie</span>
            </div>
          </div>

          {/* 3. A Receber */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">A RECEBER</span>
                  <WhisperDot dot={insights?.dots.a_receber} />
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                  <Receipt size={14} />
                </div>
              </div>
              {isEditing ? (
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={aReceberInput || ''}
                    onChange={(e) => setAReceberInput(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-zinc-950 border border-indigo-500/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <p className="text-xl sm:text-2xl font-bold font-mono text-indigo-400 tracking-tight">
                  <AnimatedNumber value={aReceberValor} format="currency" />
                </p>
              )}
            </div>
            <div className="pt-2.5 mt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex justify-between items-center">
              <span>Origem:</span>
              <span className="text-zinc-400">Boletos / Manuais</span>
            </div>
          </div>

          {/* 4. Na Loja OS */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">NA LOJA (OS)</span>
                  <WhisperDot dot={insights?.dots.na_loja_os} />
                </div>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <ShoppingBag size={14} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
                <AnimatedNumber value={naLojaValor} format="currency" />
              </p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex justify-between items-center">
              <span>Status:</span>
              <span className="text-zinc-400">Pátio Pendente</span>
            </div>
          </div>

          {/* 5. Contas Manual */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700/80 transition-all shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider truncate">CONTAS (MANUAL)</span>
                  <WhisperDot dot={insights?.dots.contas} />
                </div>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt size={14} />
                </div>
              </div>
              {isEditing ? (
                <div className="relative mt-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={contasInput || ''}
                    onChange={(e) => setContasInput(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full bg-zinc-950 border border-rose-500/40 rounded-lg py-1 pl-7 pr-2 text-base font-bold font-mono text-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              ) : (
                <p className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tracking-tight">
                  <AnimatedNumber value={contasManualValor} format="currency" />
                </p>
              )}
            </div>
            <div className="pt-2.5 mt-2 border-t border-zinc-800/80 flex flex-col gap-1 text-[11px] font-mono text-zinc-400">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Juros:</span>
                <span className="text-zinc-300"><AnimatedNumber value={jurosRedeValor} format="currency" /></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">OFX Out:</span>
                <span className="text-zinc-400">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(totalOfxOut))}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Dashboard de Consolidação & Balanço (3 Colunas Harmoniosas) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          
          {/* Coluna 1: Dinâmica de Caixa */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Caixa Atual Consolidado
              </span>
              <span className="text-2xl font-bold font-mono text-zinc-100 block">
                <AnimatedNumber value={caixaAtualCalculado} format="currency" />
              </span>
              <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
                Patrimônio Disponível
              </span>
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  Fluxo de Caixa
                </span>
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${fluxoCaixaCalculado >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  vs Anterior
                </span>
              </div>
              <span className={`text-lg font-bold font-mono block ${fluxoCaixaCalculado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fluxoCaixaCalculado >= 0 ? '+ ' : ''}<AnimatedNumber value={fluxoCaixaCalculado} format="currency" />
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                Caixa Anterior: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixaAnteriorGlobal)}
              </span>
            </div>
          </div>

          {/* Coluna 2: Operação & Disponível para Contas */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm">
            <div 
              onClick={() => !isEditing && setIsBreakdownModalOpen(true)}
              className={!isEditing ? "cursor-pointer group" : ""}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                  Faturamento do Dia
                </span>
                {!isEditing && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    Ver Detalhes ↗
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-1 mt-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={faturamentoInput || ''}
                    onChange={(e) => setFaturamentoInput(Number(e.target.value))}
                    placeholder="Faturamento Mapa de Metas"
                    className="w-full bg-zinc-950 border border-indigo-500/40 rounded-lg py-1 px-2.5 text-base font-bold font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-indigo-400 font-semibold block">
                    = Líquido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-bold font-mono text-zinc-100 block group-hover:text-emerald-400 transition-colors">
                    <AnimatedNumber value={faturamentoTotalComAjustes} format="currency" />
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-500">
                    <span>Metas: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}</span>
                    {totalJustificadosDia > 0 && (
                      <span className="text-blue-400 font-semibold">+ Justificados: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalJustificadosDia)}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Disponível para Contas
              </span>
              <span className="text-lg font-bold font-mono text-indigo-300 block">
                <AnimatedNumber value={valorDispContasCalculado} format="currency" />
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                Faturamento Líquido - Fluxo de Caixa
              </span>
            </div>
          </div>

          {/* Coluna 3: Balanço do Fechamento & Diferença Final */}
          <div className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 transition-all relative shadow-sm ${
            isDiferencaOk 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  Subtotal Contas a Pagar
                </span>
                <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <AnimatedNumber value={subtotalContasCalculado} format="currency" />
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono block">
                Juros ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(jurosRedeValor)}) + Contas ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contasManualValor)})
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-center gap-1.5 mb-1">
                {isDiferencaOk ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={15} className="text-rose-400" />
                )}
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-300">
                  Diferença Final Apurada
                </span>
              </div>
              <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight tabular-nums block ${
                isDiferencaOk ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <AnimatedNumber value={diferencaFinalCalculada} format="currency" />
              </span>
            </div>

            <div>
              <div className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border ${
                isDiferencaOk 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isDiferencaOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isDiferencaOk ? 'Fechamento Conforme (± R$ 50)' : 'Fora da tolerância (± R$ 50)'}
              </div>
            </div>
          </div>

        </div>

        {/* Auditoria Discreta - Observações da Conciliação */}
        <AuditTrailBar observations={insights?.observations} className="mb-6" />

        {/* Barra de Ações com Trava de Edição */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] pt-4 mt-6">
          {!isEditing ? (
            <Button
              variant="outline"
              disabled={!canEditData}
              onClick={() => {
                if (!canEditData) {
                  toast.error('Você não tem permissão para editar dados.');
                  return;
                }
                setIsEditing(true);
              }}
              title={!canEditData ? 'Apenas usuários com permissão de edição podem alterar o fechamento.' : 'Editar valores do dia'}
              className={`gap-2 px-6 py-2 text-sm border-[var(--color-primary)]/40 text-[var(--text-primary)] hover:bg-[var(--color-primary)]/10 ${!canEditData ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Modal de Composição do Faturamento Atual */}
      <FaturamentoAtualBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        selectedDate={selectedDate}
        mapaMetasAmount={faturamentoLiquidoDia}
        justifiedTransactions={justifiedData?.transactions || []}
        totalJustified={totalJustificadosDia}
        totalFaturamentoAtual={faturamentoTotalComAjustes}
      />

      {/* Modal de Detalhamento Triplo de Maquininhas & Batimento OFX */}
      <MaquininhasDetailModal
        isOpen={isMaquininhasModalOpen}
        onClose={() => setIsMaquininhasModalOpen(false)}
        targetDate={selectedDate}
        data={summary?.maquininhas_detalhe || tripleReconData}
        isLoading={loadingTripleRecon}
      />
    </motion.div>
  );
}
