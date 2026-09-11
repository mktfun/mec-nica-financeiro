import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { 
  FileQuestion, 
  CheckCircle2, 
  Save, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  Link2,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle,
  Receipt,
  FileEdit,
  Sparkles
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { executeExpenseAutoMatching } from '@/lib/expenseMatcher';

export interface OFXEntry {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  date: string;
  fitid: string;
  type: 'in' | 'out';
  bankName?: string;
  counterpartName?: string;
  title?: string;
  subtitle?: string;
  matchedBillId?: string;
  matchedOsNumber?: string;
  manualCategory?: string;
  manualJustification?: string;
  contabilizarNoSubtotal?: boolean;
}

export interface QuickCategory {
  id: string;
  label: string;
  defaultImpact: boolean;
  color: string;
}

export const QUICK_INFLOW_CATEGORIES: QuickCategory[] = [
  { id: 'transf_lojas', label: 'Transferência Entre Lojas', defaultImpact: false, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'aporte_socios', label: 'Aporte de Sócios', defaultImpact: false, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'estorno', label: 'Estorno / Ajuste', defaultImpact: false, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { id: 'tarifa', label: 'Tarifa / Despesa Bancária', defaultImpact: false, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'venda_sucata', label: 'Venda de Sucata', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'deposito_avulso', label: 'Depósito Avulso', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'outros', label: 'Outros', defaultImpact: false, color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10' },
];

export const QUICK_OUTFLOW_CATEGORIES: QuickCategory[] = [
  { id: 'pecas_fornecedor', label: 'Peças / Fornecedor Avulso', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'servicos_terceiros', label: 'Serviços de Terceiros / Torno', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'impostos', label: 'Impostos / Tributos', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'transf_lojas_out', label: 'Transferência Entre Lojas', defaultImpact: false, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'retirada_socios', label: 'Retirada de Sócios / Pró-labore', defaultImpact: false, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'tarifa_out', label: 'Tarifa Bancária / Encargos', defaultImpact: false, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'outras_despesas', label: 'Outras Despesas', defaultImpact: true, color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10' },
];

interface InflowItemState {
  category: string;
  impactsRevenue: boolean;
  observacao: string;
  saved: boolean;
  saving: boolean;
  cancelled: boolean;
}

interface OutflowItemState {
  category: string;
  adicionaNoContas: boolean;
  selectedBillId: string | null;
  observacao: string;
  saved: boolean;
  saving: boolean;
  cancelled: boolean;
}

interface Props {
  results: UnifiedImportResult;
  mapping: Record<string, string>;
  targetDate: string;
  stores: { id: string; name: string }[];
  onNext: () => void;
  onBack: () => void;
}

export const EXCLUDE_ACQUIRER_REGEX =
  /(?:^|[^a-zA-Z0-9])(REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|PAGS|BIN|ADQ|ADQUIRENTE|MAST|MASTER|MASTERCARD|VISA|VISA\s+ELECTRON|ELO|AMEX|AMERICAN\s+EXPRESS|HIPERCARD|ALELO|SODEXO|TICKET|VR|VOUCHER|LIQ[\.\s]|LIQUIDACAO|CARTAO|CRED[\.\s]?CARTAO)(?:$|[^a-zA-Z0-9])/i;

export const EXCLUDE_BANK_EARNINGS_REGEX =
  /(?:^|[^a-zA-Z0-9])(REND|RENDIMENTO|REND\s+PAGO\s+APLIC|APLIC|APLICACAO|APLICAÇÃO|RESG|RESGATE|CDB|LCI|LCA|TESOURO|FUNDO|FUNDOS|JUROS|POUP|POUPANCA|POUPANÇA|AUT\s+APR|APL\s+AUT|RESG\s+AUT|IOF|REMUNERAC|IRRF\s+S\/\s+APLIC)(?:$|[^a-zA-Z0-9])/i;

export const NON_REVENUE_PATTERNS = {
  TRANSFERENCIA_ENTRE_LOJAS:
    /DHJV|MECANICA\s+DHJV|SERVICOS|SERVIÇOS|TRANSF.*(?:ENTRE|FILIAL|LOJA|MESMA\s+TITULARIDADE)|INTERCOMPANY/i,
  APORTE:
    /APORTE|INTEGRALIZAC|DEPOSITO\s+SOCIO|MUTUO|CAPITAL\s+SOCIAL|ROGERIO|RAPHAEL|DANIEL/i,
  TARIFA_BANCARIA:
    /TARIFA|TAR\s+CONTA|TAR\s+BANCARIA|ESTORNO\s+TARIFA|MANUT\s+CONTA|ENCARGOS/i,
  ESTORNO:
    /ESTORNO|DEVOLUCAO|DEVOLUÇÃO|CANCELAMENTO/i,
  SUCATA:
    /SUCATA|BATID|RECICLAG/i,
};

function inferInflowCategory(desc: string): { category: string; impactsRevenue: boolean } {
  if (NON_REVENUE_PATTERNS.TRANSFERENCIA_ENTRE_LOJAS.test(desc)) {
    return { category: 'Transferência Entre Lojas', impactsRevenue: false };
  }
  if (NON_REVENUE_PATTERNS.APORTE.test(desc)) {
    return { category: 'Aporte de Sócios', impactsRevenue: false };
  }
  if (NON_REVENUE_PATTERNS.TARIFA_BANCARIA.test(desc)) {
    return { category: 'Tarifa / Despesa Bancária', impactsRevenue: false };
  }
  if (NON_REVENUE_PATTERNS.ESTORNO.test(desc)) {
    return { category: 'Estorno / Ajuste', impactsRevenue: false };
  }
  if (NON_REVENUE_PATTERNS.SUCATA.test(desc)) {
    return { category: 'Venda de Sucata', impactsRevenue: true };
  }
  return { category: 'Transferência Entre Lojas', impactsRevenue: false };
}

function inferOutflowCategory(desc: string): { category: string; adicionaNoContas: boolean } {
  if (/SAQUE\s+DIN|SAQUE\s+ATM|CART00/i.test(desc)) {
    return { category: 'Retirada de Sócios / Sangria / Saque em Dinheiro', adicionaNoContas: false };
  }
  if (NON_REVENUE_PATTERNS.TRANSFERENCIA_ENTRE_LOJAS.test(desc)) {
    return { category: 'Transferência Entre Lojas', adicionaNoContas: false };
  }
  if (NON_REVENUE_PATTERNS.APORTE.test(desc)) {
    return { category: 'Retirada de Sócios / Pró-labore', adicionaNoContas: false };
  }
  if (NON_REVENUE_PATTERNS.TARIFA_BANCARIA.test(desc)) {
    return { category: 'Tarifa Bancária / Encargos', adicionaNoContas: false };
  }
  return { category: 'Peças / Fornecedor Avulso', adicionaNoContas: true };
}

export const formatDateOnly = (dateStr?: string) => {
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

export function Step2NonRevenueJustifications({
  results,
  mapping,
  targetDate,
  stores,
  onNext,
  onBack,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'outflows' | 'inflows'>('outflows');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'saved'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. Débitos bancários do OFX pendentes de casamento (Saídas Órfãs Reais do Banco)
  const { 
    data: dbOutflows = [], 
    isLoading: isLoadingOutflows, 
    refetch: refetchOutflows 
  } = useQuery({
    queryKey: ['pending-ofx-outflows', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, matched_bill_id, manual_category, manual_justification, target_date, contabilizar_no_subtotal, match_status')
        .eq('target_date', targetDate)
        .eq('type', 'out')
        .is('matched_bill_id', null);
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Entradas bancárias do OFX sem vínculo com OS (Entradas Órfãs Reais do Banco)
  const { 
    data: dbInflows = [], 
    isLoading: isLoadingInflows, 
    refetch: refetchInflows 
  } = useQuery({
    queryKey: ['pending-ofx-inflows', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, matched_os_number, manual_category, manual_justification, target_date, match_status')
        .eq('target_date', targetDate)
        .eq('type', 'in')
        .is('matched_os_number', null);
      if (error) throw error;
      return data || [];
    }
  });

  // 3. Contas em aberto da data para possível associação direta
  const { data: openBills = [] } = useQuery({
    queryKey: ['open-bills-for-step2', targetDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_manual_bills')
        .select('id, title, recipient_name, amount, store_id, category')
        .eq('date', targetDate)
        .is('matched_ofx_id', null);
      return data || [];
    }
  });

  // 4. Mapeamento enriquecido de Entradas Órfãs
  const nonRevenueInflowEntries = useMemo<OFXEntry[]>(() => {
    if (dbInflows && dbInflows.length > 0) {
      return dbInflows
        .filter((tx: any) => {
          if (tx.match_status === 'matched' || tx.match_status === 'matched_batch' || tx.match_status === 'intercompany_paired' || tx.match_status === 'auto_cancelled') return false;
          const fullDesc = `${tx.counterpart_name || ''} ${tx.bank_name || ''}`.trim();
          if (EXCLUDE_ACQUIRER_REGEX.test(fullDesc)) return false;
          if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return false;
          if (/saldo\s+anterior|saldo\s+total/i.test(fullDesc)) return false;
          return true;
        })
        .map((tx: any) => {
          const storeObj = stores.find(s => s.id === tx.store_id);
          const storeName = storeObj?.name || tx.store_id || 'Loja';
          const description = tx.counterpart_name || tx.bank_name || 'Movimentação Bancária';
          return {
            id: tx.id,
            storeId: tx.store_id || '',
            storeName,
            amount: Math.abs(Number(tx.amount || 0)),
            description,
            date: tx.target_date || (tx.occurred_at ? String(tx.occurred_at).slice(0, 10) : targetDate),
            fitid: tx.fitid || '',
            type: 'in' as const,
            bankName: tx.bank_name,
            counterpartName: tx.counterpart_name,
            title: tx.bank_name,
            subtitle: tx.counterpart_name,
            matchedOsNumber: tx.matched_os_number || undefined,
            manualCategory: tx.manual_category || undefined,
            manualJustification: tx.manual_justification || undefined,
          };
        });
    }

    const entries: OFXEntry[] = [];
    results.ofxResults?.forEach((ofxResult: any) => {
      const storeId = mapping[ofxResult.alias] || '';
      const storeObj = stores.find(s => s.id === storeId);
      const storeName = storeObj?.name || ofxResult.alias || 'Loja';

      (ofxResult.transactions || []).forEach((tx: any) => {
        if (tx.type !== 'in' && Number(tx.amount || 0) <= 0) return;
        if (tx.matched_os_number || tx.matchedOsNumber || tx.match_status === 'matched' || tx.match_status === 'intercompany_paired' || tx.match_status === 'auto_cancelled') return;

        const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
        if (EXCLUDE_ACQUIRER_REGEX.test(fullDesc)) return;
        if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return;
        if (/saldo\s+anterior|saldo\s+total/i.test(fullDesc)) return;

        const isTransferOrAporte =
          NON_REVENUE_PATTERNS.TRANSFERENCIA_ENTRE_LOJAS.test(fullDesc) ||
          NON_REVENUE_PATTERNS.APORTE.test(fullDesc) ||
          NON_REVENUE_PATTERNS.TARIFA_BANCARIA.test(fullDesc) ||
          NON_REVENUE_PATTERNS.ESTORNO.test(fullDesc) ||
          NON_REVENUE_PATTERNS.SUCATA.test(fullDesc);

        if (isTransferOrAporte || !/PIX|QRS|CHAVE/i.test(fullDesc)) {
          entries.push({
            id: tx.id || tx.fitid || `${ofxResult.alias}_${tx.amount}_${Math.random()}`,
            storeId,
            storeName,
            amount: Math.abs(Number(tx.amount || 0)),
            description: tx.title || tx.counterpart_name || 'Movimentação Bancária',
            date: tx.date || targetDate,
            fitid: tx.fitid || '',
            type: 'in',
            bankName: ofxResult.bankName || tx.bank_name,
            counterpartName: tx.counterpart_name,
            title: tx.title,
            subtitle: tx.subtitle,
          });
        }
      });
    });
    return entries;
  }, [dbInflows, results.ofxResults, mapping, stores, targetDate]);

  // 5. Mapeamento enriquecido de Saídas Órfãs
  const nonRevenueOutflowEntries = useMemo<OFXEntry[]>(() => {
    if (dbOutflows && dbOutflows.length > 0) {
      return dbOutflows
        .filter((tx: any) => {
          if (tx.match_status === 'matched' || tx.match_status === 'matched_batch' || tx.match_status === 'intercompany_paired' || tx.match_status === 'auto_cancelled') return false;
          const fullDesc = `${tx.counterpart_name || ''} ${tx.bank_name || ''}`.trim();
          if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return false;
          if (/saldo\s+anterior|saldo\s+total/i.test(fullDesc)) return false;
          return true;
        })
        .map((tx: any) => {
          const storeObj = stores.find(s => s.id === tx.store_id);
          const storeName = storeObj?.name || tx.store_id || 'Loja';
          const description = tx.counterpart_name || tx.bank_name || 'Débito Bancário';
          return {
            id: tx.id,
            storeId: tx.store_id || '',
            storeName,
            amount: Math.abs(Number(tx.amount || 0)),
            description,
            date: tx.target_date || (tx.occurred_at ? String(tx.occurred_at).slice(0, 10) : targetDate),
            fitid: tx.fitid || '',
            type: 'out' as const,
            bankName: tx.bank_name,
            counterpartName: tx.counterpart_name,
            title: tx.bank_name,
            subtitle: tx.counterpart_name,
            matchedBillId: tx.matched_bill_id || undefined,
            manualCategory: tx.manual_category || undefined,
            manualJustification: tx.manual_justification || undefined,
            contabilizarNoSubtotal: tx.contabilizar_no_subtotal,
          };
        });
    }

    if (results.ofxResults && results.ofxResults.length > 0) {
      const matchRes = executeExpenseAutoMatching(
        results.ofxResults,
        results.contasPagarResults || [],
        mapping,
        stores
      );

      return matchRes.orphanOutflows
        .filter(tx => {
          const desc = tx.description || '';
          if (EXCLUDE_BANK_EARNINGS_REGEX.test(desc)) return false;
          if (/saldo\s+anterior|saldo\s+total/i.test(desc)) return false;
          return true;
        })
        .map(tx => ({
          id: tx.id,
          storeId: tx.storeId,
          storeName: tx.storeName,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
          fitid: tx.fitid,
          type: 'out' as const,
        }));
    }

    return [];
  }, [dbOutflows, results.ofxResults, results.contasPagarResults, mapping, stores, targetDate]);

  const [inflowStates, setInflowStates] = useState<Record<string, InflowItemState>>({});
  const [outflowStates, setOutflowStates] = useState<Record<string, OutflowItemState>>({});

  const getInflowState = (entry: OFXEntry): InflowItemState => {
    if (inflowStates[entry.id]) return inflowStates[entry.id];
    const inferred = inferInflowCategory(entry.description);
    const isAlreadySaved = !!entry.manualCategory;
    const impactsRev = entry.manualCategory 
      ? !entry.manualCategory.includes('[Apenas Conciliar]') 
      : inferred.impactsRevenue;
    const cat = entry.manualCategory 
      ? entry.manualCategory.replace(/\s*\[Apenas Conciliar\]/gi, '').trim() 
      : inferred.category;

    return {
      category: cat,
      impactsRevenue: impactsRev,
      observacao: entry.manualJustification || '',
      saved: isAlreadySaved,
      saving: false,
      cancelled: false,
    };
  };

  const updateInflowState = (id: string, partial: Partial<InflowItemState>, entry?: OFXEntry) => {
    setInflowStates(prev => {
      const current = prev[id] || (entry ? getInflowState(entry) : {
        category: 'Transferência Entre Lojas',
        impactsRevenue: false,
        observacao: '',
        saved: false,
        saving: false,
        cancelled: false,
      });
      return {
        ...prev,
        [id]: { ...current, ...partial },
      };
    });
  };

  const getOutflowState = (entry: OFXEntry): OutflowItemState => {
    if (outflowStates[entry.id]) return outflowStates[entry.id];
    const inferred = inferOutflowCategory(entry.description);
    const isAlreadySaved = !!entry.manualCategory || !!entry.matchedBillId;
    const addContas = entry.contabilizarNoSubtotal !== undefined && entry.contabilizarNoSubtotal !== null
      ? Boolean(entry.contabilizarNoSubtotal)
      : inferred.adicionaNoContas;

    return {
      category: entry.manualCategory || inferred.category,
      adicionaNoContas: addContas,
      selectedBillId: entry.matchedBillId || null,
      observacao: entry.manualJustification || '',
      saved: isAlreadySaved,
      saving: false,
      cancelled: false,
    };
  };

  const updateOutflowState = (id: string, partial: Partial<OutflowItemState>, entry?: OFXEntry) => {
    setOutflowStates(prev => {
      const current = prev[id] || (entry ? getOutflowState(entry) : {
        category: 'Peças / Fornecedor Avulso',
        adicionaNoContas: true,
        selectedBillId: null,
        observacao: '',
        saved: false,
        saving: false,
        cancelled: false,
      });
      return {
        ...prev,
        [id]: { ...current, ...partial },
      };
    });
  };

  const handleSaveInflow = async (entry: OFXEntry) => {
    const state = getInflowState(entry);
    updateInflowState(entry.id, { saving: true }, entry);
    try {
      const cleanCategory = state.category.replace(/\s*\[Apenas Conciliar\]/gi, '').trim();
      const finalCategory = state.impactsRevenue ? cleanCategory : `${cleanCategory} [Apenas Conciliar]`;
      const cleanJustification = state.observacao.replace(/\s*\[NÃO SOMAR\]/gi, '').trim();
      const finalJustification = state.impactsRevenue ? cleanJustification : `${cleanJustification} [NÃO SOMAR]`.trim();

      // 1. Atualizar ofx_transactions
      const { error: ofxErr } = await supabase
        .from('ofx_transactions')
        .update({
          manual_category: finalCategory,
          manual_justification: finalJustification,
          contabilizar_no_subtotal: state.impactsRevenue,
        })
        .eq('id', entry.id);

      if (ofxErr) throw ofxErr;

      // 2. Sincronizar daily_revenue_adjustments para a RPC get_daily_reconciliation_summary somar no Faturamento
      if (state.impactsRevenue && entry.amount > 0) {
        const { error: adjErr } = await supabase
          .from('daily_revenue_adjustments')
          .upsert({
            id: entry.id,
            date: targetDate, // SEMPRE targetDate da conciliação contábil do fechamento
            store_id: entry.storeId || null,
            title: cleanCategory || 'Receita Avulsa OFX',
            description: cleanJustification || entry.description || 'Justificado no Wizard',
            type: 'venda_avulsa',
            amount: entry.amount
          }, { onConflict: 'id' });

        if (adjErr) throw adjErr;
      } else {
        const { error: delErr } = await supabase
          .from('daily_revenue_adjustments')
          .delete()
          .eq('id', entry.id);
        if (delErr) throw delErr;
      }

      updateInflowState(entry.id, { saving: false, saved: true }, entry);
      setEditingId(null);
      refetchInflows();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] }),
        queryClient.invalidateQueries({ queryKey: ['justified_transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] }),
      ]);
      toast.success(`Entrada classificada! (${state.impactsRevenue ? '📈 Soma ao Faturamento' : '🚫 Apenas Conciliar'})`);
    } catch (err: any) {
      updateInflowState(entry.id, { saving: false }, entry);
      toast.error(`Erro ao salvar entrada: ${err.message}`);
    }
  };

  const handleSaveOutflow = async (entry: OFXEntry) => {
    const state = getOutflowState(entry);
    updateOutflowState(entry.id, { saving: true }, entry);
    try {
      const { data: rpcRes, error } = await supabase.rpc('resolve_orphan_saida_ofx', {
        p_ofx_id: entry.id,
        p_category: state.category,
        p_justification: state.observacao || entry.description,
        p_contabilizar_no_subtotal: state.adicionaNoContas,
        p_store_id: entry.storeId || null,
        p_amount: entry.amount,
        p_target_date: targetDate,
        p_bill_id: state.selectedBillId || null,
      });

      if (error) throw error;
      if (rpcRes && (rpcRes as any).success === false) {
        throw new Error((rpcRes as any).message || 'Falha ao classificar saída no banco');
      }

      updateOutflowState(entry.id, { saving: false, saved: true }, entry);
      setEditingId(null);
      refetchOutflows();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-bills-for-step2'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['justified_transactions'] }),
      ]);

      if (state.selectedBillId) {
        toast.success('Débito vinculado à conta existente com sucesso!');
      } else if (state.adicionaNoContas) {
        toast.success('Despesa Extra adicionada ao Contas a Pagar com sucesso!');
      } else {
        toast.success('Saída justificada sem impacto no Contas a Pagar.');
      }
    } catch (err: any) {
      updateOutflowState(entry.id, { saving: false }, entry);
      toast.error(`Erro ao resolver saída: ${err.message}`);
    }
  };

  const handleRefresh = () => {
    refetchOutflows();
    refetchInflows();
    toast.info('Atualizando transações pendentes do banco...');
  };

  // KPIs Monetários e Contagens
  const totalOutflowAmount = useMemo(() => {
    return nonRevenueOutflowEntries.reduce((acc, e) => acc + e.amount, 0);
  }, [nonRevenueOutflowEntries]);

  const totalInflowAmount = useMemo(() => {
    return nonRevenueInflowEntries.reduce((acc, e) => acc + e.amount, 0);
  }, [nonRevenueInflowEntries]);

  const savedOutflowCount = nonRevenueOutflowEntries.filter(e => getOutflowState(e).saved).length;
  const pendingOutflowCount = nonRevenueOutflowEntries.length - savedOutflowCount;

  const savedInflowCount = nonRevenueInflowEntries.filter(e => getInflowState(e).saved).length;
  const pendingInflowCount = nonRevenueInflowEntries.length - savedInflowCount;

  // Filtragem Reativa de Saídas
  const filteredOutflows = useMemo(() => {
    return nonRevenueOutflowEntries.filter(entry => {
      const state = getOutflowState(entry);
      if (state.cancelled) return false;

      if (statusFilter === 'pending' && state.saved) return false;
      if (statusFilter === 'saved' && !state.saved) return false;

      if (selectedStoreId !== 'ALL' && entry.storeId !== selectedStoreId) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchText = [
          entry.description,
          entry.counterpartName,
          entry.bankName,
          entry.title,
          entry.subtitle,
          entry.fitid,
          entry.storeName,
          state.category,
          state.observacao,
          String(entry.amount),
        ].filter(Boolean).join(' ').toLowerCase();

        if (!matchText.includes(term)) return false;
      }

      return true;
    });
  }, [nonRevenueOutflowEntries, statusFilter, selectedStoreId, searchTerm, outflowStates]);

  // Filtragem Reativa de Entradas
  const filteredInflows = useMemo(() => {
    return nonRevenueInflowEntries.filter(entry => {
      const state = getInflowState(entry);
      if (state.cancelled) return false;

      if (statusFilter === 'pending' && state.saved) return false;
      if (statusFilter === 'saved' && !state.saved) return false;

      if (selectedStoreId !== 'ALL' && entry.storeId !== selectedStoreId) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchText = [
          entry.description,
          entry.counterpartName,
          entry.bankName,
          entry.title,
          entry.subtitle,
          entry.fitid,
          entry.storeName,
          state.category,
          state.observacao,
          String(entry.amount),
        ].filter(Boolean).join(' ').toLowerCase();

        if (!matchText.includes(term)) return false;
      }

      return true;
    });
  }, [nonRevenueInflowEntries, statusFilter, selectedStoreId, searchTerm, inflowStates]);

  const currentCount = activeTab === 'outflows' ? nonRevenueOutflowEntries.length : nonRevenueInflowEntries.length;
  const currentSavedCount = activeTab === 'outflows' ? savedOutflowCount : savedInflowCount;
  const currentPendingCount = activeTab === 'outflows' ? pendingOutflowCount : pendingInflowCount;

  return (
    <div className='space-y-6'>
      {/* Header Principal */}
      <Card className='p-6 bg-zinc-900/60 border-zinc-800'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-bold text-zinc-100 flex items-center gap-2'>
              <FileQuestion className='text-amber-400' size={20} />
              Extrato OFX: Justificativas de Movimentações Órfãs
            </h2>
            <p className='text-xs text-zinc-400 mt-1 max-w-3xl'>
              Exibição em formato de extrato bancário oficial. Classifique os débitos e créditos que não foram casados de forma automatizada, definindo o impacto contábil de cada movimentação.
            </p>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              className='bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold'
            >
              <RefreshCw size={14} className={(isLoadingOutflows || isLoadingInflows) ? 'animate-spin mr-1.5' : 'mr-1.5'} />
              Atualizar
            </Button>
            <Badge variant='outline' className='bg-zinc-950/80 border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 font-mono'>
              {currentSavedCount} de {currentCount} tratadas
            </Badge>
          </div>
        </div>

        {/* Totalizadores / KPIs Financeiros no Topo */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-zinc-800/80'>
          {/* KPI 1: Saídas Órfãs */}
          <div className='bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between'>
            <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1'>
              <TrendingDown size={13} className='text-rose-400' /> Total Débitos Órfãos
            </span>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl font-bold font-mono text-rose-400 tabular-nums'>
                - {formatCurrency(totalOutflowAmount)}
              </span>
              <Badge variant='outline' className='text-[10px] bg-rose-500/10 text-rose-300 border-rose-500/30'>
                {nonRevenueOutflowEntries.length} itens
              </Badge>
            </div>
            <span className='text-[11px] text-zinc-500 font-mono mt-1'>
              {pendingOutflowCount > 0 ? `${pendingOutflowCount} pendentes de destinação` : 'Todas as saídas tratadas'}
            </span>
          </div>

          {/* KPI 2: Entradas Órfãs */}
          <div className='bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between'>
            <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1'>
              <TrendingUp size={13} className='text-emerald-400' /> Total Créditos Órfãos
            </span>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className='text-xl font-bold font-mono text-emerald-400 tabular-nums'>
                + {formatCurrency(totalInflowAmount)}
              </span>
              <Badge variant='outline' className='text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30'>
                {nonRevenueInflowEntries.length} itens
              </Badge>
            </div>
            <span className='text-[11px] text-zinc-500 font-mono mt-1'>
              {pendingInflowCount > 0 ? `${pendingInflowCount} pendentes de destinação` : 'Todas as entradas tratadas'}
            </span>
          </div>

          {/* KPI 3: Status Geral de Tratamento */}
          <div className='bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 flex flex-col justify-between'>
            <span className='text-[10px] text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1'>
              <Sparkles size={13} className='text-purple-400' /> Status do Fechamento
            </span>
            <div className='mt-2 flex items-baseline justify-between'>
              <span className={`text-xl font-bold font-mono ${currentPendingCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {currentPendingCount === 0 ? '100% Tratado' : `${currentPendingCount} Pendência(s)`}
              </span>
              <Badge variant='outline' className={`text-[10px] ${currentPendingCount === 0 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
                {currentPendingCount === 0 ? 'Pronto' : 'Ação Necessária'}
              </Badge>
            </div>
            <span className='text-[11px] text-zinc-500 font-mono mt-1'>
              {activeTab === 'outflows' 
                ? `${savedOutflowCount} de ${nonRevenueOutflowEntries.length} saídas tratadas`
                : `${savedInflowCount} de ${nonRevenueInflowEntries.length} entradas tratadas`}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-zinc-800/80 mt-6'>
          <button
            onClick={() => { setActiveTab('outflows'); setEditingId(null); }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'outflows'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            <TrendingDown size={15} className='text-rose-400' />
            <span>Saídas Órfãs ({nonRevenueOutflowEntries.length})</span>
            {savedOutflowCount === nonRevenueOutflowEntries.length && nonRevenueOutflowEntries.length > 0 && (
              <Check size={13} className='text-emerald-400' />
            )}
          </button>

          <button
            onClick={() => { setActiveTab('inflows'); setEditingId(null); }}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'inflows'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            <TrendingUp size={15} className='text-emerald-400' />
            <span>Entradas Órfãs ({nonRevenueInflowEntries.length})</span>
            {savedInflowCount === nonRevenueInflowEntries.length && nonRevenueInflowEntries.length > 0 && (
              <Check size={13} className='text-emerald-400' />
            )}
          </button>
        </div>
      </Card>

      {/* Barra de Filtros, Busca e Seleção de Filiais */}
      <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800'>
        {/* Status Filters */}
        <div className='flex flex-wrap items-center gap-1.5'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setStatusFilter('all')}
            className={`text-xs h-8 px-3 rounded-lg font-medium transition-all ${
              statusFilter === 'all' 
                ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm' 
                : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todas ({activeTab === 'outflows' ? nonRevenueOutflowEntries.length : nonRevenueInflowEntries.length})
          </Button>

          {currentPendingCount > 0 && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => setStatusFilter('pending')}
              className={`text-xs h-8 px-3 rounded-lg font-medium transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              ⚠️ Pendentes ({currentPendingCount})
            </Button>
          )}

          <Button
            size='sm'
            variant='outline'
            onClick={() => setStatusFilter('saved')}
            className={`text-xs h-8 px-3 rounded-lg font-medium transition-all ${
              statusFilter === 'saved'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <Check size={12} className='mr-1' />
            Salvas ({currentSavedCount})
          </Button>
        </div>

        {/* Dropdown de Filiais e Busca por Texto */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
          {/* Seletor de Loja */}
          <div className='relative'>
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className='w-full sm:w-48 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-medium appearance-none cursor-pointer'
            >
              <option value='ALL'>🏢 Todas as Lojas</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className='absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none' />
          </div>

          {/* Busca Textual */}
          <div className='relative w-full sm:w-64'>
            <Search size={14} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500' />
            <input
              type='text'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder='Buscar descrição, favorecido, FITID...'
              className='w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700'
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className='absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300'
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {(isLoadingOutflows || isLoadingInflows) && (
        <Card className='p-6 bg-zinc-950/80 border-zinc-800 flex items-center justify-center gap-3 text-zinc-400 text-xs'>
          <Loader2 className='animate-spin text-emerald-400' size={18} />
          <span>Sincronizando extrato OFX com o banco...</span>
        </Card>
      )}

      {/* TAB 1: SAÍDAS ÓRFÃS EM TABELA CANÔNICA */}
      {activeTab === 'outflows' && (
        <Card className='p-0 overflow-hidden border-zinc-800 bg-zinc-950'>
          {filteredOutflows.length === 0 ? (
            <div className='p-12 text-center text-zinc-500 flex flex-col items-center'>
              <CheckCircle2 size={36} className='text-emerald-400/60 mb-3' />
              <p className='text-sm font-bold text-zinc-200'>Nenhuma saída encontrada para os filtros aplicados.</p>
              <p className='text-xs text-zinc-500 mt-1 max-w-md'>
                {nonRevenueOutflowEntries.length === 0 
                  ? 'Todos os débitos bancários foram pareados automaticamente com o Contas a Pagar.' 
                  : 'Tente limpar a busca ou os filtros de loja e status.'}
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono'>
                    <th className='text-left py-2.5 px-3 font-medium'>Filial</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Data</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Descrição / Histórico Bancário</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Favorecido / Documento / FITID</th>
                    <th className='text-right py-2.5 px-3 font-medium'>Valor</th>
                    <th className='text-center py-2.5 px-3 font-medium'>Status / Destinação</th>
                    <th className='text-center py-2.5 px-3 font-medium'>Ações</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-zinc-800/60 font-sans'>
                  {filteredOutflows.map(entry => {
                    const state = getOutflowState(entry);
                    const isExpanded = editingId === entry.id;
                    const storeOpenBills = openBills.filter((b: any) => !entry.storeId || !b.store_id || b.store_id === entry.storeId);
                    const selectedBill = state.selectedBillId ? openBills.find((b: any) => b.id === state.selectedBillId) : null;

                    return (
                      <React.Fragment key={entry.id}>
                        {/* Linha Principal da Tabela */}
                        <tr className={`hover:bg-zinc-900/40 transition-colors ${isExpanded ? 'bg-zinc-900/60' : ''}`}>
                          {/* Coluna 1: Filial */}
                          <td className='py-2.5 px-3 whitespace-nowrap'>
                            <Badge variant='outline' className='bg-zinc-800 text-zinc-200 border-zinc-700 text-[11px] font-bold font-mono px-2 py-0.5'>
                              {entry.storeName}
                            </Badge>
                          </td>

                          {/* Coluna 2: Data */}
                          <td className='py-2.5 px-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]'>
                            <div className='flex items-center gap-1.5'>
                              <Calendar size={12} className='text-zinc-500' />
                              <span>{formatDateOnly(entry.date)}</span>
                            </div>
                          </td>

                          {/* Coluna 3: Descrição Bancária */}
                          <td className='py-2.5 px-3 font-medium text-zinc-200 max-w-[280px]'>
                            <div className='flex flex-col'>
                              <span className='truncate text-xs font-semibold' title={entry.description}>
                                {entry.description}
                              </span>
                              {entry.subtitle && (
                                <span className='text-[10px] text-zinc-400 truncate'>
                                  {entry.subtitle}
                                </span>
                              )}
                              {state.observacao && (
                                <span className='text-[10px] text-emerald-400 italic truncate'>
                                  "{state.observacao}"
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Coluna 4: Favorecido / FITID */}
                          <td className='py-2.5 px-3 text-zinc-400 font-mono text-[11px] max-w-[200px] truncate'>
                            <span title={entry.counterpartName || entry.fitid || entry.bankName || '—'}>
                              {entry.counterpartName || entry.fitid || entry.bankName || '—'}
                            </span>
                          </td>

                          {/* Coluna 5: Valor Débito */}
                          <td className='py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-xs text-rose-400 tabular-nums'>
                            - {formatCurrency(entry.amount)}
                          </td>

                          {/* Coluna 6: Status / Destinação */}
                          <td className='py-2.5 px-3 text-center whitespace-nowrap'>
                            {state.saved ? (
                              <div className='flex flex-col items-center gap-0.5'>
                                {selectedBill ? (
                                  <Badge variant='outline' className='h-5 py-0 px-2 bg-teal-500/10 text-teal-300 border-teal-500/30 text-[10px] font-semibold'>
                                    <Receipt size={10} className='mr-1' />
                                    Conta: {selectedBill.recipient_name || selectedBill.title}
                                  </Badge>
                                ) : (
                                  <Badge variant='outline' className='h-5 py-0 px-2 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold'>
                                    <CheckCircle2 size={10} className='mr-1' />
                                    {state.category}
                                  </Badge>
                                )}
                                <span className='text-[10px] font-mono text-zinc-400'>
                                  {state.selectedBillId ? '🔗 Vinculado a Conta' : (state.adicionaNoContas ? '📈 +Contas a Pagar' : '🚫 Apenas Conciliar')}
                                </span>
                              </div>
                            ) : (
                              <Badge variant='outline' className='h-5 py-0 px-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold'>
                                <HelpCircle size={10} className='mr-1' />
                                Débito Pendente
                              </Badge>
                            )}
                          </td>

                          {/* Coluna 7: Ações */}
                          <td className='py-2.5 px-3 text-center whitespace-nowrap'>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => setEditingId(isExpanded ? null : entry.id)}
                              className={`text-[11px] h-7 px-2.5 rounded-lg font-medium transition-all gap-1 cursor-pointer ${
                                isExpanded
                                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                                  : state.saved
                                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20'
                              }`}
                            >
                              <FileEdit size={12} />
                              <span>{isExpanded ? 'Fechar' : state.saved ? 'Alterar' : 'Classificar'}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </Button>
                          </td>
                        </tr>

                        {/* Gaveta Expansível Inline (Accordion Row) */}
                        {isExpanded && (
                          <tr className='bg-zinc-900/90 border-t border-b border-zinc-700'>
                            <td colSpan={7} className='p-4'>
                              <div className='bg-zinc-950/70 p-4 rounded-xl border border-zinc-800 space-y-4'>
                                <div className='flex items-center justify-between pb-2 border-b border-zinc-800'>
                                  <span className='text-xs font-bold text-zinc-200 flex items-center gap-1.5'>
                                    <FileEdit size={13} className='text-rose-400' />
                                    Destinação Contábil do Débito ({entry.storeName} — {formatCurrency(entry.amount)})
                                  </span>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className='text-zinc-500 hover:text-zinc-300 p-1 rounded-md'
                                    title='Fechar gaveta'
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {/* Categorias Rápidas */}
                                <div>
                                  <label className='text-xs text-zinc-400 block mb-2 font-bold'>
                                    1. Selecione a Categoria do Débito:
                                  </label>
                                  <div className='flex flex-wrap gap-1.5'>
                                    {QUICK_OUTFLOW_CATEGORIES.map(cat => (
                                      <button
                                        key={cat.id}
                                        type='button'
                                        onClick={() => updateOutflowState(entry.id, { 
                                          category: cat.label, 
                                          adicionaNoContas: cat.defaultImpact,
                                          selectedBillId: null 
                                        }, entry)}
                                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                          state.category === cat.label && !state.selectedBillId
                                            ? `${cat.color} font-bold ring-1 ring-white/20 shadow-sm`
                                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                        }`}
                                      >
                                        {cat.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Vínculo Direto a Contas Existentes */}
                                {storeOpenBills.length > 0 && (
                                  <div>
                                    <label className='text-xs text-zinc-400 block mb-1.5 font-bold flex items-center gap-1'>
                                      <Link2 size={12} className='text-cyan-400' />
                                      Ou Vincular a uma Conta em Aberto da Loja ({storeOpenBills.length} disponíveis):
                                    </label>
                                    <select
                                      value={state.selectedBillId || ''}
                                      onChange={e => {
                                        const bId = e.target.value || null;
                                        if (bId) {
                                          const bill = storeOpenBills.find((b: any) => b.id === bId);
                                          updateOutflowState(entry.id, {
                                            selectedBillId: bId,
                                            category: bill?.category || state.category,
                                            adicionaNoContas: false
                                          }, entry);
                                        } else {
                                          updateOutflowState(entry.id, { selectedBillId: null }, entry);
                                        }
                                      }}
                                      className='w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:ring-1 focus:ring-emerald-500'
                                    >
                                      <option value=''>-- Não vincular (Criar Despesa Extra ou Apenas Justificar) --</option>
                                      {storeOpenBills.map((b: any) => (
                                        <option key={b.id} value={b.id}>
                                          {b.recipient_name || b.title} - R$ {Number(b.amount).toFixed(2)} ({b.category || 'Geral'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Toggle Contábil: Adicionar ao Contas a Pagar */}
                                {!state.selectedBillId && (
                                  <div className='flex items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800'>
                                    <div>
                                      <span className='text-xs font-bold text-zinc-100 block'>
                                        Adicionar ao Contas a Pagar (Despesa Extra)?
                                      </span>
                                      <span className='text-[11px] text-zinc-400 mt-0.5 block'>
                                        {state.adicionaNoContas
                                          ? '📈 Sim, somará ao Subtotal de Contas a Pagar no fechamento diário.'
                                          : '🚫 Não, apenas justifica o débito (ex: transferência entre lojas, sangria, tarifa bancária).'}
                                      </span>
                                    </div>
                                    <button
                                      type='button'
                                      onClick={() => updateOutflowState(entry.id, { adicionaNoContas: !state.adicionaNoContas }, entry)}
                                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                        state.adicionaNoContas ? 'bg-emerald-500' : 'bg-zinc-700'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                          state.adicionaNoContas ? 'translate-x-4' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                )}

                                {/* Observação / Justificativa */}
                                <div>
                                  <label className='text-xs text-zinc-400 block mb-1 font-bold'>
                                    Observação / Justificativa (Opcional):
                                  </label>
                                  <input
                                    type='text'
                                    value={state.observacao}
                                    onChange={e => updateOutflowState(entry.id, { observacao: e.target.value }, entry)}
                                    placeholder='Ex: Pagamento referente ao frete de emergência...'
                                    className='w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700'
                                  />
                                </div>

                                {/* Botões de Ação da Linha */}
                                <div className='flex items-center justify-end gap-2 pt-2 border-t border-zinc-800'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setEditingId(null)}
                                    className='text-xs h-8 px-3 rounded-lg border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size='sm'
                                    onClick={() => handleSaveOutflow(entry)}
                                    disabled={state.saving}
                                    className='bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold text-xs px-4 h-8 flex items-center gap-1.5 rounded-lg cursor-pointer shadow-sm'
                                  >
                                    {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                                    Salvar Destinação
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Content: TAB INFLOWS */}
      {activeTab === 'inflows' && (
        <Card className='p-0 overflow-hidden border-zinc-800 bg-zinc-950'>
          {filteredInflows.length === 0 ? (
            <div className='p-12 text-center text-zinc-500 flex flex-col items-center'>
              <CheckCircle2 size={36} className='text-emerald-400/60 mb-3' />
              <p className='text-sm font-bold text-zinc-200'>Nenhuma entrada encontrada para os filtros aplicados.</p>
              <p className='text-xs text-zinc-500 mt-1 max-w-md'>
                {nonRevenueInflowEntries.length === 0 
                  ? 'Todas as entradas bancárias foram vinculadas a Ordens de Serviço ou faturamento do dia.' 
                  : 'Tente limpar a busca ou os filtros de loja e status.'}
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono'>
                    <th className='text-left py-2.5 px-3 font-medium'>Filial</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Data</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Descrição / Histórico Bancário</th>
                    <th className='text-left py-2.5 px-3 font-medium'>Favorecido / Documento / FITID</th>
                    <th className='text-right py-2.5 px-3 font-medium'>Valor</th>
                    <th className='text-center py-2.5 px-3 font-medium'>Status / Destinação</th>
                    <th className='text-center py-2.5 px-3 font-medium'>Ações</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-zinc-800/60 font-sans'>
                  {filteredInflows.map(entry => {
                    const state = getInflowState(entry);
                    const isExpanded = editingId === entry.id;

                    return (
                      <React.Fragment key={entry.id}>
                        {/* Linha Principal da Tabela */}
                        <tr className={`hover:bg-zinc-900/40 transition-colors ${isExpanded ? 'bg-zinc-900/60' : ''}`}>
                          {/* Coluna 1: Filial */}
                          <td className='py-2.5 px-3 whitespace-nowrap'>
                            <Badge variant='outline' className='bg-zinc-800 text-zinc-200 border-zinc-700 text-[11px] font-bold font-mono px-2 py-0.5'>
                              {entry.storeName}
                            </Badge>
                          </td>

                          {/* Coluna 2: Data */}
                          <td className='py-2.5 px-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]'>
                            <div className='flex items-center gap-1.5'>
                              <Calendar size={12} className='text-zinc-500' />
                              <span>{formatDateOnly(entry.date)}</span>
                            </div>
                          </td>

                          {/* Coluna 3: Descrição Bancária */}
                          <td className='py-2.5 px-3 font-medium text-zinc-200 max-w-[280px]'>
                            <div className='flex flex-col'>
                              <span className='truncate text-xs font-semibold' title={entry.description}>
                                {entry.description}
                              </span>
                              {entry.subtitle && (
                                <span className='text-[10px] text-zinc-400 truncate'>
                                  {entry.subtitle}
                                </span>
                              )}
                              {state.observacao && (
                                <span className='text-[10px] text-emerald-400 italic truncate'>
                                  "{state.observacao}"
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Coluna 4: Favorecido / FITID */}
                          <td className='py-2.5 px-3 text-zinc-400 font-mono text-[11px] max-w-[200px] truncate'>
                            <span title={entry.counterpartName || entry.fitid || entry.bankName || '—'}>
                              {entry.counterpartName || entry.fitid || entry.bankName || '—'}
                            </span>
                          </td>

                          {/* Coluna 5: Valor Crédito */}
                          <td className='py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-xs text-emerald-400 tabular-nums'>
                            + {formatCurrency(entry.amount)}
                          </td>

                          {/* Coluna 6: Status / Destinação */}
                          <td className='py-2.5 px-3 text-center whitespace-nowrap'>
                            {state.saved ? (
                              <div className='flex flex-col items-center gap-0.5'>
                                <Badge variant='outline' className='h-5 py-0 px-2 bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold'>
                                  <CheckCircle2 size={10} className='mr-1' />
                                  {state.category}
                                </Badge>
                                <span className='text-[10px] font-mono text-zinc-400'>
                                  {state.impactsRevenue ? '📈 +Faturamento' : '🚫 Apenas Conciliar'}
                                </span>
                              </div>
                            ) : (
                              <Badge variant='outline' className='h-5 py-0 px-2 bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold'>
                                <HelpCircle size={10} className='mr-1' />
                                Entrada Pendente
                              </Badge>
                            )}
                          </td>

                          {/* Coluna 7: Ações */}
                          <td className='py-2.5 px-3 text-center whitespace-nowrap'>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => setEditingId(isExpanded ? null : entry.id)}
                              className={`text-[11px] h-7 px-2.5 rounded-lg font-medium transition-all gap-1 cursor-pointer ${
                                isExpanded
                                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                                  : state.saved
                                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                            >
                              <FileEdit size={12} />
                              <span>{isExpanded ? 'Fechar' : state.saved ? 'Alterar' : 'Classificar'}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </Button>
                          </td>
                        </tr>

                        {/* Gaveta Expansível Inline (Accordion Row) */}
                        {isExpanded && (
                          <tr className='bg-zinc-900/90 border-t border-b border-zinc-700'>
                            <td colSpan={7} className='p-4'>
                              <div className='bg-zinc-950/70 p-4 rounded-xl border border-zinc-800 space-y-4'>
                                <div className='flex items-center justify-between pb-2 border-b border-zinc-800'>
                                  <span className='text-xs font-bold text-zinc-200 flex items-center gap-1.5'>
                                    <FileEdit size={13} className='text-emerald-400' />
                                    Destinação Contábil do Crédito ({entry.storeName} — {formatCurrency(entry.amount)})
                                  </span>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className='text-zinc-500 hover:text-zinc-300 p-1 rounded-md'
                                    title='Fechar gaveta'
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                {/* Categorias Rápidas */}
                                <div>
                                  <label className='text-xs text-zinc-400 block mb-2 font-bold'>
                                    1. Selecione o Tipo de Entrada:
                                  </label>
                                  <div className='flex flex-wrap gap-1.5'>
                                    {QUICK_INFLOW_CATEGORIES.map(cat => (
                                      <button
                                        key={cat.id}
                                        type='button'
                                        onClick={() => updateInflowState(entry.id, { 
                                          category: cat.label, 
                                          impactsRevenue: cat.defaultImpact 
                                        }, entry)}
                                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                          state.category === cat.label
                                            ? `${cat.color} font-bold ring-1 ring-white/20 shadow-sm`
                                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                        }`}
                                      >
                                        {cat.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Toggle Contábil: Entra no Faturamento */}
                                <div className='flex items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800'>
                                  <div>
                                    <span className='text-xs font-bold text-zinc-100 block'>
                                      Entra no Faturamento do Dia?
                                    </span>
                                    <span className='text-[11px] text-zinc-400 mt-0.5 block'>
                                      {state.impactsRevenue
                                        ? '📈 Sim, somará ao Faturamento Apurado no fechamento diário.'
                                        : '🚫 Não, apenas justifica a entrada (ex: transferência entre lojas, aporte, estorno).'}
                                    </span>
                                  </div>
                                  <button
                                    type='button'
                                    onClick={() => updateInflowState(entry.id, { impactsRevenue: !state.impactsRevenue }, entry)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                      state.impactsRevenue ? 'bg-emerald-500' : 'bg-zinc-700'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        state.impactsRevenue ? 'translate-x-4' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>

                                {/* Observação / Justificativa */}
                                <div>
                                  <label className='text-xs text-zinc-400 block mb-1 font-bold'>
                                    Observação / Justificativa (Opcional):
                                  </label>
                                  <input
                                    type='text'
                                    value={state.observacao}
                                    onChange={e => updateInflowState(entry.id, { observacao: e.target.value }, entry)}
                                    placeholder='Ex: TED de aporte ou venda avulsa de sucata...'
                                    className='w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700'
                                  />
                                </div>

                                {/* Botões de Ação da Linha */}
                                <div className='flex items-center justify-end gap-2 pt-2 border-t border-zinc-800'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setEditingId(null)}
                                    className='text-xs h-8 px-3 rounded-lg border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size='sm'
                                    onClick={() => handleSaveInflow(entry)}
                                    disabled={state.saving}
                                    className='bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-4 h-8 flex items-center gap-1.5 rounded-lg cursor-pointer shadow-sm'
                                  >
                                    {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                                    Salvar Entrada
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Bottom Actions */}
      <div className='flex items-center justify-between pt-4 border-t border-zinc-800'>
        <Button
          variant='outline'
          onClick={onBack}
          className='py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2'
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>

        <Button
          onClick={onNext}
          className='py-2.5 px-6 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all'
        >
          Avançar para Conferência de Cofre
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
