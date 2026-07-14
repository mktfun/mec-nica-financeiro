import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import {
  Wallet, Car, ReceiptText,
  Target, Percent, AlertOctagon,
  Save, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useDailySnapshot, usePreviousDaySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { useRecebiveis } from '@/hooks/useRecebiveis';
import { usePatioOS } from '@/hooks/usePatio';
import { useDailyBankBalance } from '@/hooks/useTransactions';
import { useMonthlyGoal } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { TransactionRow } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

interface ResumoDiaPanelProps {
  date: string;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color = 'default',
  description,
  isCurrency = true,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'default' | 'green' | 'red' | 'blue' | 'yellow';
  description?: string;
  isCurrency?: boolean;
}) {
  const colorMap = {
    default: 'text-[var(--text-primary)] bg-white/5 border-white/10',
    green: 'text-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/20 shadow-[0_0_15px_-5px_var(--color-accent-teal)]',
    red: 'text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/20 shadow-[0_0_15px_-5px_var(--color-accent-danger)]',
    blue: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 shadow-[0_0_15px_-5px_var(--color-primary)]',
    yellow: 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_15px_-5px_rgba(251,191,36,0.5)]',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} flex flex-col gap-1 backdrop-blur-md transition-all hover:scale-[1.02] hover:brightness-110 relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-1 z-10">
        <Icon size={14} />
        {label}
      </div>
      <div className="font-display font-bold text-2xl tracking-tight z-10">
        {isCurrency ? <AnimatedNumber value={value} format="currency" /> : value}
      </div>
      {description && (
        <p className="text-[10px] opacity-60 leading-relaxed mt-1 font-medium z-10">{description}</p>
      )}
    </div>
  );
}

