import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import {
  TrendingUp, TrendingDown, Wallet, Car, ReceiptText,
  Banknote, ArrowRightLeft, Target, Percent, AlertOctagon,
  Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { useDailySnapshot, usePreviousDaySnapshot, useSaveDailySnapshot } from '@/hooks/useDailySnapshot';
import { useRecebiveis } from '@/hooks/useRecebiveis';
import { usePatioOS } from '@/hooks/usePatio';
import { useDailyBankBalance } from '@/hooks/useTransactions';

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
    green: 'text-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/20',
    red: 'text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/20',
    blue: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20',
    yellow: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} flex flex-col gap-1 backdrop-blur-sm`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-70">
        <Icon size={13} />
        {label}
      </div>
      <div className="font-display font-bold text-xl">
        {isCurrency ? <AnimatedNumber value={value} format="currency" /> : value}
      </div>
      {description && (
        <p className="text-[10px] opacity-50 leading-tight">{description}</p>
      )}
    </div>
  );
}

export function ResumoDiaPanel({ date }: ResumoDiaPanelProps) {
  const [dinheiroMp, setDinheiroMp] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const { data: currentSnapshot } = useDailySnapshot(date);
  const { data: previousSnapshot } = usePreviousDaySnapshot(date);
  const { data: recebiveis = [] } = useRecebiveis();
  const { data: patioData = [] } = usePatioOS();
  const { data: bankBalances } = useDailyBankBalance(date);
  const saveSnapshot = useSaveDailySnapshot();

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

  const saldoNegativo = Math.min(saldoBancario, 0); // negativos bancários
  const caixaAtual =
    saldoBancario + totalRecebiveis + dinheiroMp - Math.abs(saldoNegativo < 0 ? saldoNegativo : 0);

  const caixaAnterior = previousSnapshot?.caixa_atual ?? 0;
  const fluxoCaixa = caixaAtual - caixaAnterior;

  const faturamentoAtual = currentSnapshot?.faturamento ?? 0;
  const faturamentoAnterior = previousSnapshot?.faturamento ?? 0;

  const jurosRede = 0; // virá do bot quando integrado

  const valorDisponivelContas =
    fluxoCaixa >= 0
      ? faturamentoAtual + fluxoCaixa
      : faturamentoAtual - Math.abs(fluxoCaixa);

  const handleSave = async () => {
    await saveSnapshot.mutateAsync({
      date,
      caixa_atual: caixaAtual,
      faturamento: faturamentoAtual,
      dinheiro_mp: dinheiroMp,
      total_recebiveis: totalRecebiveis,
      total_patio: totalPatio,
      saldo_bancario: saldoBancario,
      notes,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-b from-[var(--bg-surface-elevated)] to-[var(--bg-canvas)] border border-white/10 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Header colapsável */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/15 flex items-center justify-center">
            <Target size={17} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-left">
            <h2 className="font-display font-bold text-lg text-white">Resumo do Dia</h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Caixa · Fluxo · Faturamento · Juros
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-display font-semibold ${fluxoCaixa >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}
          >
            <AnimatedNumber value={caixaAtual} format="currency" />
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-white/5 pt-4">
          {/* Grid de Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Saldo Bancário"
              value={saldoBancario}
              icon={Wallet}
              color={saldoBancario >= 0 ? 'blue' : 'red'}
              description="Extrato de todas as lojas"
            />
            <SummaryCard
              label="Dinheiro MP"
              value={dinheiroMp}
              icon={Banknote}
              color="yellow"
              description="Dinheiro físico com Daniel"
            />
            <SummaryCard
              label="A Receber"
              value={totalRecebiveis}
              icon={ReceiptText}
              color="blue"
              description="Boletos e pendências"
            />
            <SummaryCard
              label="Pátio (Recebíveis)"
              value={totalPatio}
              icon={Car}
              color="yellow"
              description="Carros abertos e parcelados"
            />
          </div>

          {/* Dinheiro MP — input manual */}
          <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-4">
            <label className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Banknote size={12} />
              Dinheiro físico com Daniel (R$) — editar manualmente
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={dinheiroMp}
              onChange={(e) => setDinheiroMp(Number(e.target.value))}
              className="w-full bg-black/30 border border-amber-400/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400/50 transition-colors"
              placeholder="0,00"
            />
          </div>

          {/* Separador: Caixa e Fluxo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent border border-[var(--color-primary)]/20 rounded-xl p-4">
              <p className="text-xs text-[var(--color-primary)] uppercase tracking-wider font-medium mb-1 flex items-center gap-1.5">
                <Wallet size={12} /> Caixa Atual
              </p>
              <p className="font-display font-bold text-2xl text-white">
                <AnimatedNumber value={caixaAtual} format="currency" />
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Bancário + Recebíveis + Dinheiro MP
              </p>
            </div>

            <div
              className={`rounded-xl p-4 border ${
                fluxoCaixa >= 0
                  ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/20'
                  : 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/20'
              }`}
            >
              <p
                className={`text-xs uppercase tracking-wider font-medium mb-1 flex items-center gap-1.5 ${
                  fluxoCaixa >= 0
                    ? 'text-[var(--color-accent-teal)]'
                    : 'text-[var(--color-accent-danger)]'
                }`}
              >
                {fluxoCaixa >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                Fluxo de Caixa
              </p>
              <p
                className={`font-display font-bold text-2xl ${
                  fluxoCaixa >= 0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                }`}
              >
                {fluxoCaixa >= 0 ? '+' : ''}
                <AnimatedNumber value={fluxoCaixa} format="currency" />
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Atual (
                <AnimatedNumber value={caixaAtual} format="currency" />) − Anterior (
                <AnimatedNumber value={caixaAnterior} format="currency" />)
              </p>
            </div>
          </div>

          {/* Faturamento + Juros */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard
              label="Faturamento Atual"
              value={faturamentoAtual}
              icon={Target}
              color="green"
              description="Mapa de Metas OI hoje"
            />
            <SummaryCard
              label="Faturamento Anterior"
              value={faturamentoAnterior}
              icon={Target}
              color="default"
              description="Última conciliação fechada"
            />
            <SummaryCard
              label="Juros da Rede"
              value={jurosRede}
              icon={Percent}
              color="yellow"
              description="Exportado do portal Rede"
            />
          </div>

          {/* Disponível p/ Contas */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft size={18} className="text-[var(--color-primary)]" />
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
                  Disponível para Pagamento de Contas
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                  Faturamento {fluxoCaixa >= 0 ? '+' : '−'} Fluxo de Caixa
                </p>
              </div>
            </div>
            <p className="font-display font-bold text-xl text-white">
              <AnimatedNumber value={valorDisponivelContas} format="currency" />
            </p>
          </div>

          {/* OBS Críticas */}
          <div className="bg-[var(--color-accent-danger)]/5 border border-[var(--color-accent-danger)]/15 rounded-xl p-4">
            <label className="text-xs font-medium text-[var(--color-accent-danger)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <AlertOctagon size={12} />
              Observações Críticas (Passo 7) — Casos sem OS vinculada
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-black/30 border border-[var(--color-accent-danger)]/20 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-accent-danger)]/50 transition-colors resize-none font-mono"
              placeholder="Ex: Pix de R$165 de óleo usado sem OS vinculada (Jabaquara). Aporte de sócio de R$60k (Jorge Beretta) — contabilizar com OBS..."
            />
          </div>

          {/* Ação */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSave}
              className="gap-2"
              disabled={saveSnapshot.isPending}
            >
              <Save size={15} />
              {isSaved ? '✓ Snapshot Salvo!' : 'Salvar Snapshot do Dia'}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
