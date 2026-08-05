import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Link } from '@tanstack/react-router';
import {
  AlertOctagon, Save, AlertTriangle, CheckCircle2,
  CalendarDays, ChevronRight, Landmark, Wallet, Receipt, ShoppingBag
} from 'lucide-react';
import { useDailySnapshot, usePreviousDaySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { getDefaultDate } from '@/lib/utils';
import { calculateGlobalConciliacao, GlobalConciliacaoInput } from '@/lib/modulo1Calculations';
import { StoreSaldoState } from '@/lib/modulo1Calculations';
import { supabase } from '@/lib/supabase';

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
  storesData?: any[]; // We just need it to get faturamento_atual from index
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
  storesData = []
}: ResumoDiaPanelProps) {
  const [isSaved, setIsSaved] = useState(false);

  // Lê o snapshot do dia selecionado (que já contém os inputs manuais salvos via ImportWizard)
  const { data: currentSnapshot } = useDailySnapshot(selectedDate);
  // Lê o snapshot da conciliação imediatamente anterior
  const { data: previousSnapshot } = usePreviousDaySnapshot(selectedDate);
  const saveSnapshot = useSaveDailySnapshot();

  // Faturamento Atual global do sistema (acumulado do mês até hoje) lido das transações
  const faturamentoAtualGlobal = storesData.reduce((acc, st) => acc + (st.faturamento_atual || 0), 0);

  // Faturamento Anterior é o Faturamento Acumulado salvo no último fechamento (previousSnapshot)
  const faturamentoAnteriorGlobal = previousSnapshot?.faturamento || 0;

  // Caixa Anterior salvo no último fechamento
  const caixaAnteriorGlobal = previousSnapshot?.caixa_atual || 0;

  // Calcular pix_os cruzado (quantos PIX foram declarados de OS e encontrados no banco)
  let totalPixOs = 0;
  if (storesData) {
    storesData.forEach(st => {
      totalPixOs += (st.pix_os || 0);
    });
  }

  // Automáticos via OFX
  const faturamentoOutrosAutomatico = Math.max(0, totalOfxIn - totalPixOs);
  const contasAPagarAutomatico = totalOfxOut;

  // Sum na_loja_os directly from storesData to avoid loop with 0 value
  const dynamicGlobalNaLojaOs = storesData ? Object.values(storesData).reduce((acc: number, s: any) => acc + (s.na_loja_os || 0), 0) : 0;

  const inputForCalculation: GlobalConciliacaoInput = {
    saldo_bancario: currentSnapshot?.saldo_bancario || totalBancarioIn, // Se já salvou usa o salvo, senão a soma das entradas (in) do OFX
    dinheiro_mp: currentSnapshot?.dinheiro_mp || 0,
    a_receber_manual: currentSnapshot?.a_receber_manual || 0,
    na_loja_os: dynamicGlobalNaLojaOs,
    saldo_negativo_itau: currentSnapshot?.saldo_negativo_itau || 0,
    caixa_anterior: caixaAnteriorGlobal,
    faturamento_atual: faturamentoAtualGlobal,
    faturamento_anterior: faturamentoAnteriorGlobal,
    faturamento_outros: faturamentoOutrosAutomatico,
    juros_rede: currentSnapshot?.juros_rede || 0,
    contas_a_pagar: contasAPagarAutomatico,
    provisao: 0,
  };

  const calculated = calculateGlobalConciliacao(inputForCalculation);

  const handleSave = async () => {
    // Gravar na_loja_os no histórico de cada loja individualmente
    if (storesData) {
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
        caixa_atual: calculated.caixa_atual,
        // Faturamento salvo deve ser o ATUAL acumulado, para que o dia seguinte use como `faturamento_anterior`
        faturamento: faturamentoAtualGlobal,
        total_recebiveis: calculated.a_receber,
        total_patio: calculated.na_loja,
        saldo_bancario: calculated.saldo,
        faturamento_outros_valor: faturamentoOutrosAutomatico,
        contas_a_pagar: contasAPagarAutomatico,
        provisao: 0,
        notes: 'Fechamento salvo com base nos valores lidos da importação automática de OFX.',
      });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const statusSuccess = isApproved && divergenciaGlobal === 0 && detalhesCount > 0;
  const statusDanger = divergenciaGlobal !== 0;

  const diferencaAbs = Math.abs(calculated.diferenca);
  const isDiferencaOk = calculated.diferenca >= -50 && calculated.diferenca <= 50;

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
              Dados globais da operação lidos do arquivo e dos inputs da importação (Somente Leitura).
            </p>
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
              disabled={selectedDate === new Date().toISOString().substring(0, 10)}
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

      {/* Grid das Métricas - Apenas Leitura */}
      <div className="p-6 bg-[var(--bg-canvas)]">
        
        {/* 4 Pilares Iniciais (Intocados Visualmente, mas Read-Only) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCO ITAÚ</span>
              <Landmark size={15} className="text-[var(--color-accent-light-blue)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-light-blue)]">
              <AnimatedNumber value={calculated.saldo} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX global</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP</span>
              <Wallet size={15} className="text-[var(--color-accent-teal)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-teal)]">
              <AnimatedNumber value={calculated.dinheiro_mp} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Preenchido na importação</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER</span>
              <Receipt size={15} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-primary)]">
              <AnimatedNumber value={calculated.a_receber} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">Boletos/Descontos manuais</span>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">NA LOJA OS</span>
              <ShoppingBag size={15} className="text-[var(--color-accent-warning)]" />
            </div>
            <p className="text-xl font-bold font-sans tabular-nums text-[var(--color-accent-warning)]">
              <AnimatedNumber value={calculated.na_loja} format="currency" />
            </p>
            <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes</span>
          </div>
        </div>

        {/* Dashboard de Consolidação & Diferença */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Card Grandão - Consolidação */}
          <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 uppercase text-xs tracking-wider">Consolidação do Dia</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Caixa Atual</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  <AnimatedNumber value={calculated.caixa_atual} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Descontado saldo negativo (Itaú)</span>
              </div>
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Fluxo de Caixa</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  <AnimatedNumber value={calculated.fluxo_cx} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Caixa atual vs Conciliação Anterior</span>
              </div>
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Faturamento Líquido</span>
                <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
                  <AnimatedNumber value={calculated.faturamento} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Diferença mês + Outros Faturamentos</span>
              </div>
              <div className="bg-[var(--bg-canvas)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Valor Disp. Contas</span>
                <span className="text-lg font-bold text-[var(--color-primary-bright)] mt-1 block">
                  <AnimatedNumber value={calculated.valor_disp_contas} format="currency" />
                </span>
                <span className="text-[9px] text-[var(--text-tertiary)]">Faturamento + Fluxo de Caixa</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-surface-elevated)] p-3 rounded-lg">
               <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">Subtotal: Valor Contas</span>
                  <span className="text-[9px] text-[var(--text-tertiary)]">Juros (REDE) + Pagar + Provisão</span>
               </div>
               <span className="text-lg font-bold text-[var(--color-accent-warning)]">
                 <AnimatedNumber value={calculated.valor_contas} format="currency" />
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
               <AnimatedNumber value={calculated.diferenca} format="currency" />
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

        <div className="flex justify-end border-t border-[var(--border-subtle)] pt-4 mt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saveSnapshot.isPending || !currentSnapshot}
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
