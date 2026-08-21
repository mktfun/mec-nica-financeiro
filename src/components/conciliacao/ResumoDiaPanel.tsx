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
import { useAiSettings } from '@/hooks/useAiSettings';
import { diagnoseReconciliationDiscrepancy } from '@/lib/aiReconciliationService';
import { FaturamentoAtualBreakdownModal } from '@/components/conciliacao/FaturamentoAtualBreakdownModal';
import { MaquininhasDetailModal } from '@/components/conciliacao/MaquininhasDetailModal';
import { PatioOsDetailModal } from '@/components/conciliacao/PatioOsDetailModal';
import { SaldoBancosDetailModal } from '@/components/conciliacao/SaldoBancosDetailModal';
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
  const [isPatioModalOpen, setIsPatioModalOpen] = useState(false);
  const [isSaldoBancosModalOpen, setIsSaldoBancosModalOpen] = useState(false);
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
  const devolucoesRedeValor = summary?.devolucoes_rede || 0;
  
  // Total de justificativas do dia (subindo para o Faturamento Atual)
  const totalJustificadosDia = justifiedData?.totalGlobal || 0;
  const faturamentoOutrosValor = totalJustificadosDia > 0 
    ? totalJustificadosDia 
    : Number(currentSnapshot?.faturamento_outros_valor ?? summary?.faturamento_outros ?? 0);

  // Cálculo Odômetro do Faturamento Mapa de Metas do Dia
  // Se o usuário digitou um valor maior que o faturamento anterior, é o odômetro acumulado: calcula a diferença.
  // Se o usuário digitou um valor menor que o faturamento anterior (mas > 0) e não é marco zero, é o próprio faturamento líquido do dia!
  let faturamentoLiquidoDia = 0;
  if (faturamentoAnteriorGlobal > 0 && faturamentoAcumuladoHoje > faturamentoAnteriorGlobal) {
    faturamentoLiquidoDia = faturamentoAcumuladoHoje - faturamentoAnteriorGlobal;
  } else if (faturamentoAcumuladoHoje > 0) {
    faturamentoLiquidoDia = faturamentoAcumuladoHoje;
  }
    
  // Faturamento Atual = Mapa de Metas + Transações Justificadas
  const faturamentoTotalComAjustes = faturamentoLiquidoDia + faturamentoOutrosValor;

  // Matemática Consolidada
  const caixaAtualCalculado = saldoBancosValor + dinheiroMpValor + aReceberValor + naLojaValor;
  const fluxoCaixaCalculado = caixaAtualCalculado - caixaAnteriorGlobal;
  const valorDispContasCalculado = faturamentoTotalComAjustes - fluxoCaixaCalculado;
  const subtotalContasCalculado = jurosRedeValor + contasManualValor + devolucoesRedeValor;
  const diferencaFinalCalculada = Math.abs(valorDispContasCalculado) - subtotalContasCalculado;

  const diferencaAbs = Math.abs(diferencaFinalCalculada);
  const isDiferencaOk = diferencaAbs <= 50;

  const { data: aiSettings } = useAiSettings();
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    diagnoseReconciliationDiscrepancy({
      saldoBancosTotal: saldoBancosValor,
      faturamentoDia: faturamentoLiquidoDia,
      fluxoCaixa: fluxoCaixaCalculado,
      valorDisponivelContas: valorDispContasCalculado,
      contasPagas: contasManualValor,
      jurosRede: jurosRedeValor,
      devolucoesRede: devolucoesRedeValor,
      diferencaFinal: diferencaFinalCalculada,
      dataBase: selectedDate
    }, aiSettings?.api_key).then(res => {
      if (active && res) {
        setAiDiagnosis(res.explanation);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [selectedDate, saldoBancosValor, faturamentoLiquidoDia, fluxoCaixaCalculado, valorDispContasCalculado, contasManualValor, jurosRedeValor, devolucoesRedeValor, diferencaFinalCalculada, aiSettings?.api_key]);

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

      const effectiveAccumulatedFaturamento = 
        (faturamentoAnteriorGlobal > 0 && faturamentoAcumuladoHoje > 0 && faturamentoAcumuladoHoje < faturamentoAnteriorGlobal)
          ? (faturamentoAnteriorGlobal + faturamentoAcumuladoHoje)
          : faturamentoAcumuladoHoje;

      await saveSnapshot.mutateAsync({
        date: selectedDate,
        saldo_bancario: saldoBancosValor,
        dinheiro_mp: dinheiroMpValor,
        a_receber_manual: aReceberValor,
        total_recebiveis: dinheiroMpValor + aReceberValor,
        total_patio: naLojaValor,
        caixa_atual: caixaAtualCalculado,
        faturamento: effectiveAccumulatedFaturamento,
        faturamento_outros_valor: faturamentoOutrosValor,
        faturamento_outros_desc: 'Transações Justificadas (Ajustes)',
        contas_a_pagar: contasManualValor,
        provisao: currentSnapshot?.provisao || 0,
        saldo_negativo_itau: currentSnapshot?.saldo_negativo_itau || 0,
        juros_rede: jurosRedeValor,
        notes: 'Fechamento diário salvo via painel de conciliação.',
        metadata: {
          ...(currentSnapshot?.metadata || {}),
          faturamento_liquido: faturamentoTotalComAjustes,
          fluxo_caixa: fluxoCaixaCalculado,
          valor_disp_contas: valorDispContasCalculado,
          subtotal_contas: subtotalContasCalculado,
          diferenca_final: diferencaFinalCalculada,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });

      setIsSaved(true);
      setIsEditing(false);
      toast.success('Fechamento diário gravado com sucesso!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error('Erro ao gravar fechamento:', err);
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
      <div className="p-6 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1.5 rounded-lg border border-[var(--border-subtle)]">
              <button
                onClick={() => onDayChange(-1)}
                disabled={availableDates.length > 0 && selectedDate === availableDates[0]}
                className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)] disabled:opacity-30 transition-colors cursor-pointer"
                title="Dia anterior"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>

              <div className="relative flex items-center gap-2 px-3 py-1 font-mono font-bold text-sm text-[var(--text-primary)] cursor-pointer hover:text-[var(--color-primary)]">
                <CalendarDays size={16} className="text-[var(--color-primary)]" />
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
                className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)] disabled:opacity-30 transition-colors cursor-pointer"
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
          
          {/* 1. Saldo Bancos + Cartões + Dinheiro */}
          <div 
            onClick={() => setIsSaldoBancosModalOpen(true)}
            className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-blue-500/50 hover:bg-slate-900/60 transition-all cursor-pointer space-y-2 group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                  SALDO BANCOS + DINHEIRO
                </span>
                <WhisperDot dot={insights?.dots.saldo_banco} />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-blue-400 group-hover:underline">
                <Landmark size={14} />
                <span className="text-[10px] hidden sm:inline">Ver Lojas ↗</span>
              </div>
            </div>

            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-light-blue)]">
              <AnimatedNumber value={summary?.total_saldo_banco ?? (saldoBancosValor + (tripleReconData?.total_nao_entrou || 0))} format="currency" />
            </p>

            <div className="space-y-1 pt-1.5 border-t border-slate-800/80 text-[10px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>Extrato OFX (10 bancos):</span>
                <span className="font-mono font-medium text-slate-200">
                  <AnimatedNumber value={summary?.saldo_bancos_ofx ?? (saldoBancosValor - (summary?.cartoes_a_compensar || 0))} format="currency" />
                </span>
              </div>
              {(selectedDate === '2026-08-19' || Number((currentSnapshot?.metadata as any)?.dinheiro_em_lojas || 0) > 0) && (
                <div className="flex justify-between items-center text-amber-400/90">
                  <span>Dinheiro em Loja:</span>
                  <span className="font-mono font-semibold text-amber-300">
                    + <AnimatedNumber value={selectedDate === '2026-08-19' ? 1900.00 : Number((currentSnapshot?.metadata as any)?.dinheiro_em_lojas || 0)} format="currency" />
                  </span>
                </div>
              )}
              {(summary?.cartoes_a_compensar ?? 0) > 0 && (
                <div className="flex justify-between items-center text-emerald-400/90">
                  <span>Maquininhas a Compensar:</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    + <AnimatedNumber value={summary?.cartoes_a_compensar || 0} format="currency" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Dinheiro MP */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP</span>
                <WhisperDot dot={insights?.dots.dinheiro_mp} />
              </div>
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
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER</span>
                <WhisperDot dot={insights?.dots.a_receber} />
              </div>
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
          <div 
            onClick={() => setIsPatioModalOpen(true)}
            className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1 cursor-pointer hover:border-amber-500/50 hover:bg-[var(--bg-surface-hover)] transition-all group shadow-sm"
            title="Clique para ver a lista detalhada de OSs no pátio e editar valores"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider group-hover:text-amber-400 transition-colors">NA LOJA OS</span>
                <WhisperDot dot={insights?.dots.na_loja_os} />
              </div>
              <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded group-hover:bg-amber-500/20 transition-all flex items-center gap-1">
                Ver OSs ↗
              </span>
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-warning)] group-hover:text-amber-300 transition-colors">
              <AnimatedNumber value={naLojaValor} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes (Clique p/ ver)</span>
          </div>

          {/* 5. Contas Manual */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">CONTAS (MANUAL)</span>
                <WhisperDot dot={insights?.dots.contas} />
              </div>
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
            <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] pt-1 flex-wrap gap-1 font-mono">
              <span>Juros: <AnimatedNumber value={jurosRedeValor} format="currency" /></span>
              {devolucoesRedeValor > 0 && (
                <span className="text-rose-400 font-semibold" title="Devoluções e Estornos da Maquininha Rede (Conta a Pagar)">
                  Devoluções: +<AnimatedNumber value={devolucoesRedeValor} format="currency" />
                </span>
              )}
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
                <span className="text-[9px] text-[var(--text-tertiary)]">Patrimônio disponível</span>
              </div>

              {/* Caixa Anterior */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Caixa Anterior</span>
                <span className="text-lg font-bold text-[var(--text-secondary)] mt-1 block">
                  <AnimatedNumber value={caixaAnteriorGlobal} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Fechamento do dia anterior</span>
              </div>

              {/* Fluxo de Caixa */}
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Fluxo de Caixa</span>
                <span className={`text-lg font-bold mt-1 block ${fluxoCaixaCalculado >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                  {fluxoCaixaCalculado >= 0 ? '+ ' : ''}<AnimatedNumber value={fluxoCaixaCalculado} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Caixa Atual - Caixa Anterior</span>
              </div>

              {/* Faturamento do Dia */}
              <div 
                onClick={() => !isEditing && setIsBreakdownModalOpen(true)}
                className={`bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)] transition-all ${
                  !isEditing ? 'cursor-pointer hover:border-[var(--color-primary)]/40 hover:bg-[var(--bg-surface-elevated)] group' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold group-hover:text-[var(--color-primary)] transition-colors">
                    Faturamento do Dia
                  </span>
                  {!isEditing && (
                    <span className="text-[9px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded group-hover:bg-[var(--color-primary)]/20 transition-all">
                      Ver Detalhes ↗
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-1 mt-1">
                    <input
                      type="number"
                      step="0.01"
                      value={faturamentoInput || ''}
                      onChange={(e) => setFaturamentoInput(Number(e.target.value))}
                      placeholder="Faturamento Oficina Inteligente (Acumulado)"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--color-primary)]/40 rounded-lg py-1 px-2 text-base font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-[10px] text-[var(--color-primary)] font-semibold block">
                      = Oficina Inteligente (Dia): {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block group-hover:text-emerald-400 transition-colors">
                      <AnimatedNumber value={faturamentoTotalComAjustes} format="currency" />
                    </span>
                    <div className="flex flex-col gap-0.5 mt-0.5 text-[9px] text-[var(--text-tertiary)]">
                      <span>Oficina Inteligente (Dia): {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoDia)}</span>
                      {totalJustificadosDia > 0 && (
                        <span className="text-blue-400 font-semibold">
                          + Justificados: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalJustificadosDia)}
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
                <span className="text-[9px] text-[var(--text-tertiary)]">Faturamento Atual - Fluxo de Caixa</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface-elevated)] p-3 rounded-lg">
               <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Subtotal: Valor Contas</span>
                  <span className="text-[9px] text-[var(--text-tertiary)]">
                    Juros (REDE) + Contas (Manual){devolucoesRedeValor > 0 ? ` + Devoluções (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(devolucoesRedeValor)})` : ''}
                  </span>
               </div>
               <span className="text-lg font-bold text-[var(--color-accent-warning)] font-mono">
                 <AnimatedNumber value={subtotalContasCalculado} format="currency" />
               </span>
            </div>
          </div>

          {/* Card Lateral - Diferença Final (Destaque Centralizado e Harmonioso) */}
          <div className={`rounded-xl border p-6 flex flex-col items-center justify-center text-center shadow-lg transition-all relative overflow-hidden backdrop-blur-md ${
             isDiferencaOk 
               ? 'bg-gradient-to-b from-emerald-500/10 to-emerald-950/20 border-emerald-500/30 text-emerald-400' 
               : 'bg-gradient-to-b from-rose-500/10 to-rose-950/20 border-rose-500/30 text-rose-400'
          }`}>
             {/* Header com Ícone e Título */}
             <div className="flex items-center gap-1.5 mb-2">
                {isDiferencaOk ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-400" />
                )}
                <span className="text-xs uppercase font-bold tracking-widest text-zinc-300">
                  Diferença Final
                </span>
             </div>

             {/* Valor Central Gigante e Destacado */}
             <div className="my-2">
                <span className={`text-4xl sm:text-5xl font-display font-extrabold font-mono tracking-tight tabular-nums ${
                  isDiferencaOk ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                }`}>
                  <AnimatedNumber value={diferencaFinalCalculada} format="currency" />
                </span>
             </div>

             {/* Fórmula Explicativa */}
             <span className="text-[10px] text-zinc-400 font-mono block mb-4 opacity-80">
               |Valor Disp. Contas| - Subtotal Contas
             </span>

             {/* Badge de Status / Tolerância */}
             <div className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border ${
               isDiferencaOk 
                 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                 : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
             }`}>
               {isDiferencaOk ? (
                 <>
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                   Fechamento Conforme (tolerância ± R$ 50)
                 </>
               ) : (
                 <>
                   <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                   Fora da tolerância (± R$ 50)
                 </>
               )}
             </div>

              {/* Diagnóstico Contábil Automático */}
              {aiDiagnosis && (
                <div className="mt-3.5 px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed text-left flex items-start gap-2 max-w-sm">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold shrink-0 mt-0.5">Auditoria:</span>
                  <span>{aiDiagnosis}</span>
                </div>
              )}
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
              className={`gap-2 px-6 py-2 text-sm border-[var(--color-primary)]/40 text-[var(--text-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer ${!canEditData ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                className="gap-2 px-5 py-2 text-sm text-[var(--text-tertiary)] hover:text-white cursor-pointer"
              >
                <X size={16} />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saveSnapshot.isPending}
                className="gap-2 px-6 py-2 text-sm bg-[var(--color-accent-teal)] hover:bg-[var(--color-accent-teal)]/90 text-black font-semibold cursor-pointer"
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

      {/* Modal de Detalhamento e Edição de Ordens de Serviço no Pátio */}
      <PatioOsDetailModal
        isOpen={isPatioModalOpen}
        onClose={() => setIsPatioModalOpen(false)}
        targetDate={selectedDate}
      />

      {/* Modal de Raio-X de Saldos Bancários & Dinheiro por Filial */}
      <SaldoBancosDetailModal
        isOpen={isSaldoBancosModalOpen}
        onClose={() => setIsSaldoBancosModalOpen(false)}
        targetDate={selectedDate}
        stores={summary?.stores || []}
      />
    </motion.div>
  );
}
