import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
  RefreshCw
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
  matchedBillId?: string;
  matchedOsNumber?: string;
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

export function Step2NonRevenueJustifications({
  results,
  mapping,
  targetDate,
  stores,
  onNext,
  onBack,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inflows' | 'outflows'>('outflows');

  // 1. Débitos bancários do OFX pendentes de casamento (Saídas Órfãs Reais do Banco)
  const { data: dbOutflows = [], isLoading: isLoadingOutflows, isFetched: isFetchedOutflows, refetch: refetchOutflows } = useQuery({
    queryKey: ['pending-ofx-outflows', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, title, matched_bill_id, match_status, manual_category, manual_justification, target_date, contabilizar_no_subtotal')
        .or(`target_date.eq.${targetDate},occurred_at.gte.${targetDate}T00:00:00,occurred_at.lte.${targetDate}T23:59:59`)
        .eq('type', 'out')
        .is('matched_bill_id', null);
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Entradas bancárias do OFX sem vínculo com OS (Entradas Órfãs Reais do Banco)
  const { data: dbInflows = [], isLoading: isLoadingInflows, isFetched: isFetchedInflows, refetch: refetchInflows } = useQuery({
    queryKey: ['pending-ofx-inflows', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, title, matched_os_number, match_status, manual_category, manual_justification, target_date')
        .or(`target_date.eq.${targetDate},occurred_at.gte.${targetDate}T00:00:00,occurred_at.lte.${targetDate}T23:59:59`)
        .eq('type', 'in')
        .is('matched_os_number', null);
      if (error) throw error;
      return data || [];
    }
  });

  const nonRevenueInflowEntries = useMemo<OFXEntry[]>(() => {
    // 1. Se houver dados no banco, usa os dados do banco (filtrando os que estão com matched_os_number nulo)
    if (dbInflows && dbInflows.length > 0) {
      return dbInflows
        .filter((tx: any) => {
          const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''} ${tx.bank_name || ''}`.trim();
          if (EXCLUDE_ACQUIRER_REGEX.test(fullDesc)) return false;
          if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return false;
          if (/saldo\s+anterior|saldo\s+total/i.test(fullDesc)) return false;
          return true;
        })
        .map((tx: any) => {
          const storeObj = stores.find(s => s.id === tx.store_id);
          const storeName = storeObj?.name || tx.store_id || 'Loja';
          return {
            id: tx.id,
            storeId: tx.store_id || '',
            storeName,
            amount: Math.abs(Number(tx.amount || 0)),
            description: tx.counterpart_name || tx.title || tx.bank_name || 'Movimentação Bancária',
            date: tx.target_date || (tx.occurred_at ? String(tx.occurred_at).slice(0, 10) : targetDate),
            fitid: tx.fitid || '',
            type: 'in' as const,
            matchedOsNumber: tx.matched_os_number || undefined,
          };
        });
    }

    // 2. Se o banco retornou vazio (modo preview / antes de salvar no banco), filtra os créditos não casados da memória
    const entries: OFXEntry[] = [];
    results.ofxResults?.forEach((ofxResult: any) => {
      const storeId = mapping[ofxResult.alias] || '';
      const storeObj = stores.find(s => s.id === storeId);
      const storeName = storeObj?.name || ofxResult.alias || 'Loja';

      (ofxResult.transactions || []).forEach((tx: any) => {
        if (tx.type !== 'in' && Number(tx.amount || 0) <= 0) return;
        if (tx.matched_os_number || tx.matchedOsNumber || tx.match_status === 'matched') return;

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
            description: tx.counterpart_name || tx.title || 'Movimentação Bancária',
            date: tx.date || targetDate,
            fitid: tx.fitid || '',
            type: 'in',
          });
        }
      });
    });
    return entries;
  }, [dbInflows, results.ofxResults, mapping, stores, targetDate]);

  const nonRevenueOutflowEntries = useMemo<OFXEntry[]>(() => {
    // 1. Se houver dados no banco, usa os dados do banco (filtrando os que estão com matched_bill_id nulo)
    if (dbOutflows && dbOutflows.length > 0) {
      return dbOutflows
        .filter((tx: any) => {
          const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''} ${tx.bank_name || ''}`.trim();
          if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return false;
          if (/saldo\s+anterior|saldo\s+total/i.test(fullDesc)) return false;
          return true;
        })
        .map((tx: any) => {
          const storeObj = stores.find(s => s.id === tx.store_id);
          const storeName = storeObj?.name || tx.store_id || 'Loja';
          return {
            id: tx.id,
            storeId: tx.store_id || '',
            storeName,
            amount: Math.abs(Number(tx.amount || 0)),
            description: tx.counterpart_name || tx.title || tx.bank_name || 'Débito Bancário',
            date: tx.target_date || (tx.occurred_at ? String(tx.occurred_at).slice(0, 10) : targetDate),
            fitid: tx.fitid || '',
            type: 'out' as const,
            matchedBillId: tx.matched_bill_id || undefined,
          };
        });
    }

    // 2. Se o banco retornou vazio (modo preview / antes de salvar no banco), calcula via motor de matching em memória
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

  const [inflowStates, setInflowStates] = useState<Record<string, InflowItemState>>({});
  const [outflowStates, setOutflowStates] = useState<Record<string, OutflowItemState>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const getInflowState = (id: string, desc = ''): InflowItemState => {
    if (inflowStates[id]) return inflowStates[id];
    const inferred = inferInflowCategory(desc);
    return {
      category: inferred.category,
      impactsRevenue: inferred.impactsRevenue,
      observacao: '',
      saved: false,
      saving: false,
      cancelled: false,
    };
  };

  const updateInflowState = (id: string, partial: Partial<InflowItemState>, desc = '') => {
    setInflowStates(prev => ({
      ...prev,
      [id]: { ...getInflowState(id, desc), ...partial },
    }));
  };

  const getOutflowState = (id: string, desc = ''): OutflowItemState => {
    if (outflowStates[id]) return outflowStates[id];
    const inferred = inferOutflowCategory(desc);
    return {
      category: inferred.category,
      adicionaNoContas: inferred.adicionaNoContas,
      selectedBillId: null,
      observacao: '',
      saved: false,
      saving: false,
      cancelled: false,
    };
  };

  const updateOutflowState = (id: string, partial: Partial<OutflowItemState>, desc = '') => {
    setOutflowStates(prev => ({
      ...prev,
      [id]: { ...getOutflowState(id, desc), ...partial },
    }));
  };

  const handleSaveInflow = async (entry: OFXEntry) => {
    const state = getInflowState(entry.id, entry.description);
    updateInflowState(entry.id, { saving: true }, entry.description);
    try {
      const cleanCategory = state.category.replace(/\s*\[Apenas Conciliar\]/gi, '').trim();
      const finalCategory = state.impactsRevenue ? cleanCategory : `${cleanCategory} [Apenas Conciliar]`;
      const cleanJustification = state.observacao.replace(/\s*\[NÃO SOMAR\]/gi, '').trim();
      const finalJustification = state.impactsRevenue ? cleanJustification : `${cleanJustification} [NÃO SOMAR]`.trim();

      const { error: ofxErr } = await supabase
        .from('ofx_transactions')
        .update({
          manual_category: finalCategory,
          manual_justification: finalJustification,
          match_status: state.impactsRevenue ? 'REVENUE_ADJUSTED' : 'JUSTIFIED',
        })
        .eq('id', entry.id);

      if (ofxErr) throw ofxErr;

      updateInflowState(entry.id, { saving: false, saved: true }, entry.description);
      setEditingId(null);
      refetchInflows();
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      toast.success(`Justificativa salva! (${state.impactsRevenue ? '📈 Soma ao Faturamento' : '🚫 Apenas Conciliar'})`);
    } catch (err: any) {
      updateInflowState(entry.id, { saving: false }, entry.description);
      toast.error(`Erro ao salvar entrada: ${err.message}`);
    }
  };

  const handleSaveOutflow = async (entry: OFXEntry) => {
    const state = getOutflowState(entry.id, entry.description);
    updateOutflowState(entry.id, { saving: true }, entry.description);
    try {
      const { data, error } = await supabase.rpc('resolve_orphan_saida_ofx', {
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

      updateOutflowState(entry.id, { saving: false, saved: true }, entry.description);
      setEditingId(null);
      refetchOutflows();
      queryClient.invalidateQueries({ queryKey: ['open-bills-for-step2'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills'] });

      if (state.selectedBillId) {
        toast.success('Débito vinculado à conta existente com sucesso!');
      } else if (state.adicionaNoContas) {
        toast.success('Despesa Extra adicionada ao Contas a Pagar com sucesso!');
      } else {
        toast.success('Saída justificada sem impacto no Contas a Pagar.');
      }
    } catch (err: any) {
      updateOutflowState(entry.id, { saving: false }, entry.description);
      toast.error(`Erro ao resolver saída: ${err.message}`);
    }
  };

  const handleRefresh = () => {
    refetchOutflows();
    refetchInflows();
    toast.info('Atualizando transações pendentes do banco...');
  };

  const visibleInflows = nonRevenueInflowEntries.filter(e => !getInflowState(e.id, e.description).cancelled);
  const savedInflowCount = nonRevenueInflowEntries.filter(e => getInflowState(e.id, e.description).saved).length;

  const visibleOutflows = nonRevenueOutflowEntries.filter(e => !getOutflowState(e.id, e.description).cancelled);
  const savedOutflowCount = nonRevenueOutflowEntries.filter(e => getOutflowState(e.id, e.description).saved).length;

  return (
    <div className='space-y-6'>
      {/* Header */}
      <Card className='p-5 bg-zinc-900 border-zinc-800'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-display font-bold text-white flex items-center gap-2'>
              <FileQuestion className='text-amber-400' size={20} />
              Passo 5: Justificativas de Movimentações por Loja
            </h2>
            <p className='text-sm text-zinc-400 mt-1'>
              Classifique entradas e saídas bancárias que não foram casadas automaticamente. Defina se somam ao Faturamento (Entradas), se viram Despesa Extra no Contas a Pagar (Saídas) ou se são apenas transferências internas.
            </p>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              className='bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700'
            >
              <RefreshCw size={14} className={(isLoadingOutflows || isLoadingInflows) ? 'animate-spin' : ''} />
              Atualizar
            </Button>
            <Badge variant='outline' className='bg-zinc-800 border-zinc-700 text-zinc-300 text-xs px-3 py-1.5'>
              {activeTab === 'inflows' ? (
                <span>{savedInflowCount} de {visibleInflows.length} entradas justificadas</span>
              ) : (
                <span>{savedOutflowCount} de {visibleOutflows.length} saídas tratadas</span>
              )}
            </Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='flex border-b border-zinc-800 mt-5'>
          <button
            onClick={() => setActiveTab('outflows')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'outflows'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <TrendingDown size={16} className='text-rose-400' />
            <span>Saídas Órfãs ({visibleOutflows.length})</span>
            {savedOutflowCount === visibleOutflows.length && visibleOutflows.length > 0 && (
              <Check size={14} className='text-emerald-400' />
            )}
          </button>

          <button
            onClick={() => setActiveTab('inflows')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'inflows'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <TrendingUp size={16} className='text-emerald-400' />
            <span>Entradas Órfãs ({visibleInflows.length})</span>
            {savedInflowCount === visibleInflows.length && visibleInflows.length > 0 && (
              <Check size={14} className='text-emerald-400' />
            )}
          </button>
        </div>
      </Card>

      {/* Loading state */}
      {(isLoadingOutflows || isLoadingInflows) && (
        <Card className='p-6 bg-zinc-950/80 border-zinc-800 flex items-center justify-center gap-3 text-zinc-400'>
          <Loader2 className='animate-spin text-emerald-400' size={20} />
          <span>Sincronizando movimentações pendentes com o banco...</span>
        </Card>
      )}

      {/* Content: TAB OUTFLOWS */}
      {activeTab === 'outflows' && (
        <div className='space-y-4'>
          {visibleOutflows.length === 0 ? (
            <Card className='p-8 bg-zinc-950/40 border-zinc-800 text-center'>
              <CheckCircle2 size={40} className='text-emerald-400 mx-auto mb-3' />
              <p className='text-base font-semibold text-white'>Nenhuma Saída Bancária Órfã!</p>
              <p className='text-sm text-zinc-400 mt-1 max-w-md mx-auto'>
                Todos os débitos bancários do extrato OFX foram pareados automaticamente com o Contas a Pagar pelo motor de matching.
              </p>
            </Card>
          ) : (
            visibleOutflows.map(entry => {
              const state = getOutflowState(entry.id, entry.description);
              const isEditing = editingId === entry.id || !state.saved;
              const storeOpenBills = openBills.filter((b: any) => !entry.storeId || !b.store_id || b.store_id === entry.storeId);

              return (
                <Card
                  key={entry.id}
                  className={`p-4 transition-all ${
                    state.saved
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-80'
                      : 'bg-zinc-900 border-zinc-700/80 shadow-lg'
                  }`}
                >
                  <div className='flex flex-col gap-3'>
                    {/* Linha superior: Dados do débito OFX */}
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <Badge variant='outline' className='bg-zinc-800 text-zinc-300 text-xs'>
                            {entry.storeName}
                          </Badge>
                          <span className='text-xs text-zinc-400 font-mono'>
                            {entry.date ? `(${entry.date})` : ''}
                          </span>
                          {state.saved && (
                            <Badge className='bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1'>
                              <Check size={12} /> Salvo
                            </Badge>
                          )}
                        </div>
                        <p className='text-sm font-semibold text-zinc-200 mt-1 truncate'>
                          {entry.description}
                        </p>
                      </div>

                      <div className='text-right shrink-0'>
                        <span className='text-xs text-zinc-400 block'>Débito OFX</span>
                        <span className='text-base font-mono font-bold text-rose-400'>
                          -R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Linha de Ação: Selecionar Categoria e Destino Contábil */}
                    {isEditing ? (
                      <div className='mt-2 pt-3 border-t border-zinc-800/80 space-y-3'>
                        {/* Categorias Rápidas */}
                        <div>
                          <label className='text-xs text-zinc-400 block mb-1.5 font-medium'>
                            1. Selecione a Categoria da Saída:
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
                                }, entry.description)}
                                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                                  state.category === cat.label
                                    ? `${cat.color} font-semibold ring-1 ring-white/20`
                                    : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
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
                            <label className='text-xs text-zinc-400 block mb-1.5 font-medium flex items-center gap-1'>
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
                                    adicionaNoContas: false // Já existe na base, só vincula
                                  }, entry.description);
                                } else {
                                  updateOutflowState(entry.id, { selectedBillId: null }, entry.description);
                                }
                              }}
                              className='w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-200 focus:ring-1 focus:ring-cyan-500'
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
                          <div className='flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-md border border-zinc-800'>
                            <div>
                              <span className='text-xs font-medium text-zinc-200 block'>
                                Adicionar ao Contas a Pagar (Despesa Extra)?
                              </span>
                              <span className='text-[11px] text-zinc-400'>
                                {state.adicionaNoContas
                                  ? '📈 Sim, somará ao Subtotal de Contas a Pagar no fechamento diário.'
                                  : '🚫 Não, apenas justifica o débito (ex: transferência entre lojas, sangria, tarifa).'}
                              </span>
                            </div>
                            <button
                              type='button'
                              onClick={() => updateOutflowState(entry.id, { adicionaNoContas: !state.adicionaNoContas }, entry.description)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                state.adicionaNoContas ? 'bg-emerald-600' : 'bg-zinc-700'
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

                        {/* Botão de Salvar Linha */}
                        <div className='flex items-center justify-end gap-2 pt-1'>
                          <Button
                            size='sm'
                            onClick={() => handleSaveOutflow(entry)}
                            disabled={state.saving}
                            className='bg-rose-600 hover:bg-rose-500 text-white text-xs px-4 h-8 flex items-center gap-1.5'
                          >
                            {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                            Salvar Destinação
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className='flex items-center justify-between pt-2 border-t border-zinc-800/40'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className='text-xs bg-zinc-800/40 text-zinc-300'>
                            {state.category}
                          </Badge>
                          <span className='text-xs text-zinc-400'>
                            {state.selectedBillId ? '🔗 Vinculado a Conta Aberta' : (state.adicionaNoContas ? '📈 Soma no Contas a Pagar' : '🚫 Apenas Conciliar')}
                          </span>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs text-zinc-400 hover:text-white h-7 px-2'
                        >
                          Alterar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Content: TAB INFLOWS */}
      {activeTab === 'inflows' && (
        <div className='space-y-4'>
          {visibleInflows.length === 0 ? (
            <Card className='p-8 bg-zinc-950/40 border-zinc-800 text-center'>
              <CheckCircle2 size={40} className='text-emerald-400 mx-auto mb-3' />
              <p className='text-base font-semibold text-white'>Nenhuma Entrada Órfã!</p>
              <p className='text-sm text-zinc-400 mt-1 max-w-md mx-auto'>
                Todas as entradas bancárias do OFX foram vinculadas a Ordens de Serviço ou faturamento do dia.
              </p>
            </Card>
          ) : (
            visibleInflows.map(entry => {
              const state = getInflowState(entry.id, entry.description);
              const isEditing = editingId === entry.id || !state.saved;

              return (
                <Card
                  key={entry.id}
                  className={`p-4 transition-all ${
                    state.saved
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-80'
                      : 'bg-zinc-900 border-zinc-700/80 shadow-lg'
                  }`}
                >
                  <div className='flex flex-col gap-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <Badge variant='outline' className='bg-zinc-800 text-zinc-300 text-xs'>
                            {entry.storeName}
                          </Badge>
                          <span className='text-xs text-zinc-400 font-mono'>
                            {entry.date ? `(${entry.date})` : ''}
                          </span>
                          {state.saved && (
                            <Badge className='bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1'>
                              <Check size={12} /> Salvo
                            </Badge>
                          )}
                        </div>
                        <p className='text-sm font-semibold text-zinc-200 mt-1 truncate'>
                          {entry.description}
                        </p>
                      </div>

                      <div className='text-right shrink-0'>
                        <span className='text-xs text-zinc-400 block'>Crédito OFX</span>
                        <span className='text-base font-mono font-bold text-emerald-400'>
                          +R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className='mt-2 pt-3 border-t border-zinc-800/80 space-y-3'>
                        <div>
                          <label className='text-xs text-zinc-400 block mb-1.5 font-medium'>
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
                                }, entry.description)}
                                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                                  state.category === cat.label
                                    ? `${cat.color} font-semibold ring-1 ring-white/20`
                                    : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className='flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-md border border-zinc-800'>
                          <div>
                            <span className='text-xs font-medium text-zinc-200 block'>
                              Entra no Faturamento do Dia?
                            </span>
                            <span className='text-[11px] text-zinc-400'>
                              {state.impactsRevenue
                                ? '📈 Sim, somará ao Faturamento Apurado no fechamento diário.'
                                : '🚫 Não, apenas justifica a entrada (ex: transferência entre lojas, aporte, estorno).'}
                            </span>
                          </div>
                          <button
                            type='button'
                            onClick={() => updateInflowState(entry.id, { impactsRevenue: !state.impactsRevenue }, entry.description)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              state.impactsRevenue ? 'bg-emerald-600' : 'bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                state.impactsRevenue ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className='flex items-center justify-end gap-2 pt-1'>
                          <Button
                            size='sm'
                            onClick={() => handleSaveInflow(entry)}
                            disabled={state.saving}
                            className='bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 h-8 flex items-center gap-1.5'
                          >
                            {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                            Salvar Entrada
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className='flex items-center justify-between pt-2 border-t border-zinc-800/40'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className='text-xs bg-zinc-800/40 text-zinc-300'>
                            {state.category}
                          </Badge>
                          <span className='text-xs text-zinc-400'>
                            {state.impactsRevenue ? '📈 Soma no Faturamento' : '🚫 Apenas Conciliar'}
                          </span>
                        </div>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs text-zinc-400 hover:text-white h-7 px-2'
                        >
                          Alterar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className='flex items-center justify-between pt-4 border-t border-zinc-800'>
        <Button
          variant='outline'
          onClick={onBack}
          className='bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
        >
          <ArrowLeft size={16} className='mr-2' />
          Voltar
        </Button>

        <Button
          onClick={onNext}
          className='bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-semibold shadow-lg'
        >
          Avançar para Conferência de Cofre
          <ArrowRight size={16} className='ml-2' />
        </Button>
      </div>
    </div>
  );
}