export function ResumoDiaPanel({ date }: ResumoDiaPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [anomalies, setAnomalies] = useState<TransactionRow[]>([]);

  const { data: currentSnapshot } = useDailySnapshot(date);
  const { data: previousSnapshot } = usePreviousDaySnapshot(date);
  const { data: recebiveis = [] } = useRecebiveis();
  const { data: patioData = [] } = usePatioOS();
  const { data: bankBalances } = useDailyBankBalance(date);
  const { data: monthlyGoal } = useMonthlyGoal('GLOBAL');
  const saveSnapshot = useSaveDailySnapshot();

  // Fetch anomalies for the day
  useEffect(() => {
    const fetchAnomalies = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', date)
        .neq('source', 'ofx')
        .is('os_number', null);

      if (data) {
        setAnomalies(data as TransactionRow[]);
      }
    };
    fetchAnomalies();
  }, [date]);

  // ─── Cálculos ────────────────────────────────────────────────────────────────
  const saldoBancario = Object.values(bankBalances || {}).reduce(
    (acc, val) => acc + Number(val), 0
  );

  const totalRecebiveis = recebiveis
    .filter((r) => r.status === 'pendente')
    .reduce((acc, r) => acc + Number(r.value), 0);

  const totalPatio = patioData
    .filter((os) => os.status === 'em_aberto' || os.status === 'pago_parcial')
    .reduce((acc, os) => acc + (Number(os.total_value) - Number(os.paid_value)), 0);

  const faturamentoAtual = currentSnapshot?.faturamento ?? 0;
  const faturamentoAnterior = previousSnapshot?.faturamento ?? 0;
  const metaAtual = monthlyGoal?.current_amount ?? 0;
  const metaAlvo = monthlyGoal?.target_amount ?? 0;
  const progressoMeta = metaAlvo > 0 ? (metaAtual / metaAlvo) * 100 : 0;

  const jurosRede = 0; // virá do bot quando integrado

  const handleSave = async () => {
    const notesStr = anomalies.length > 0 
      ? `Anomalias Automáticas: ${anomalies.map(a => `${a.title} (${a.amount})`).join(', ')}`
      : 'Sem observações.';

    await saveSnapshot.mutateAsync({
      date,
      faturamento: faturamentoAtual,
      total_recebiveis: totalRecebiveis,
      total_patio: totalPatio,
      saldo_bancario: saldoBancario,
      notes: notesStr,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] relative mb-8"
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent-teal)] to-[var(--color-primary)] opacity-70" />
      
      {/* Header colapsável */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent border border-[var(--color-primary)]/30 flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/10">
            <Target size={24} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-left">
            <h2 className="font-display font-bold text-2xl text-white tracking-tight group-hover:text-[var(--color-primary)] transition-colors">Fechamento do Dia</h2>
            <p className="text-[11px] text-[var(--text-tertiary)] font-medium mt-1 uppercase tracking-widest">
              Visão Consolidada da Rede
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block bg-black/20 px-4 py-2 rounded-lg border border-white/5">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-semibold mb-1">Saldo Bancário do Dia</p>
            <span className={`text-xl font-display font-bold drop-shadow-md ${saldoBancario >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
              <AnimatedNumber value={saldoBancario} format="currency" />
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5">
            {isExpanded ? (
              <ChevronUp size={16} className="text-white/70" />
            ) : (
              <ChevronDown size={16} className="text-white/70" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 space-y-6"
          >
            {/* Grid de Cards Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SummaryCard
                label="Saldo Bancário"
                value={saldoBancario}
                icon={Wallet}
                color={saldoBancario >= 0 ? 'blue' : 'red'}
                description="Soma de todos os extratos OFX"
              />
              <SummaryCard
                label="A Receber (Boletos)"
                value={totalRecebiveis}
                icon={ReceiptText}
                color="blue"
                description="Pendências e boletos"
              />
              <SummaryCard
                label="Pátio (Aberto)"
                value={totalPatio}
                icon={Car}
                color="yellow"
                description="OS abertas / pagas parcialmente"
              />
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

            {/* Faturamento + Juros */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Faturamento Atual"
                value={faturamentoAtual}
                icon={Target}
                color="green"
                description="Hoje"
              />
              <SummaryCard
                label="Faturamento Anterior"
                value={faturamentoAnterior}
                icon={Target}
                color="default"
                description="Ontem (Último Fechamento)"
              />
              <SummaryCard
                label="Juros da Rede"
                value={jurosRede}
                icon={Percent}
                color="default"
                description="Dados processados pelo bot"
              />
              <div className="p-4 rounded-xl border text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 shadow-[0_0_15px_-5px_var(--color-primary)] flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-1">
                    <Target size={14} />
                    Progresso da Meta
                  </div>
                  <span className="text-xs font-bold">{progressoMeta.toFixed(1)}%</span>
                </div>
                
                <div className="font-display font-bold text-2xl tracking-tight z-10">
                  <AnimatedNumber value={metaAtual} format="currency" />
                </div>
                
                <div className="w-full bg-black/40 h-2 rounded-full mt-2 overflow-hidden z-10 border border-white/5">
                  <div 
                    className="h-full bg-[var(--color-primary)] transition-all duration-1000" 
                    style={{ width: `${Math.min(progressoMeta, 100)}%` }} 
                  />
                </div>
                
                <p className="text-[10px] opacity-60 leading-relaxed mt-1 font-medium z-10">
                  Alvo: {formatCurrency(metaAlvo)}
                </p>
              </div>
            </div>

            {/* OBS Críticas Automatizadas */}
            <div className="bg-[var(--color-accent-danger)]/5 border border-[var(--color-accent-danger)]/15 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-danger)] shadow-[0_0_10px_var(--color-accent-danger)]" />
              <label className="text-[11px] font-bold text-[var(--color-accent-danger)] uppercase tracking-widest flex items-center gap-2 mb-4">
                <AlertOctagon size={14} />
                Observações Críticas (Automático) — Casos sem OS vinculada
              </label>
              
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                {anomalies.length === 0 ? (
                  <div className="text-sm text-[var(--text-tertiary)] flex items-center gap-2 italic py-2">
                    <CheckCircle2 size={14} className="text-[var(--color-accent-teal)]" />
                    Nenhuma anomalia crítica detectada neste dia.
                  </div>
                ) : (
                  anomalies.map((anom) => (
                    <div key={anom.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg p-3 text-sm hover:border-[var(--color-accent-danger)]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={14} className="text-[var(--color-accent-danger)] flex-shrink-0" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {anom.title || 'Transação sem título'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
                          {anom.store_id}
                        </span>
                        <span className={`font-mono font-bold ${anom.type === 'in' ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                          {anom.type === 'in' ? '+' : '-'}{formatCurrency(anom.amount || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ação */}
            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={handleSave}
                className="gap-2 px-8 py-2.5 shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/40 transition-shadow text-sm tracking-wide font-semibold"
                disabled={saveSnapshot.isPending}
              >
                <Save size={18} />
                {isSaved ? '✓ Snapshot Salvo!' : 'Gravar Fechamento Diário'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
