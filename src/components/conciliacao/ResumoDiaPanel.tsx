import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';
import {
  AlertOctagon,
  Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight
} from 'lucide-react';
import { useDailySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { useRecebiveis } from '@/hooks/useRecebiveis';
import { usePatioOS } from '@/hooks/usePatio';
import { useMonthlyGoal } from '@/hooks/useGoals';
import { supabase } from '@/lib/supabase';
import { TransactionRow } from '@/lib/supabase';
import { formatCurrency, getDefaultDate } from '@/lib/utils';

interface ResumoDiaPanelProps {
  selectedDate: string;
  onDayChange: (offset: number) => void;
  onDateSelect: (date: string) => void;
  divergenciaGlobal: number;
  isApproved: boolean;
  detalhesCount: number;
  totalSistema: number;
  totalBancario: number;
}

function CleanMetric({ label, value, isCurrency = true, subtext }: { label: string, value: number, isCurrency?: boolean, subtext?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-semibold">{label}</span>
      <span className="font-display font-bold text-xl text-[var(--text-primary)]">
        {isCurrency ? <AnimatedNumber value={value} format="currency" /> : value}
      </span>
      {subtext && <span className="text-[10px] text-[var(--text-tertiary)]">{subtext}</span>}
    </div>
  );
}

export function ResumoDiaPanel({
  selectedDate,
  onDayChange,
  onDateSelect,
  divergenciaGlobal,
  isApproved,
  detalhesCount,
  totalSistema,
  totalBancario
}: ResumoDiaPanelProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [anomalies, setAnomalies] = useState<TransactionRow[]>([]);
  const [ofxIncome, setOfxIncome] = useState(0);

  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  const { data: recebiveis = [] } = useRecebiveis();
  const { data: patioData = [] } = usePatioOS();
  const { data: monthlyGoal } = useMonthlyGoal('GLOBAL');
  const saveSnapshot = useSaveDailySnapshot();

  useEffect(() => {
    const fetchData = async () => {
      // Busca anomalias (transações sem OS)
      const { data: anomData } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', selectedDate)
        .neq('source', 'ofx')
        .is('os_number', null);

      if (anomData) setAnomalies(anomData as TransactionRow[]);

      // Busca receitas OFX do dia (apenas entradas)
      const { data: ofxData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('target_date', selectedDate)
        .eq('source', 'ofx')
        .eq('type', 'in');

      if (ofxData) {
        setOfxIncome(ofxData.reduce((acc, t) => acc + Number(t.amount || 0), 0));
      }
    };
    fetchData();
  }, [selectedDate]);

  const totalRecebiveis = recebiveis
    .filter((r) => r.status === 'pendente')
    .reduce((acc, r) => acc + Number(r.value), 0);

  const totalPatio = patioData
    .filter((os) => os.status === 'em_aberto' || os.status === 'pago_parcial')
    .reduce((acc, os) => acc + (Number(os.total_value) - Number(os.paid_value)), 0);

  const faturamentoAtual = currentSnapshot?.faturamento ?? 0;
  const metaAtual = monthlyGoal?.current_amount ?? 0;
  const metaAlvo = monthlyGoal?.target_amount ?? 0;
  const progressoMeta = metaAlvo > 0 ? (metaAtual / metaAlvo) * 100 : 0;

  const handleSave = async () => {
    const notesStr = anomalies.length > 0 
      ? `Anomalias Automáticas: ${anomalies.map(a => `${a.title} (${a.amount})`).join(', ')}`
      : 'Sem observações.';

    await saveSnapshot.mutateAsync({
      date: selectedDate,
      faturamento: faturamentoAtual,
      total_recebiveis: totalRecebiveis,
      total_patio: totalPatio,
      saldo_bancario: totalBancario,
      notes: notesStr,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const statusSuccess = isApproved && divergenciaGlobal === 0 && detalhesCount > 0;
  const statusDanger = divergenciaGlobal !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border backdrop-blur-3xl shadow-sm transition-colors duration-500 overflow-hidden ${
        statusSuccess
          ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/20'
          : statusDanger
          ? 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/20'
          : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]'
      }`}
    >
      {/* Top Header Section */}
      <div className="p-6 border-b border-[var(--border-subtle)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        
        {/* Title & Status */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full mt-1 ${statusSuccess ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]' : statusDanger ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)]'}`}>
            {statusSuccess ? <CheckCircle2 size={24} /> : statusDanger ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] tracking-tight">Conciliação Diária</h1>
            <h2 className="text-sm font-medium mt-1">
              {statusSuccess ? 'Caixas Batidos com Sucesso' : statusDanger ? 'Divergência Encontrada no Dia' : 'Aguardando Fechamento'}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-md">
              {statusDanger 
                ? 'O Saldo Líquido do Sistema não confere com o Extrato Bancário.'
                : 'Todos os valores declarados e importados batem com as transações registradas.'}
            </p>
            {statusDanger && (
              <div className="mt-2">
                <Link to="/alertas" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent-danger)] hover:text-white bg-[var(--color-accent-danger)]/10 hover:bg-[var(--color-accent-danger)]/30 px-3 py-1.5 rounded-full transition-colors border border-[var(--color-accent-danger)]/20">
                  <AlertTriangle size={14} /> Ver Detalhes em Alertas
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Date & Core Totals */}
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-1 bg-[var(--bg-canvas)] rounded-lg p-1 border border-[var(--border-subtle)]">
            <button onClick={() => onDayChange(-1)} className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)]">
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <CalendarDays size={14} className="text-[var(--text-tertiary)]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateSelect(e.target.value)}
                className="bg-transparent text-sm font-medium text-[var(--text-secondary)] focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-80 hover:opacity-100"
              />
            </div>
            <button 
              onClick={() => onDayChange(1)} 
              disabled={selectedDate === getDefaultDate()}
              className="p-2 hover:bg-[var(--bg-surface-hover)] rounded-md text-[var(--text-secondary)] disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-6 text-right">
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Apurado Sistema (Fechamento do Dia)</p>
              <p className="text-xl font-display font-bold text-[var(--text-primary)]"><AnimatedNumber value={totalSistema} format="currency" /></p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-primary)] uppercase tracking-wider mb-1">Extrato Bancário (Fechamento do Dia)</p>
              <p className="text-xl font-display font-bold text-[var(--color-primary)]"><AnimatedNumber value={totalBancario} format="currency" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Details Section (Clean Design) */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4 mb-6">
          <CleanMetric label="Saldo OFX Total" value={totalBancario} subtext="Líquido OFX do dia" />
          <CleanMetric label="Faturamento Sistema" value={totalSistema} subtext="OSs importadas do dia" />
          <CleanMetric label="Pátio em Aberto" value={totalPatio} subtext="OSs não pagas" />
          <CleanMetric label="A Receber" value={totalRecebiveis} subtext="Recebíveis pendentes" />
          <CleanMetric label="Receita OFX" value={ofxIncome} subtext="Entradas bancárias" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-semibold">Progresso da Meta</span>
            <span className="font-display font-bold text-xl text-[var(--text-primary)]">
              {progressoMeta.toFixed(1)}%
            </span>
            <div className="w-full bg-[var(--bg-canvas)] h-1.5 rounded-full mt-1 overflow-hidden border border-[var(--border-subtle)]">
              <div className="h-full bg-[var(--color-primary)] transition-all duration-1000" style={{ width: `${Math.min(progressoMeta, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Anomalies (Only show if exist) */}
        {anomalies.length > 0 && (
          <div className="mb-6 bg-[var(--color-accent-danger)]/5 border border-[var(--color-accent-danger)]/15 rounded-lg p-4">
            <label className="text-[11px] font-bold text-[var(--color-accent-danger)] uppercase tracking-widest flex items-center gap-2 mb-3">
              <AlertOctagon size={14} /> Observações Críticas (Sem OS)
            </label>
            <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
              {anomalies.map((anom) => (
                <div key={anom.id} className="flex items-center justify-between bg-[var(--bg-canvas)] rounded p-2 text-sm border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[var(--color-accent-danger)]" />
                    <span className="text-[var(--text-secondary)] font-medium text-xs">{anom.title || 'Transação'}</span>
                  </div>
                  <span className={`font-mono text-xs font-bold ${anom.type === 'in' ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                    {anom.type === 'in' ? '+' : '-'}{formatCurrency(anom.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saveSnapshot.isPending}
            className="gap-2 px-6 py-2 text-sm"
          >
            <Save size={16} />
            {isSaved ? 'Salvo!' : 'Gravar Fechamento Diário'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
