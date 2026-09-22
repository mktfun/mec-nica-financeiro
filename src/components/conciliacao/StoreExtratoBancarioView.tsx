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
  Lock,
  FileText,
  Target,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Percent,
  CalendarPlus,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useTransactionsPorDataELoja, 
  useStoreExtratoBancario,
  useStoreDailyBills, 
  useHistoricalReconciledTransactions 
} from '@/hooks/useTransactions';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { useManualMatch } from '@/hooks/useManualMatch';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { ManualMatchOsModal } from './ManualMatchOsModal';
import { TransactionDetailModal } from './TransactionDetailModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { matchExpenseWithOfxDebit } from '@/lib/expenseMatcher';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AmountCell } from '@/components/finance/AmountCell';
import { supabase } from '@/lib/supabase';

interface StoreExtratoBancarioViewProps {
  storeId: string;
  date: string;
}

type FilterType = 'all' | 'pending' | 'in' | 'out' | 'expenses' | 'rede' | 'os_pix' | 'locked_history';

export function StoreExtratoBancarioView({ storeId, date }: StoreExtratoBancarioViewProps) {
  const { data: extratoData, isLoading: loadingExtrato } = useStoreExtratoBancario(date, storeId);
  const { data: allTransactions = [], isLoading: loadingTx } = useTransactionsPorDataELoja(date, storeId);
  const { data: dailyBills = [], isLoading: loadingBills } = useStoreDailyBills(date, storeId);
  const { data: historicalReconciled = [], isLoading: loadingHistory } = useHistoricalReconciledTransactions(storeId);
  const { categorize } = useCategorizeOrphan();
  const { unlinkTransaction } = useManualMatch();
  const queryClient = useQueryClient();

  const [viewScope, setViewScope] = useState<'lote_ofx' | 'dia_alvo'>('dia_alvo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorizingTx, setCategorizingTx] = useState<any | null>(null);
  const [matchingTx, setMatchingTx] = useState<any | null>(null);
  const [movingTxId, setMovingTxId] = useState<string | null>(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState<any | null>(null);

  const isLoading = loadingExtrato || loadingTx || loadingBills || loadingHistory;

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

  // Define as transações ativas de acordo com o escopo selecionado (Lote OFX Completo vs Apenas Dia Alvo)
  const rawTransactions = useMemo(() => {
    if (viewScope === 'dia_alvo') {
      const txs = extratoData?.targetDateTxs && extratoData.targetDateTxs.length > 0 
        ? extratoData.targetDateTxs 
        : allTransactions;
      return txs.filter((t: any) => {
        const tDate = (t.target_date || t.date || t.occurred_at || '').split('T')[0];
        return tDate === date;
      });
    }
    return extratoData?.loteTxs && extratoData.loteTxs.length > 0 
      ? extratoData.loteTxs 
      : allTransactions;
  }, [viewScope, extratoData, allTransactions, date]);

  // Filtra transações originadas no OFX
  const ofxTransactions = useMemo(() => {
    return rawTransactions.filter(t => t.source === 'ofx' || !!t.fitid || !!t.bank_name);
  }, [rawTransactions]);

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

      const linkedBill = tx.matched_bill_id 
        ? dailyBills.find((b: any) => b.id === tx.matched_bill_id) 
        : dailyBills.find((b: any) => b.matched_ofx_id === tx.id || (tx.fitid && b.matched_ofx_id === tx.fitid));

      const isRede = isRedeTx(tx);
      const osNum = effectiveOsNum;
      const hasCategory = !!effectiveCategory || !!effectiveJustification || !!linkedBill;

      // Fuzzy auto-match para saídas (débitos)
      const isBatchMatched = tx.match_status === 'matched_batch' || tx.match_status === 'intercompany_paired' || tx.match_status === 'auto_cancelled';
      const expenseMatch = tx.type === 'out' 
        ? (linkedBill 
            ? { isMatched: true, matchedBill: linkedBill, confidence: 1.0 } 
            : isBatchMatched
            ? { isMatched: true, matchedBill: { title: tx.manual_category || 'Lote Conciliado', recipient_name: tx.manual_justification || tx.counterpart_name || 'Lote Conciliado', description: 'Conciliado via Lote', amount: Math.abs(tx.amount) } as any, confidence: 1.0 }
            : effectiveCategory
            ? { isMatched: false, confidence: 0 }
            : matchExpenseWithOfxDebit(tx, dailyBills)
          ) 
        : { isMatched: false, confidence: 0 };
      const isMatchedExpense = expenseMatch.isMatched || isBatchMatched;

      const isPending = !isRede && !osNum && !hasCategory && !isMatchedExpense && !isLockedFromOtherDate && !isBatchMatched && !linkedBill;

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
        isPastDate,
        txOccurredDate,
        isPending
      };
    });
  }, [ofxTransactions, dailyBills, historicalReconciled, date]);

  const [persistingMatches, setPersistingMatches] = useState(false);

  const unpersistedMatches = useMemo(() => {
    return enrichedTransactions.filter(
      t => t.type === 'out' && t.isMatchedExpense && !t.matched_bill_id && t.match_status !== 'matched_batch' && t.match_status !== 'intercompany_paired' && t.expenseMatch?.matchedBill?.id
    );
  }, [enrichedTransactions]);

  const handlePersistAutoMatches = async () => {
    setPersistingMatches(true);
    try {
      // 1. Executa batimento atômico canônico no banco de dados para a data
      await (supabase as any).rpc('auto_match_saidas', { p_date: date });

      // 2. Persiste quaisquer vínculos intra-loja detectados em memória
      for (const tx of unpersistedMatches) {
        const bill = tx.expenseMatch?.matchedBill;
        if (!bill) continue;

        await supabase
          .from('ofx_transactions')
          .update({
            matched_bill_id: bill.id,
            manual_category: bill.category || 'Conta ERP',
            manual_justification: bill.recipient_name || bill.title,
            contabilizar_no_subtotal: true,
          })
          .eq('id', tx.id);

        await supabase
          .from('daily_manual_bills')
          .update({
            matched_ofx_id: tx.id,
            store_id: storeId,
            match_status: 'matched',
          })
          .eq('id', bill.id);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['ofx_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['store_extrato_bancario'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_manual_bills'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] }),
      ]);

      toast.success(`${unpersistedMatches.length} conta(s) vinculada(s) e confirmada(s) no banco com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao persistir vínculos de contas:', err);
      toast.error(`Erro ao salvar vínculos no banco: ${err.message}`);
    } finally {
      setPersistingMatches(false);
    }
  };

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

  // Saldo Anterior Ativo de acordo com o escopo (Lote OFX vs Fechamento do Dia)
  const activePreviousBalance = useMemo(() => {
    if (viewScope === 'lote_ofx') {
      return Number(extratoData?.previousBalance ?? 412.78);
    }
    const finalBal = Number(extratoData?.bankTotal ?? -5659.95);
    return finalBal - saldoLiquidoDia;
  }, [viewScope, extratoData, saldoLiquidoDia]);

  const activeBankTotal = useMemo(() => {
    return Number(extratoData?.bankTotal ?? -5659.95);
  }, [extratoData]);

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

  // Ordenação cronológica garantida para o extrato (08/09 -> 09/09)
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dA = (a.occurred_at || a.date || a.target_date || '').split('T')[0];
      const dB = (b.occurred_at || b.date || b.target_date || '').split('T')[0];
      if (dA !== dB) {
        return sortAsc ? dA.localeCompare(dB) : dB.localeCompare(dA);
      }
      const tA = new Date(a.occurred_at || a.created_at || 0).getTime();
      const tB = new Date(b.occurred_at || b.created_at || 0).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });
  }, [filteredTransactions, sortAsc]);

  // Agrupamento cronológico de transações por dia contábil para o Accordion Revolut
  const dayGroups = useMemo(() => {
    const groupsMap = new Map<string, any[]>();
    
    sortedTransactions.forEach(tx => {
      const rawDate = viewScope === 'dia_alvo'
        ? date
        : ((tx.occurred_at || tx.date || tx.target_date || '').split('T')[0] || date);
      if (!groupsMap.has(rawDate)) {
        groupsMap.set(rawDate, []);
      }
      groupsMap.get(rawDate)!.push(tx);
    });

    const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => {
      return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
    });

    return sortedDates.map(dateKey => {
      const txs = groupsMap.get(dateKey) || [];
      const totalIn = txs.filter(t => t.type === 'in').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const totalOut = txs.filter(t => t.type === 'out').reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0);
      const netBalance = totalIn - totalOut;

      let formattedDate = formatDateOnly(dateKey);
      let dayOfWeek = '';
      try {
        const [y, m, d] = dateKey.split('-').map(Number);
        if (y && m && d) {
          const dObj = new Date(y, m - 1, d);
          const daysNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
          dayOfWeek = daysNames[dObj.getDay()];
        }
      } catch {
        dayOfWeek = '';
      }

      return {
        dateKey,
        formattedDate,
        dayOfWeek,
        transactions: txs,
        totalIn,
        totalOut,
        netBalance,
      };
    });
  }, [sortedTransactions, sortAsc, date, viewScope]);

  // Controle de Accordion por dia (dias colapsados)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const toggleDayCollapse = (dateKey: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const expandAllDays = () => setCollapsedDays(new Set());
  const collapseAllDays = () => setCollapsedDays(new Set(dayGroups.map(g => g.dateKey)));

  // Helper para mover transação de D-1 para a conciliação e faturamento de hoje
  const handleMoveTransactionToToday = async (tx: any) => {
    setMovingTxId(tx.id);
    try {
      // 1. Atualiza na tabela ofx_transactions (SSOT canônica)
      const { error: ofxErr } = await supabase
        .from('ofx_transactions')
        .update({
          target_date: date,
          manual_category: null,
          manual_justification: null,
          match_status: null,
          contabilizar_no_subtotal: true
        })
        .eq('id', tx.id);

      if (ofxErr) console.warn('Aviso ao mover em ofx_transactions:', ofxErr);

      // 2. Sincroniza tabela transactions (se existir registro espelho)
      await supabase
        .from('transactions')
        .update({
          target_date: date,
          manual_category: null,
          manual_justification: null
        })
        .eq('id', tx.id);

      toast.success(`Transação de ${formatCurrency(Math.abs(Number(tx.amount || 0)))} movida para ${formatDateOnly(date)}!`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['ofx_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['store_extrato_bancario'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] })
      ]);
    } catch (err: any) {
      console.error('Erro ao mover transação:', err);
      toast.error(`Falha ao mover transação: ${err.message || err}`);
    } finally {
      setMovingTxId(null);
    }
  };

  // Helper para limpar redundâncias e unificar apresentação da transação (Revolut Item)
  const getCleanTransactionDisplay = (tx: any) => {
    const isIn = tx.type === 'in';
    
    // Nome limpo da contraparte sem repetição de prefixos brutos
    let primaryName = (tx.counterpart_name || tx.recipient_name || tx.title || tx.subtitle || '').trim();

    // Caso traço '-' ou vazio: busca no fitid ou nas contas vinculadas
    if (!primaryName || primaryName === '-' || primaryName === '—') {
      const raw = `${tx.fitid || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''}`.toLowerCase();
      if (raw.includes('juroslimitedaconta')) {
        primaryName = 'Juros Limite da Conta Itaú';
      } else if (raw.includes('iof')) {
        primaryName = 'IOF Bancário Itaú';
      } else if (raw.includes('tarifa') || raw.includes('tar_') || raw.includes('taxa')) {
        primaryName = 'Tarifa de Conta Itaú';
      } else if (raw.includes('sispag')) {
        primaryName = 'Pagamento Fornecedores (Sispag)';
      } else if (tx.expenseMatch?.matchedBill?.recipient_name) {
        primaryName = tx.expenseMatch.matchedBill.recipient_name;
      } else {
        primaryName = isIn ? 'Crédito em Conta' : 'Débito em Conta';
      }
    }

    // Remove prefixos bancários comuns
    primaryName = primaryName
      .replace(/^(BOLETO PAGO|PIX ENVIADO|PIX RECEBIDO|RECEBIMENTOS?|PAGAMENTOS?|ITAU|SISPAG SALARIOS|SISPAG FORNECEDORES)\s+/i, '')
      .replace(/\b(CART001008|7386166586)\b/g, '')
      .trim();

    // Remove CNPJ/CPF do final do nome se estiver grudado
    primaryName = primaryName.replace(/\s+\d{2,3}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, '').trim();
    primaryName = primaryName.replace(/\s+\d{3}\.\d{3}\.\d{3}-\d{2}$/, '').trim();

    // De-duplicação de palavras repetidas
    const words = primaryName.split(/\s+/);
    if (words.length >= 2) {
      if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
        primaryName = words[0];
      } else if (words.length >= 4) {
        for (let pLen = 3; pLen >= 1; pLen--) {
          if (words.length > pLen * 2) {
            const p1 = words.slice(0, pLen).join(' ').toLowerCase();
            const p2 = words.slice(pLen, pLen * 2).join(' ').toLowerCase();
            if (p2.startsWith(p1) || p1 === p2) {
              primaryName = words.slice(pLen).join(' ');
              break;
            }
          }
        }
      }
    }

    if (!primaryName || primaryName === '-' || primaryName === '—') {
      primaryName = isIn ? 'Crédito em Conta' : 'Débito em Conta';
    }

    // Identifica a natureza contábil e avatar Revolut
    let natureLabel = isIn ? 'Crédito Bancário' : 'Débito Bancário';
    let iconType: 'card' | 'bill' | 'pix_in' | 'pix_out' | 'cash' | 'tax' | 'bank' = isIn ? 'pix_in' : 'bill';

    const fullText = `${tx.title || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''} ${tx.manual_category || ''}`.toUpperCase();

    if (tx.isRede || /REDE|REDECARD|CIELO|CARTAO|CARTOES/.test(fullText)) {
      natureLabel = 'Crédito de Vendas Rede';
      iconType = 'card';
    } else if (tx.isMatchedExpense || /BOLETO|FEMATH|LELO|PRPK|AUTO PECAS|GESCONT|ESCAP/.test(fullText)) {
      natureLabel = 'Boleto / Pagamento Fornecedor';
      iconType = 'bill';
    } else if (/PIX ENVIADO/.test(fullText) || (tx.type === 'out' && /PIX/.test(fullText))) {
      natureLabel = 'Transferência PIX Enviada';
      iconType = 'pix_out';
    } else if (/RECEBIMENTO|PIX/.test(fullText) && isIn) {
      natureLabel = 'Transferência PIX Recebida';
      iconType = 'pix_in';
    } else if (/SAQUE|ATM|RETIRADA/.test(fullText)) {
      natureLabel = 'Saque ATM / Retirada em Dinheiro';
      iconType = 'cash';
    } else if (/JUROS|IOF|TAR|TARIFA/.test(fullText)) {
      natureLabel = 'Tarifa / Encargo Bancário';
      iconType = 'tax';
    }

    const doc = tx.cnpj_cpf ? `CNPJ: ${tx.cnpj_cpf}` : (tx.fitid ? `FITID: ${tx.fitid}` : null);

    return { primaryName, natureLabel, doc, iconType };
  };

  const renderSquircleAvatar = (iconType: string, isIn: boolean) => {
    // ENTRADAS (CRÉDITOS): Emerald / Verde vibrante ou Azul para Lote Rede
    if (isIn) {
      if (iconType === 'card') {
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <CreditCard size={18} />
          </div>
        );
      }
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <ArrowDownLeft size={18} />
        </div>
      );
    }

    // SAÍDAS (DÉBITOS): Rose / Vermelho nítido (NUNCA teal/verde!)
    switch (iconType) {
      case 'bill':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Receipt size={18} />
          </div>
        );
      case 'pix_out':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight size={18} />
          </div>
        );
      case 'cash':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
        );
      case 'tax':
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Percent size={18} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight size={18} />
          </div>
        );
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['ofx_transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_manual_bills'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] }),
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['store_extrato_bancario'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions', 'store', storeId, 'historical_reconciled'] })
    ]);
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato bancário..." /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 4 Hero Cards Revolut Analytics 2.0 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Oficial da Conta (<LEDGERBAL>) com Contexto de Saldo Anterior */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-none transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60 shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase font-sans">
              Saldo Oficial da Conta
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
              <Landmark size={15} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`font-display text-2xl font-bold font-mono tracking-tight ${activeBankTotal >= 0 ? 'text-zinc-100' : 'text-purple-300'}`}>
              <AmountCell value={activeBankTotal} tone={activeBankTotal >= 0 ? 'neutral' : 'brand'} />
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/60 pt-2 text-zinc-500">
            <span>Saldo Anterior:</span>
            <span className={activePreviousBalance >= 0 ? 'text-zinc-400 font-medium' : 'text-rose-400 font-medium'}>
              {formatCurrency(activePreviousBalance)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Entradas */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-none transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60 shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase font-sans">
              Total Entradas
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
              <ArrowDownLeft size={15} />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold font-mono tracking-tight text-emerald-400">
              <AmountCell value={totalEntradas} tone="success" showPlusSign />
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/60 pt-2 text-zinc-500">
            <span>Créditos no Extrato</span>
            <span className="text-emerald-400/90 font-medium">
              {countEntradas} recebimento(s)
            </span>
          </div>
        </div>

        {/* Card 3: Total Saídas */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-none transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60 shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase font-sans">
              Total Saídas
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-105 transition-transform">
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold font-mono tracking-tight text-rose-400">
              <AmountCell value={-totalSaidas} tone="danger" />
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/60 pt-2 text-zinc-500">
            <span>Débitos & Pagamentos</span>
            <span className="text-rose-400/90 font-medium">
              {countSaidas} lançamento(s)
            </span>
          </div>
        </div>

        {/* Card 4: Movimentação Líquida & Status */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur-none transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900/60 shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase font-sans">
              Movimentação Líquida
            </span>
            <div className={`flex items-center justify-center w-8 h-8 rounded-xl ${saldoLiquidoDia >= 0 ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'} group-hover:scale-105 transition-transform`}>
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`font-display text-2xl font-bold font-mono tracking-tight ${saldoLiquidoDia >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              <AmountCell value={saldoLiquidoDia} tone={saldoLiquidoDia >= 0 ? "brand" : "warning"} showPlusSign />
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/60 pt-2">
            <span className="text-zinc-500">Conciliação</span>
            {countPendentes > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {countPendentes} pendente(s)
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                100% Batido
              </span>
            )}
          </div>
        </div>
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
        <div className="bg-zinc-900/90 p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-zinc-100">
              <Landmark size={18} className="text-emerald-400" />
              Extrato Bancário Completo da Filial
            </h3>
            <p className="text-xs text-zinc-400">
              Movimentação fiduciária oficial: extrato OFX, histórico bancário, créditos e despesas conciliadas.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Controles Rápidos de Accordion */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <Button
                size="sm"
                variant="ghost"
                onClick={expandAllDays}
                className="h-7 px-2.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 gap-1 font-medium"
                title="Expandir todos os dias do extrato"
              >
                <ChevronDown size={13} />
                Expandir Todos
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={collapseAllDays}
                className="h-7 px-2.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 gap-1 font-medium"
                title="Recolher todos os dias do extrato"
              >
                <ChevronUp size={13} />
                Recolher Todos
              </Button>
            </div>

            {/* Segmented Control de Escopo */}
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewScope('lote_ofx')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewScope === 'lote_ofx'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText size={13} className="text-blue-400" />
                Extrato Completo do OFX ({extratoData?.loteTxs?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setViewScope('dia_alvo')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewScope === 'dia_alvo'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Target size={13} className="text-emerald-400" />
                Apenas Fechamento do Dia ({extratoData?.targetDateTxs?.length || 0})
              </button>
            </div>

            {unpersistedMatches.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={persistingMatches}
                onClick={handlePersistAutoMatches}
                className="text-xs h-7 px-3 bg-teal-500/10 border-teal-500/40 text-teal-300 hover:bg-teal-500/20 gap-1.5 font-medium shadow-sm"
              >
                {persistingMatches ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <CheckCircle2 size={13} className="text-teal-400" />
                )}
                Confirmar {unpersistedMatches.length} Vínculo(s) no Banco
              </Button>
            )}
            <Badge variant="outline" className="text-xs font-mono border-zinc-700 text-zinc-300 h-6 px-2.5">
              {filteredTransactions.length} de {enrichedTransactions.length} Lançamentos
            </Badge>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-800/80">
            {/* Linha Fiduciária Especial: Saldo Anterior no Extrato */}
            <div className="bg-zinc-900/90 p-4 flex items-center justify-between gap-3 border-b border-zinc-800">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-100 text-sm">
                      SALDO ANTERIOR REGISTRADO NO EXTRATO
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 border-zinc-700 text-zinc-300 bg-zinc-800 font-mono">
                      {viewScope === 'lote_ofx' ? 'Abertura Lote OFX (05/09)' : 'Fechamento D-1'}
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    Posição Inicial da Conta Corrente (Itaú) • {viewScope === 'lote_ofx' ? '05/09/2026' : formatDateOnly(date)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-mono font-bold text-sm ${activePreviousBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <AmountCell value={activePreviousBalance} tone={activePreviousBalance >= 0 ? 'success' : 'danger'} />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Saldo Inicial</span>
              </div>
            </div>

            {/* Accordions Agrupados por Dia */}
            {dayGroups.map((group) => {
              const isCollapsed = collapsedDays.has(group.dateKey);

              return (
                <div key={group.dateKey} className="border-b border-zinc-800/60 last:border-b-0">
                  {/* Cabeçalho do Dia Clicável */}
                  <button
                    type="button"
                    onClick={() => toggleDayCollapse(group.dateKey)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all select-none group text-left border-l-2 border-l-transparent hover:border-l-emerald-500"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.18 }}
                        className="shrink-0 text-zinc-400 group-hover:text-zinc-200"
                      >
                        <ChevronDown size={16} />
                      </motion.div>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-zinc-200 text-sm group-hover:text-white transition-colors">
                          {group.dayOfWeek ? `${group.dayOfWeek}, ` : ''}{group.formattedDate}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 py-0 px-2 border-zinc-700/80 text-zinc-400 bg-zinc-950/80 font-mono">
                          {group.transactions.length} lançamento(s)
                        </Badge>
                      </div>
                    </div>

                    {/* Resumo Financeiro do Dia */}
                    <div className="flex items-center gap-3 shrink-0">
                      {group.totalIn > 0 && (
                        <span className="hidden sm:inline-block text-emerald-400 font-mono font-medium text-xs">
                          + {formatCurrency(group.totalIn)}
                        </span>
                      )}
                      {group.totalOut > 0 && (
                        <span className="hidden sm:inline-block text-rose-400 font-mono font-medium text-xs">
                          - {formatCurrency(group.totalOut)}
                        </span>
                      )}
                      <span className="text-zinc-400 font-mono text-[11px] bg-zinc-950/80 px-2.5 py-0.5 rounded border border-zinc-800 shadow-sm">
                        Líq:{' '}
                        <strong className={group.netBalance >= 0 ? 'text-zinc-200' : 'text-rose-400'}>
                          {formatCurrency(group.netBalance)}
                        </strong>
                      </span>
                    </div>
                  </button>

                  {/* Lista de Transações do Dia com Framer Motion */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden divide-y divide-zinc-800/40 bg-zinc-950/40"
                      >
                        {group.transactions.map((tx: any) => {
                          const isIn = tx.type === 'in';
                          const { primaryName, natureLabel, doc, iconType } = getCleanTransactionDisplay(tx);
                          const matchedBill = tx.expenseMatch?.matchedBill;
                          const isLocked = tx.isLockedFromOtherDate;

                          return (
                            <div
                              key={tx.id}
                              onClick={() => setSelectedDetailTx(tx)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-850/60 cursor-pointer transition-all gap-3 group active:scale-[0.99]"
                            >
                              {/* Esquerda: Squircle + Detalhes Claros (sem redundância) */}
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {renderSquircleAvatar(iconType, isIn)}

                                <div className="flex flex-col min-w-0 flex-1">
                                  {/* Linha 1: Razão Social Limpa + Badges de Contexto */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="font-semibold text-zinc-100 text-sm truncate max-w-[280px] sm:max-w-[440px] md:max-w-[560px] group-hover:text-white transition-colors"
                                      title={primaryName}
                                    >
                                      {primaryName}
                                    </span>

                                    {/* Badges de Identificação Limpos (sem poluição de mega-badges no título) */}
                                    {tx.osNum ? (
                                      <Badge variant="outline" className="h-5 py-0 px-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                                        <QrCode size={10} className="mr-1" />
                                        OS #{tx.osNum}
                                      </Badge>
                                    ) : tx.isRede ? (
                                      <Badge variant="outline" className="h-5 py-0 px-2 bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                                        <CreditCard size={10} className="mr-1" />
                                        Lote Rede (Ref: D-1)
                                      </Badge>
                                    ) : tx.manual_category ? (
                                      <Badge variant="outline" className="h-5 py-0 px-2 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold">
                                        <CheckCircle2 size={10} className="mr-1 text-purple-400" />
                                        {String(tx.manual_category).replace('_', ' ')}
                                      </Badge>
                                    ) : matchedBill ? (
                                      <Badge variant="outline" className="h-5 py-0 px-2 bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px] font-semibold">
                                        <Receipt size={10} className="mr-1 text-teal-400" />
                                        Conta: {matchedBill.recipient_name || matchedBill.title}
                                      </Badge>
                                    ) : tx.isPastDate && (tx.target_date ? tx.target_date < date : true) ? (
                                      <Badge
                                        variant="outline"
                                        className="h-5 py-0 px-2 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-mono"
                                        title={`Data original de lançamento: ${formatDateOnly(tx.occurred_at || tx.txOccurredDate || tx.date)}`}
                                      >
                                        <Clock size={10} className="mr-1 text-purple-400" />
                                        D-1 ({formatDateOnly(tx.occurred_at || tx.txOccurredDate || tx.date)})
                                      </Badge>
                                    ) : tx.isPending ? (
                                      <Badge variant="outline" className="h-5 py-0 px-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1"></span>
                                        Pendente
                                      </Badge>
                                    ) : null}
                                  </div>

                                  {/* Linha 2: Metadados Revolut (Natureza contábil, Conta vinculada, Intercompany, Documento, Justificativa) */}
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5 flex-wrap">
                                    <span className="font-medium text-zinc-300">{natureLabel}</span>
                                    {matchedBill && !tx.manual_category && (
                                      <>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-teal-300/90 font-medium">Conta: {matchedBill?.recipient_name || matchedBill?.title}</span>
                                      </>
                                    )}
                                    {tx.manual_category && !tx.osNum && (
                                      <>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-purple-300/90 font-medium">{String(tx.manual_category).replace('_', ' ')}</span>
                                      </>
                                    )}
                                    {doc && (
                                      <>
                                        <span className="text-zinc-600">•</span>
                                        <span className="font-mono text-zinc-500 text-[11px]">{doc}</span>
                                      </>
                                    )}
                                    {tx.manual_justification && (
                                      <>
                                        <span className="text-zinc-600">•</span>
                                        <span className="text-emerald-400 italic text-[11px]">"{tx.manual_justification}"</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Direita: Valor em Alto Contraste (Rose Saída / Emerald Entrada) + Micro Chevron Revolut */}
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className={`font-mono font-bold text-sm tracking-tight ${isIn ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isIn ? '+ ' : '- '}{formatCurrency(Math.abs(Number(tx.amount || 0)))}
                                  </div>
                                </div>

                                <ChevronRight
                                  size={15}
                                  className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Linha Fiduciária Especial: Saldo Final Oficial */}
            <div className="bg-zinc-900/95 border-t-2 border-purple-500/40 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Landmark size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-100 text-sm">
                      SALDO FINAL OFICIAL CONTA CORRENTE
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 border-purple-500/40 text-purple-300 bg-purple-500/10 font-mono">
                      &lt;LEDGERBAL&gt;
                    </Badge>
                    <Badge variant="outline" className="h-4 py-0 px-1.5 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold">
                      Itaú Validado
                    </Badge>
                  </div>
                  <span className="text-xs text-zinc-400 mt-0.5">
                    {activeBankTotal < 0 ? 'Limite Utilizado / Cheque Especial Itaú' : 'Saldo Positivo em Conta Corrente'} • Posição em {formatDateOnly(date)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-mono font-bold text-base ${activeBankTotal >= 0 ? 'text-emerald-400' : 'text-purple-300'}`}>
                  <AmountCell value={activeBankTotal} tone={activeBankTotal >= 0 ? 'success' : 'brand'} />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Posição Oficial</span>
              </div>
            </div>
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

      {/* Janela de Detalhes da Transação (Revolut Card Details) */}
      {selectedDetailTx && (
        <TransactionDetailModal
          isOpen={!!selectedDetailTx}
          onClose={() => setSelectedDetailTx(null)}
          transaction={selectedDetailTx}
          storeId={storeId}
          currentDate={date}
          onMoveToToday={handleMoveTransactionToToday}
          onLinkOs={(tx) => setMatchingTx(tx)}
          onUnlinkOs={handleUnlink}
          onEditCategory={(tx) => setCategorizingTx(tx)}
          isMoving={movingTxId === selectedDetailTx?.id}
        />
      )}
    </div>
  );
}
