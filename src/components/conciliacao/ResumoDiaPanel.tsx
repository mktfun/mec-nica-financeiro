import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';
import {
  AlertOctagon, Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight, Landmark, Wallet, Receipt, ShoppingBag
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
  const [manualDinheiroMpGlobal, setManualDinheiroMpGlobal] = useState<number | undefined>(undefined);

  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  const saveSnapshot = useSaveDailySnapshot();

  const storesWithManual = storesData.map(st => ({
    ...st,
    dinheiro_mp_manual: manualDinheiroMpGlobal !== undefined ? manualDinheiroMpGlobal : st.dinheiro_mp_manual
  }));

  const { globalCalculated } = calculateModulo1Saldo(storesWithManual);

  const handleSave = async () => {
    await saveSnapshot.mutateAsync({
      date: selectedDate,
      faturamento: globalCalculated.faturamento_g27,
      total_recebiveis: globalCalculated.a_receber_g15,
      total_patio: globalCalculated.na_loja_g16,
      saldo_bancario: globalCalculated.saldo_g13,
      notes: 'Fechamento salvo.',
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
          <div className={`p-3 rounded-full mt-1 ${
            statusSuccess 
              ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]' 
              : statusDanger 
              ? 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]' 
              : 'bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)]'
          }`}>
            {statusDanger ? <AlertOctagon size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-[var(--text-primary)] tracking-tight">Conciliação Diária</h1>
            <h2 className="text-sm font-medium mt-1">
              {statusSuccess ? 'Caixas Batidos com Sucesso' : statusDanger ? 'Divergência Encontrada no Dia' : 'Aguardando Fechamento'}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-md">
              {statusDanger 
                ? 'O Saldo Líquido do Sistema não confere com o Extrato Bancário.'
                : 'Saldos Bancários, Extrato OFX e Apuração de Saldo Livre Real Consolidado.'}
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

      {/* Grid das Métricas da Aba SALDO */}
      <div className="p-6 bg-[var(--bg-canvas)]">
        {/* 4 Pilares Iniciais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCO ITAÚ</span>
              <Landmark size={15} className="text-[var(--color-accent-light-blue)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-light-blue)]">
              <AnimatedNumber value={globalCalculated.saldo_g13} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX acumulado</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP</span>
              <Wallet size={15} className="text-[var(--color-accent-teal)]" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={manualDinheiroMpGlobal !== undefined ? manualDinheiroMpGlobal : (globalCalculated.dinheiro_mp_g14 || '')}
                onChange={(e) => setManualDinheiroMpGlobal(parseFloat(e.target.value) || 0)}
                className="w-full text-lg font-bold font-sans tabular-nums bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-[var(--color-accent-teal)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Lançado manual no sistema</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER</span>
              <Receipt size={15} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-primary)]">
              <AnimatedNumber value={globalCalculated.a_receber_g15} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Recebíveis pendentes</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">NA LOJA OS</span>
              <ShoppingBag size={15} className="text-[var(--color-accent-warning)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-warning)]">
              <AnimatedNumber value={globalCalculated.na_loja_g16} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes</span>
          </div>
        </div>

        {/* Totais de Fechamento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl font-sans tabular-nums text-xs">
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

          <div className="p-3 bg-[var(--color-accent-teal)]/10 rounded-xl border border-[var(--color-accent-teal)]/30">
            <span className="text-[10px] text-[var(--color-accent-teal)] uppercase block font-bold">RESULTADO FINAL</span>
            <span className="text-xl font-bold text-[var(--color-accent-teal)] mt-0.5 block">
              <AnimatedNumber value={globalCalculated.resultado_final_g31} format="currency" />
            </span>
            <span className="text-[10px] text-[var(--color-accent-teal)] opacity-80">Saldo Livre Real Consolidado</span>
          </div>
        </div>



        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4 mt-6">
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
