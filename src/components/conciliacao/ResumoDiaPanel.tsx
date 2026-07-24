import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';
import {
  AlertOctagon, Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight, Landmark, Wallet, Receipt, ShoppingBag, Target
} from 'lucide-react';
import { useDailySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { supabase } from '@/lib/supabase';
import { TransactionRow } from '@/lib/supabase';
import { formatCurrency, getDefaultDate } from '@/lib/utils';
import { calculateModulo1Saldo, StoreSaldoState } from '@/lib/modulo1Calculations';

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
  storesData?: StoreSaldoState[];
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
  storesData = []
}: ResumoDiaPanelProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [anomalies, setAnomalies] = useState<TransactionRow[]>([]);
  const [manualDinheiroMpGlobal, setManualDinheiroMpGlobal] = useState<number | undefined>(undefined);

  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  const saveSnapshot = useSaveDailySnapshot();

  const storesWithManual = storesData.map(st => ({
    ...st,
    dinheiro_mp_manual: manualDinheiroMpGlobal !== undefined ? manualDinheiroMpGlobal : st.dinheiro_mp_manual
  }));

  const { globalCalculated } = calculateModulo1Saldo(storesWithManual);

  const metaMensal = 100000;
  const progressoMeta = metaMensal > 0 ? (totalSistema / metaMensal) * 100 : 0;

  useEffect(() => {
    const fetchData = async () => {
      const { data: anomData } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', selectedDate)
        .neq('source', 'ofx')
        .is('os_number', null);

      if (anomData) setAnomalies(anomData as TransactionRow[]);
    };
    fetchData();
  }, [selectedDate]);

  const handleSave = async () => {
    const notesStr = anomalies.length > 0 
      ? `Anomalias Automáticas: ${anomalies.map(a => `${a.title} (${a.amount})`).join(', ')}`
      : 'Sem observações.';

    await saveSnapshot.mutateAsync({
      date: selectedDate,
      faturamento: globalCalculated.faturamento_g27,
      total_recebiveis: globalCalculated.a_receber_g15,
      total_patio: globalCalculated.na_loja_g16,
      saldo_bancario: globalCalculated.saldo_g13,
      notes: notesStr,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const statusSuccess = isApproved && divergenciaGlobal === 0 && detalhesCount > 0;
  const statusDanger = divergenciaGlobal !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-3xl border backdrop-blur-3xl shadow-2xl transition-all duration-500 overflow-hidden ${
        statusSuccess
          ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/30'
          : statusDanger
          ? 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/30'
          : 'bg-[var(--bg-surface)]/90 border-white/10'
      }`}
    >
      {/* Luzes ambiente de fundo (Glows 3D) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--color-primary)]/15 opacity-25 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--color-accent-teal)]/15 opacity-25 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header Section */}
      <div className="relative z-10 p-6 border-b border-[var(--border-subtle)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        
        {/* Title & Status */}
        <div className="flex items-start gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`p-3.5 rounded-2xl mt-1 shadow-lg backdrop-blur-md transition-transform ${
              statusSuccess 
                ? 'bg-[var(--color-accent-teal)]/15 text-[var(--color-accent-teal)] border border-[var(--color-accent-teal)]/30 shadow-[0_0_20px_rgba(0,168,126,0.2)]' 
                : statusDanger 
                ? 'bg-[var(--color-accent-danger)]/15 text-[var(--color-accent-danger)] border border-[var(--color-accent-danger)]/30 shadow-[0_0_20px_rgba(226,59,74,0.2)]' 
                : 'bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
            }`}
          >
            {statusDanger ? <AlertOctagon size={28} /> : <CheckCircle2 size={28} />}
          </motion.div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] tracking-tight">Conciliação Diária</h1>
              <span className="bg-[var(--color-primary)]/15 text-[var(--color-primary-bright)] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-primary)]/30 uppercase tracking-wider font-sans shadow-sm">
                Aba Saldo Consolidada
              </span>
            </div>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] mt-1">
              {statusSuccess ? 'Caixas Batidos com Sucesso' : statusDanger ? 'Divergência Encontrada no Dia' : 'Aguardando Fechamento'}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 max-w-lg">
              Saldos Bancários, Extrato OFX e Apuração de Saldo Livre Real Consolidado das Lojas.
            </p>
            {statusDanger && (
              <div className="mt-2">
                <Link to="/alertas" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent-danger)] hover:text-white bg-[var(--color-accent-danger)]/10 hover:bg-[var(--color-accent-danger)]/30 px-3.5 py-1.5 rounded-full transition-colors border border-[var(--color-accent-danger)]/20 shadow-sm">
                  <AlertTriangle size={14} /> Ver Detalhes em Alertas
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Date & Totais Chave */}
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          {/* Seletor de Data */}
          <div className="flex items-center gap-1 bg-[var(--bg-canvas)]/80 backdrop-blur-md rounded-xl p-1.5 border border-[var(--border-subtle)] shadow-inner">
            <button onClick={() => onDayChange(-1)} className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-lg text-[var(--text-secondary)] transition-colors">
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <div className="flex items-center gap-2 px-3">
              <CalendarDays size={15} className="text-[var(--color-primary)]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateSelect(e.target.value)}
                className="bg-transparent text-sm font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-90 hover:opacity-100"
              />
            </div>
            <button 
              onClick={() => onDayChange(1)} 
              disabled={selectedDate === getDefaultDate()}
              className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-lg text-[var(--text-secondary)] disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-6 text-right font-sans tabular-nums">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 font-sans">Apurado Sistema (Fechamento)</p>
              <p className="text-xl font-display font-bold text-[var(--text-primary)]"><AnimatedNumber value={totalSistema} format="currency" /></p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider mb-0.5 font-sans">Entradas OFX (Fechamento)</p>
              <p className="text-xl font-display font-bold text-[var(--color-primary)]"><AnimatedNumber value={totalBancarioIn} format="currency" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid das Métricas da Aba SALDO com Efeitos Glassmorphic e Framer Motion */}
      <div className="relative z-10 p-6 bg-[var(--bg-canvas)]/50 backdrop-blur-md">
        {/* 4 Pilares Iniciais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-white/10 space-y-1.5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCO ITAÚ</span>
              <div className="p-1.5 rounded-lg bg-[var(--color-accent-light-blue)]/10 text-[var(--color-accent-light-blue)]">
                <Landmark size={15} />
              </div>
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-light-blue)] tracking-tight">
              <AnimatedNumber value={globalCalculated.saldo_g13} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX acumulado</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-white/10 space-y-1.5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP</span>
              <div className="p-1.5 rounded-lg bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]">
                <Wallet size={15} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={manualDinheiroMpGlobal !== undefined ? manualDinheiroMpGlobal : (globalCalculated.dinheiro_mp_g14 || '')}
                onChange={(e) => setManualDinheiroMpGlobal(parseFloat(e.target.value) || 0)}
                className="w-full text-lg font-bold font-sans tabular-nums bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-[var(--color-accent-teal)] focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-inner"
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Lançado manual no sistema</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-white/10 space-y-1.5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER</span>
              <div className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Receipt size={15} />
              </div>
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-primary)] tracking-tight">
              <AnimatedNumber value={globalCalculated.a_receber_g15} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Recebíveis pendentes</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-white/10 space-y-1.5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">NA LOJA OS</span>
              <div className="p-1.5 rounded-lg bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]">
                <ShoppingBag size={15} />
              </div>
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-warning)] tracking-tight">
              <AnimatedNumber value={globalCalculated.na_loja_g16} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes</span>
          </motion.div>
        </div>

        {/* Totais de Fechamento com Progresso de Meta */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-[var(--bg-surface)]/90 border border-white/10 rounded-2xl font-sans tabular-nums text-xs shadow-xl backdrop-blur-md">
          <div>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">SALDO TOTAL</span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              <AnimatedNumber value={globalCalculated.saldo_total_g17} format="currency" />
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">Banco + MP + A Receber + Na Loja</span>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">CAIXA ATUAL</span>
            <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
              <AnimatedNumber value={globalCalculated.caixa_atual_g21} format="currency" />
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">Saldo Total - Limite</span>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">DISPONÍVEL CONTAS</span>
            <span className="text-lg font-bold text-[var(--color-primary-bright)] mt-1 block">
              <AnimatedNumber value={globalCalculated.disponivel_contas_g29} format="currency" />
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">Faturamento - Fluxo</span>
          </div>

          {/* Progresso de Meta Mensal Animada */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold flex items-center gap-1">
                <Target size={12} className="text-[var(--color-primary)]" /> Meta Diária
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">{progressoMeta.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[var(--bg-canvas)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)] shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressoMeta, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent-teal)] rounded-full" 
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-1">Apurado vs Meta R$ 100k</span>
          </div>

          <div className="p-3 bg-[var(--color-accent-teal)]/15 rounded-xl border border-[var(--color-accent-teal)]/30 shadow-[0_0_15px_rgba(0,168,126,0.15)] flex flex-col justify-center">
            <span className="text-[10px] text-[var(--color-accent-teal)] uppercase block font-bold tracking-wider">RESULTADO FINAL</span>
            <span className="text-xl font-bold text-[var(--color-accent-teal)] mt-0.5 block">
              <AnimatedNumber value={globalCalculated.resultado_final_g31} format="currency" />
            </span>
            <span className="text-[10px] text-[var(--color-accent-teal)] opacity-90">Saldo Livre Real Consolidado</span>
          </div>
        </div>

        {/* Anomalias (Apenas se existirem) */}
        {anomalies.length > 0 && (
          <div className="mt-6 bg-[var(--color-accent-danger)]/5 border border-[var(--color-accent-danger)]/15 rounded-2xl p-4 shadow-md">
            <label className="text-[11px] font-bold text-[var(--color-accent-danger)] uppercase tracking-widest flex items-center gap-2 mb-3">
              <AlertOctagon size={14} /> Observações Críticas (Sem OS)
            </label>
            <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
              {anomalies.map((anom) => (
                <div key={anom.id} className="flex items-center justify-between bg-[var(--bg-canvas)]/80 backdrop-blur-sm rounded-lg p-2.5 text-sm border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[var(--color-accent-danger)]" />
                    <span className="text-[var(--text-secondary)] font-medium text-xs">{anom.title || 'Transação'}</span>
                  </div>
                  <span className={`font-sans tabular-nums text-xs font-bold ${anom.type === 'in' ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                    {anom.type === 'in' ? '+' : '-'}{formatCurrency(anom.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4 mt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saveSnapshot.isPending}
            className="gap-2 px-6 py-2.5 text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Save size={16} />
            {isSaved ? 'Salvo com Sucesso!' : 'Gravar Fechamento Diário'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
