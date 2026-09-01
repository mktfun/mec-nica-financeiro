import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Landmark, 
  CheckCircle2, 
  HelpCircle, 
  Link2, 
  FileEdit, 
  Unlink, 
  CreditCard, 
  QrCode, 
  DollarSign, 
  Info,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  Calendar,
  Lock
} from 'lucide-react';
import { 
  useTransactionsPorDataELoja, 
  useStoreDailyBills, 
  useHistoricalReconciledTransactions 
} from '@/hooks/useTransactions';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { useManualMatch } from '@/hooks/useManualMatch';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { ManualMatchOsModal } from './ManualMatchOsModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { matchExpenseWithOfxDebit } from '@/lib/expenseMatcher';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AmountCell } from '@/components/finance/AmountCell';

interface StoreExtratoBancarioViewProps {
  storeId: string;
  date: string;
}

type FilterType = 'all' | 'pending' | 'in' | 'out' | 'expenses' | 'rede' | 'os_pix' | 'locked_history';

export function StoreExtratoBancarioView({ storeId, date }: StoreExtratoBancarioViewProps) {
  const { data: allTransactions = [], isLoading: loadingTx } = useTransactionsPorDataELoja(date, storeId);
  const { data: dailyBills = [], isLoading: loadingBills } = useStoreDailyBills(date, storeId);
  const { data: historicalReconciled = [], isLoading: loadingHistory } = useHistoricalReconciledTransactions(storeId);
  const { categorize } = useCategorizeOrphan();
  const { unlinkTransaction } = useManualMatch();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorizingTx, setCategorizingTx] = useState<any | null>(null);
  const [matchingTx, setMatchingTx] = useState<any | null>(null);

  const isLoading = loadingTx || loadingBills || loadingHistory;

  // Formata data estritamente como DD/MM/AAAA (sem horário)
  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const clean = dateStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return clean;
    } catch {
      return dateStr || '';
    }
  };

  // Filtra transações originadas no OFX
  const ofxTransactions = useMemo(() => {
    return allTransactions.filter(t => t.source === 'ofx');
  }, [allTransactions]);

  const isRedeTx = (t: any) => {
    const title = `${t.title || ''} ${t.subtitle || ''} ${t.counterpart_name || ''} ${t.description || ''}`.toUpperCase();
    return (
      /\b(REDE|REDECARD|CIELO|GETNET|PAGSEGURO|STONE|BIN|SIPAG|VERO)\b/.test(title) ||
      /\b(CARTAO|CARTOES)\b.*\b(CREDITO|DEBITO)\b/.test(title) ||
      /\b(LIQ|LIQUIDACAO)\b.*\b(CARTAO|CARTOES|REDE|CIELO)\b/.test(title)
    );
  };

  // Mapeamento enriquecido com herança de conciliações e auto-match
  const enrichedTransactions = useMemo(() => {
    const historyMap = new Map<string, any>();
    historicalReconciled.forEach((h: any) => {
      if (h.fitid) historyMap.set(h.fitid, h);
      const compositeKey = `${h.amount}_${h.title || ''}`.toLowerCase();
      historyMap.set(compositeKey, h);
    });

    return ofxTransactions.map(tx => {
      const txOccurredDate = (tx.occurred_at || tx.date || tx.target_date || '').split('T')[0];
      const isDifferentDate = txOccurredDate !== '' && txOccurredDate !== date;

      const histByFitid = tx.fitid ? historyMap.get(tx.fitid) : null;
      const compositeKey = `${Math.abs(Number(tx.amount || 0))}_${tx.title || ''}`.toLowerCase();
      const histByComposite = historyMap.get(compositeKey);
      const historicalMatch = histByFitid || histByComposite;

      const hasPriorJustification = !!(
        tx.manual_category || 
        tx.os_number || 
        (tx as any).matched_os_number ||
        (historicalMatch && (historicalMatch.manual_category || historicalMatch.os_number || historicalMatch.matched_os_number))
      );

      // Só trava a edição de justificativa/vínculo se a transação for de um dia passado (ontem para trás) já conciliado
      // No dia de hoje (ou no dia selecionado), o usuário pode editar livremente!
      const isPastDate = txOccurredDate !== '' && txOccurredDate < date;
      const isLockedFromOtherDate = isPastDate && hasPriorJustification && (tx.target_date ? tx.target_date < date : true);
      const lockedReconciliationDate = historicalMatch?.target_date || tx.target_date || txOccurredDate;

      const effectiveOsNum = tx.os_number || (tx as any).matched_os_number || historicalMatch?.os_number || historicalMatch?.matched_os_number;
      const effectiveCategory = tx.manual_category || historicalMatch?.manual_category;
      const effectiveJustification = tx.manual_justification || historicalMatch?.manual_justification;

      const isRede = isRedeTx(tx);
      const osNum = effectiveOsNum;
      const hasCategory = !!effectiveCategory;

      // Fuzzy auto-match para saídas (débitos)
      const expenseMatch = tx.type === 'out' ? matchExpenseWithOfxDebit(tx, dailyBills) : { isMatched: false, confidence: 0 };
      const isMatchedExpense = expenseMatch.isMatched;

      const isPending = !isRede && !osNum && !hasCategory && !isMatchedExpense && !isLockedFromOtherDate;

      return {
        ...tx,
        isRede,
        osNum,
        hasCategory,
        manual_category: effectiveCategory,
        manual_justification: effectiveJustification,
        expenseMatch,
        isMatchedExpense,
        isLockedFromOtherDate,
        lockedReconciliationDate,
        isPending
      };
    });
  }, [ofxTransactions, dailyBills, historicalReconciled, date]);

  // Cálculos de Totais dos KPIs
  const totalEntradas = useMemo(() => {
    return enrichedTransactions
      .filter(t => t.type === 'in')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  }, [enrichedTransactions]);

  const totalSaidas = useMemo(() => {
    return enrichedTransactions
      .filter(t => t.type === 'out')
      .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);
  }, [enrichedTransactions]);

  const saldoLiquidoDia = totalEntradas - totalSaidas;

  const countEntradas = enrichedTransactions.filter(t => t.type === 'in').length;
  const countSaidas = enrichedTransactions.filter(t => t.type === 'out').length;
  const countPendentes = enrichedTransactions.filter(t => t.isPending).length;
  const countRede = enrichedTransactions.filter(t => t.isRede).length;
  const countOsPix = enrichedTransactions.filter(t => t.type === 'in' && t.osNum && !t.isLockedFromOtherDate).length;
  const countContasPagas = enrichedTransactions.filter(t => (t.isMatchedExpense || (t.type === 'out' && t.hasCategory)) && !t.isLockedFromOtherDate).length;
  const countLockedHistory = enrichedTransactions.filter(t => t.isLockedFromOtherDate).length;

  // Filtragem da tabela
  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter(tx => {
      if (filterType === 'pending' && !tx.isPending) return false;
      if (filterType === 'in' && tx.type !== 'in') return false;
      if (filterType === 'out' && tx.type !== 'out') return false;
      if (filterType === 'rede' && !tx.isRede) return false;
      if (filterType === 'os_pix' && (!tx.osNum || tx.type !== 'in')) return false;
      if (filterType === 'expenses' && (!tx.isMatchedExpense && !(tx.type === 'out' && tx.hasCategory))) return false;
      if (filterType === 'locked_history' && !tx.isLockedFromOtherDate) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchTarget = `${tx.title || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''} ${tx.cnpj_cpf || ''} ${tx.amount || ''} ${tx.osNum || ''} ${tx.manual_category || ''}`.toLowerCase();
        if (!searchTarget.includes(term)) return false;
      }

      return true;
    });
  }, [enrichedTransactions, filterType, searchTerm]);

  const handleUnlink = async (txId: string, osNumber: string) => {
    try {
      const res = await unlinkTransaction(txId, osNumber);
      if (res.success) {
        toast.success(`Vínculo com a OS #${osNumber} desfeito com sucesso!`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
          queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['justified_transactions'] })
        ]);
      } else {
        toast.error(`Falha ao desvincular: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao desvincular: ${err.message || err}`);
    }
  };

  const handleCategorizationSuccess = async () => {
    toast.success('Justificativa aplicada com sucesso!');
    setCategorizingTx(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] })
    ]);
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato bancário..." /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards Canônicos (border-l-4) — Padrão Pátio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Entradas */}
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Entradas OFX</p>
          <p className="font-display font-bold text-2xl text-emerald-400 font-mono">
            <AmountCell value={totalEntradas} tone="success" showPlusSign />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">{countEntradas} crédito(s) no extrato</span>
        </Card>

        {/* Card 2: Total Saídas */}
        <Card className="border-l-4 border-l-rose-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Saídas OFX</p>
          <p className="font-display font-bold text-2xl text-rose-400 font-mono">
            <AmountCell value={-totalSaidas} tone="danger" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">{countSaidas} débito(s) / pagamento(s)</span>
        </Card>

        {/* Card 3: Movimentação Líquida do Dia */}
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Movimentação Líquida</p>
          <p className="font-display font-bold text-2xl font-mono text-blue-400">
            <AmountCell value={saldoLiquidoDia} tone={saldoLiquidoDia >= 0 ? "brand" : "warning"} showPlusSign />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">Entradas - Saídas do período</span>
        </Card>

        {/* Card 4: Status de Pendências */}
        <Card className={`border-l-4 ${countPendentes > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Status da Conciliação</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display font-bold text-2xl font-mono">
              {countPendentes > 0 ? (
                <span className="text-amber-400">{countPendentes} Pendente(s)</span>
              ) : (
                <span className="text-emerald-400">100% Conciliado</span>
              )}
            </p>
            {countPendentes > 0 ? (
              <Badge variant="warning" dot className="text-[10px]">
                Pendências
              </Badge>
            ) : (
              <Badge variant="success" dot className="text-[10px]">
                Conciliado
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">
            {countPendentes > 0 ? 'Aguardando vínculo ou justificativa' : (countLockedHistory > 0 ? `${countLockedHistory} lançamento(s) travados` : 'Todos os lançamentos identificados')}
          </span>
        </Card>
      </div>

      {/* Barra de Filtros e Busca Nativa */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
        {/* Pills de Filtro */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilterType('all')}
            className={`text-xs h-7 px-2.5 font-medium ${filterType === 'all' ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            Todas ({enrichedTransactions.length})
          </Button>

          {countPendentes > 0 && (
            <Button
              size="sm"
              variant={filterType === 'pending' ? 'primary' : 'outline'}
              onClick={() => setFilterType('pending')}
              className={`text-xs h-7 px-2.5 font-medium ${filterType === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'}`}
            >
              ⚠️ Pendentes ({countPendentes})
            </Button>
          )}

          <Button
            size="sm"
            variant={filterType === 'in' ? 'primary' : 'outline'}
            onClick={() => setFilterType('in')}
            className={`text-xs h-7 px-2.5 font-medium ${filterType === 'in' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-zinc-800 text-zinc-400 hover:text-emerald-400'}`}
          >
            Entradas (+{countEntradas})
          </Button>

          <Button
            size="sm"
            variant={filterType === 'out' ? 'primary' : 'outline'}
            onClick={() => setFilterType('out')}
            className={`text-xs h-7 px-2.5 font-medium ${filterType === 'out' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'border-zinc-800 text-zinc-400 hover:text-rose-400'}`}
          >
            Saídas (-{countSaidas})
          </Button>

          {countContasPagas > 0 && (
            <Button
              size="sm"
              variant={filterType === 'expenses' ? 'primary' : 'outline'}
              onClick={() => setFilterType('expenses')}
              className={`text-xs h-7 px-2.5 font-medium ${filterType === 'expenses' ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'border-zinc-800 text-zinc-400 hover:text-teal-400'}`}
            >
              Contas Pagas ({countContasPagas})
            </Button>
          )}

          {countRede > 0 && (
            <Button
              size="sm"
              variant={filterType === 'rede' ? 'primary' : 'outline'}
              onClick={() => setFilterType('rede')}
              className={`text-xs h-7 px-2.5 font-medium ${filterType === 'rede' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'border-zinc-800 text-zinc-400 hover:text-blue-400'}`}
            >
              Rede / Cartão ({countRede})
            </Button>
          )}

          {countOsPix > 0 && (
            <Button
              size="sm"
              variant={filterType === 'os_pix' ? 'primary' : 'outline'}
              onClick={() => setFilterType('os_pix')}
              className={`text-xs h-7 px-2.5 font-medium ${filterType === 'os_pix' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'border-zinc-800 text-zinc-400 hover:text-purple-400'}`}
            >
              PIX OS ({countOsPix})
            </Button>
          )}

          {countLockedHistory > 0 && (
            <Button
              size="sm"
              variant={filterType === 'locked_history' ? 'primary' : 'outline'}
              onClick={() => setFilterType('locked_history')}
              className={`text-xs h-7 px-2.5 font-medium ${filterType === 'locked_history' ? 'bg-zinc-800 text-zinc-200 border-zinc-600' : 'border-zinc-800 text-zinc-400 hover:text-zinc-300'}`}
            >
              🔒 Outras Conciliações ({countLockedHistory})
            </Button>
          )}
        </div>

        {/* Campo de Busca por Texto */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, valor..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Tabela do Extrato Bancário */}
      <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-zinc-100">
              <Landmark size={18} className="text-emerald-400" />
              Extrato Bancário Completo da Filial
            </h3>
            <p className="text-xs text-zinc-400">
              Movimentação financeira da conta corrente: créditos recebidos, despesas conciliadas e histórico preservado de conciliações.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-zinc-700 text-zinc-300 h-6 px-2.5">
            {filteredTransactions.length} de {enrichedTransactions.length} Lançamentos
          </Badge>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono">
                  <th className="text-left py-2.5 px-3 font-medium">Data</th>
                  <th className="text-left py-2.5 px-3 font-medium">Descrição / Histórico Bancário</th>
                  <th className="text-left py-2.5 px-3 font-medium">Favorecido / Documento</th>
                  <th className="text-right py-2.5 px-3 font-medium">Valor</th>
                  <th className="text-center py-2.5 px-3 font-medium">Identificação / Status</th>
                  <th className="text-center py-2.5 px-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredTransactions.map((tx: any) => {
                  const isIn = tx.type === 'in';
                  const txDate = formatDateOnly(tx.occurred_at || tx.date || tx.target_date);
                  const matchedBill = tx.expenseMatch?.matchedBill;
                  const isLocked = tx.isLockedFromOtherDate;

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Data */}
                      <td className="py-2 px-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-zinc-500" />
                          <span>{txDate}</span>
                        </div>
                      </td>

                      {/* Descrição Bancária */}
                      <td className="py-2 px-3 font-medium text-zinc-200 max-w-[260px]">
                        <div className="flex flex-col">
                          <span className="truncate text-xs" title={tx.title || tx.subtitle}>
                            {tx.title || tx.subtitle || (isIn ? 'Crédito Bancário' : 'Débito Bancário')}
                          </span>
                          {tx.manual_justification && (
                            <span className="text-[10px] text-emerald-400 italic truncate">
                              "{tx.manual_justification}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Favorecido / Documento */}
                      <td className="py-2 px-3 text-zinc-400 font-mono text-[11px] max-w-[200px] truncate">
                        {tx.counterpart_name || tx.cnpj_cpf || tx.fitid || '—'}
                      </td>

                      {/* Valor */}
                      <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap text-xs ${isIn ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIn ? '+ ' : '- '} {formatCurrency(Math.abs(Number(tx.amount || 0)))}
                      </td>

                      {/* Identificação / Status (Compacto h-5) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isLocked ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] font-semibold" title={`Conciliado originalmente na data ${formatDateOnly(tx.lockedReconciliationDate)}`}>
                            <Lock size={10} className="mr-1 text-zinc-400" />
                            {tx.osNum ? `OS #${tx.osNum}` : (tx.manual_category ? `${String(tx.manual_category).replace('_', ' ')}` : 'Conciliado')}
                          </Badge>
                        ) : tx.isRede ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                            <CreditCard size={10} className="mr-1" />
                            Lote Rede (Ref: D-1)
                          </Badge>
                        ) : tx.osNum ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                            <QrCode size={10} className="mr-1" />
                            OS #{tx.osNum}
                          </Badge>
                        ) : tx.isMatchedExpense ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px] font-semibold" title={matchedBill?.description}>
                            <Receipt size={10} className="mr-1" />
                            Conta: {matchedBill?.recipient_name || matchedBill?.title || 'Despesa'}
                          </Badge>
                        ) : tx.hasCategory ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold">
                            <CheckCircle2 size={10} className="mr-1" />
                            {String(tx.manual_category).replace('_', ' ')}
                          </Badge>
                        ) : isIn ? (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                            <HelpCircle size={10} className="mr-1" />
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 py-0 px-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                            <HelpCircle size={10} className="mr-1" />
                            Débito Pendente
                          </Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isLocked ? (
                          <span className="text-[10px] text-zinc-500 font-mono flex items-center justify-center gap-1">
                            <Lock size={10} />
                            Somente Leitura
                          </span>
                        ) : !isIn ? (
                          // SAÍDAS (DÉBITOS): Habilita botão Justificar / Editar
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCategorizingTx(tx)}
                              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-zinc-200 gap-1"
                              title={tx.hasCategory ? 'Editar justificativa do débito' : 'Justificar débito bancário'}
                            >
                              <FileEdit size={11} />
                              {tx.hasCategory ? 'Editar' : 'Justificar'}
                            </Button>
                          </div>
                        ) : (
                          // ENTRADAS (CRÉDITOS):
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Botão Vincular OS (para entradas unitárias PIX/TED - bloqueado para lotes de Rede) */}
                            {!tx.isRede && !tx.osNum && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMatchingTx(tx)}
                                className="text-[10px] h-6 px-2 bg-zinc-900 border-zinc-700 text-blue-400 hover:bg-zinc-800 hover:text-blue-300 gap-1 font-medium"
                                title="Vincular a uma Ordem de Serviço"
                              >
                                <Link2 size={11} />
                                Vincular OS
                              </Button>
                            )}

                            {/* Botão Justificar (para qualquer entrada, inclusive crédito de Rede para tarifas/aluguel) */}
                            {!tx.osNum && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCategorizingTx(tx)}
                                className="text-[10px] h-6 px-2 text-zinc-400 hover:text-zinc-200 gap-1"
                                title={tx.hasCategory ? 'Editar justificativa' : 'Justificar lançamento / tarifa'}
                              >
                                <FileEdit size={11} />
                                {tx.hasCategory ? 'Editar' : 'Justificar'}
                              </Button>
                            )}

                            {/* Botão Desvincular OS */}
                            {tx.osNum && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUnlink(tx.id, tx.osNum)}
                                className="text-[10px] h-6 px-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 font-mono"
                                title="Desvincular OS"
                              >
                                <Unlink size={11} />
                                Desvincular
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Justificativa */}
      {categorizingTx && (
        <OrphanCategorizationModal
          transactionId={categorizingTx.id}
          transactionTitle={categorizingTx.title || categorizingTx.subtitle || categorizingTx.counterpart_name || 'Transação OFX'}
          transactionAmount={Number(categorizingTx.amount || 0)}
          transactionType={categorizingTx.type}
          storeId={storeId}
          targetDate={date}
          onClose={() => setCategorizingTx(null)}
          onSuccess={handleCategorizationSuccess}
          categorizeOrphan={(id, cat, just, impacts) => 
            categorize(id, cat, just, impacts, Number(categorizingTx.amount || 0), date, categorizingTx.type, storeId)
          }
        />
      )}

      {/* Modal de Vínculo com OS */}
      {matchingTx && (
        <ManualMatchOsModal
          isOpen={!!matchingTx}
          onClose={() => setMatchingTx(null)}
          transaction={matchingTx}
          storeId={storeId}
          targetDate={date}
        />
      )}
    </div>
  );
}
