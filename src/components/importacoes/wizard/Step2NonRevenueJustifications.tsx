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
  Link2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  const [activeTab, setActiveTab] = useState<'inflows' | 'outflows'>('inflows');

  const nonRevenueInflowEntries = useMemo<OFXEntry[]>(() => {
    const entries: OFXEntry[] = [];
    results.ofxResults?.forEach((ofxResult: any) => {
      const storeId = mapping[ofxResult.alias] || '';
      const storeObj = stores.find(s => s.id === storeId);
      const storeName = storeObj?.name || ofxResult.alias || 'Loja';

      (ofxResult.transactions || []).forEach((tx: any) => {
        if (tx.type !== 'in') return;
        const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();

        if (EXCLUDE_ACQUIRER_REGEX.test(fullDesc)) return;
        if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return;
        if (tx.matched_os_number) return;

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
  }, [results, mapping, stores, targetDate]);

  const nonRevenueOutflowEntries = useMemo<OFXEntry[]>(() => {
    const entries: OFXEntry[] = [];
    results.ofxResults?.forEach((ofxResult: any) => {
      const storeId = mapping[ofxResult.alias] || '';
      const storeObj = stores.find(s => s.id === storeId);
      const storeName = storeObj?.name || ofxResult.alias || 'Loja';

      (ofxResult.transactions || []).forEach((tx: any) => {
        if (tx.type !== 'out') return;
        if (tx.matched_bill_id) return;

        const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();
        if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return;

        entries.push({
          id: tx.id || tx.fitid || `${ofxResult.alias}_${tx.amount}_${Math.random()}`,
          storeId,
          storeName,
          amount: Math.abs(Number(tx.amount || 0)),
          description: tx.counterpart_name || tx.title || 'Débito Bancário',
          date: tx.date || targetDate,
          fitid: tx.fitid || '',
          type: 'out',
        });
      });
    });
    return entries;
  }, [results, mapping, stores, targetDate]);

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
        .or(`id.eq.${entry.id},fitid.eq.${entry.fitid}`);

      if (ofxErr) throw ofxErr;

      updateInflowState(entry.id, { saving: false, saved: true }, entry.description);
      setEditingId(null);
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
            <p className='text-xs text-zinc-400 mt-1 max-w-3xl'>
              Classifique entradas e saídas bancárias que não foram casadas automaticamente. Defina se somam ao Faturamento (Entradas), se viram Despesa Extra no Contas a Pagar (Saídas) ou se são apenas transferências internas.
            </p>
          </div>

          <div className='flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0'>
            <button
              onClick={() => setActiveTab('inflows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'inflows' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp size={14} className='text-emerald-400' />
              Entradas Órfãs ({visibleInflows.length})
              {savedInflowCount > 0 && <span className='text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono'>{savedInflowCount}</span>}
            </button>
            <button
              onClick={() => setActiveTab('outflows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'outflows' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingDown size={14} className='text-rose-400' />
              Saídas Órfãs ({visibleOutflows.length})
              {savedOutflowCount > 0 && <span className='text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-mono'>{savedOutflowCount}</span>}
            </button>
          </div>
        </div>
      </Card>

      {/* ABA 1: ENTRADAS ÓRFÃS */}
      {activeTab === 'inflows' && (
        <div className='space-y-4'>
          {visibleInflows.length === 0 ? (
            <Card className='p-12 text-center border-zinc-800 bg-zinc-900/40'>
              <CheckCircle2 size={40} className='mx-auto mb-3 text-emerald-500' />
              <p className='text-sm font-semibold text-zinc-200'>Nenhuma entrada bancária órfã para justificar!</p>
              <p className='text-xs text-zinc-500 mt-1'>Todas as entradas foram casadas com OSs ou são liquidações de cartão.</p>
            </Card>
          ) : (
            visibleInflows.map(entry => {
              const state = getInflowState(entry.id, entry.description);
              const isEditing = editingId === entry.id;

              return (
                <Card
                  key={entry.id}
                  className={`p-4 border transition-all ${
                    state.saved
                      ? 'bg-emerald-950/10 border-emerald-500/30'
                      : isEditing
                      ? 'bg-zinc-900 border-amber-500/50 shadow-lg shadow-amber-950/20'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                    <div className='flex items-start gap-3'>
                      <div className='p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5'>
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-sm text-zinc-100'>{entry.storeName}</span>
                          <span className='text-xs text-zinc-500 font-mono'>({entry.date})</span>
                          {state.saved && (
                            <Badge variant='brand' className='text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono'>
                              <Check size={10} className='mr-1 inline' /> Salvo
                            </Badge>
                          )}
                        </div>
                        <p className='text-xs text-zinc-300 mt-0.5 max-w-xl break-words font-sans'>{entry.description}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-4 shrink-0'>
                      <div className='text-right'>
                        <span className='text-[10px] text-zinc-500 uppercase block font-semibold'>Crédito OFX</span>
                        <span className='text-base font-bold font-mono text-emerald-400'>
                          +R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {!isEditing && !state.saved && (
                        <Button
                          size='sm'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold cursor-pointer'
                        >
                          Classificar
                        </Button>
                      )}
                      {state.saved && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs text-zinc-400 hover:text-white'
                        >
                          Alterar
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className='mt-4 pt-4 border-t border-zinc-800/80 space-y-4'>
                      <div>
                        <label className='block text-[11px] font-bold uppercase text-zinc-400 mb-2'>Selecione a Categoria da Entrada:</label>
                        <div className='flex flex-wrap gap-2'>
                          {QUICK_INFLOW_CATEGORIES.map(cat => {
                            const isSelected = state.category === cat.label;
                            return (
                              <button
                                key={cat.id}
                                type='button'
                                onClick={() => updateInflowState(entry.id, { category: cat.label, impactsRevenue: cat.defaultImpact }, entry.description)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  isSelected
                                    ? `${cat.color} ring-2 ring-emerald-400/40 font-bold`
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                                }`}
                              >
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className='flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800'>
                        <div>
                          <span className='text-xs font-bold text-zinc-200 block'>Entra no Faturamento do Dia?</span>
                          <span className='text-[11px] text-zinc-500'>
                            {state.impactsRevenue ? '📈 SIM: Será somado ao Faturamento do Fechamento' : '🚫 NÃO: É apenas movimentação/transferência interna'}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => updateInflowState(entry.id, { impactsRevenue: false }, entry.description)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !state.impactsRevenue ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            Apenas Conciliar
                          </button>
                          <button
                            type='button'
                            onClick={() => updateInflowState(entry.id, { impactsRevenue: true }, entry.description)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              state.impactsRevenue ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            + Faturamento
                          </button>
                        </div>
                      </div>

                      <div className='flex items-center justify-end gap-2 pt-2'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setEditingId(null)}
                          className='text-xs text-zinc-400 hover:text-white'
                        >
                          Cancelar
                        </Button>
                        <Button
                          size='sm'
                          disabled={state.saving}
                          onClick={() => handleSaveInflow(entry)}
                          className='text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer flex items-center gap-1'
                        >
                          {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                          Salvar Classificação
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ABA 2: SAÍDAS ÓRFÃS */}
      {activeTab === 'outflows' && (
        <div className='space-y-4'>
          {visibleOutflows.length === 0 ? (
            <Card className='p-12 text-center border-zinc-800 bg-zinc-900/40'>
              <CheckCircle2 size={40} className='mx-auto mb-3 text-emerald-500' />
              <p className='text-sm font-semibold text-zinc-200'>Nenhuma saída bancária órfã pendente!</p>
              <p className='text-xs text-zinc-500 mt-1'>Todos os débitos bancários foram casados com contas a pagar importadas.</p>
            </Card>
          ) : (
            visibleOutflows.map(entry => {
              const state = getOutflowState(entry.id, entry.description);
              const isEditing = editingId === entry.id;
              const storeOpenBills = openBills.filter((b: any) => !entry.storeId || !b.store_id || b.store_id === entry.storeId);

              return (
                <Card
                  key={entry.id}
                  className={`p-4 border transition-all ${
                    state.saved
                      ? 'bg-rose-950/10 border-rose-500/30'
                      : isEditing
                      ? 'bg-zinc-900 border-amber-500/50 shadow-lg shadow-amber-950/20'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                    <div className='flex items-start gap-3'>
                      <div className='p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5'>
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-sm text-zinc-100'>{entry.storeName}</span>
                          <span className='text-xs text-zinc-500 font-mono'>({entry.date})</span>
                          {state.saved && (
                            <Badge variant='brand' className='text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30 font-mono'>
                              <Check size={10} className='mr-1 inline' /> Salvo
                            </Badge>
                          )}
                        </div>
                        <p className='text-xs text-zinc-300 mt-0.5 max-w-xl break-words font-sans'>{entry.description}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-4 shrink-0'>
                      <div className='text-right'>
                        <span className='text-[10px] text-zinc-500 uppercase block font-semibold'>Débito OFX</span>
                        <span className='text-base font-bold font-mono text-rose-400'>
                          -R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {!isEditing && !state.saved && (
                        <Button
                          size='sm'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold cursor-pointer'
                        >
                          Destinar Débito
                        </Button>
                      )}
                      {state.saved && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setEditingId(entry.id)}
                          className='text-xs text-zinc-400 hover:text-white'
                        >
                          Alterar
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className='mt-4 pt-4 border-t border-zinc-800/80 space-y-4'>
                      {storeOpenBills.length > 0 && (
                        <div className='p-3 rounded-xl bg-zinc-950 border border-zinc-800'>
                          <label className='block text-[11px] font-bold uppercase text-zinc-400 mb-1 flex items-center gap-1'>
                            <Link2 size={12} className='text-cyan-400' />
                            Vincular a uma Conta Existente da Loja (1-Clique):
                          </label>
                          <select
                            value={state.selectedBillId || ''}
                            onChange={e => updateOutflowState(entry.id, { selectedBillId: e.target.value || null, adicionaNoContas: false }, entry.description)}
                            className='w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500'
                          >
                            <option value=''>-- Não vincular a conta existente (Criar Extra ou Apenas Justificar) --</option>
                            {storeOpenBills.map((b: any) => (
                              <option key={b.id} value={b.id}>
                                {b.title || b.recipient_name} — R$ {Number(b.amount).toFixed(2)} ({b.category || 'Despesa'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {!state.selectedBillId && (
                        <>
                          <div>
                            <label className='block text-[11px] font-bold uppercase text-zinc-400 mb-2'>Selecione a Categoria da Saída:</label>
                            <div className='flex flex-wrap gap-2'>
                              {QUICK_OUTFLOW_CATEGORIES.map(cat => {
                                const isSelected = state.category === cat.label;
                                return (
                                  <button
                                    key={cat.id}
                                    type='button'
                                    onClick={() => updateOutflowState(entry.id, { category: cat.label, adicionaNoContas: cat.defaultImpact }, entry.description)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                      isSelected
                                        ? `${cat.color} ring-2 ring-rose-400/40 font-bold`
                                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className='flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800'>
                            <div>
                              <span className='text-xs font-bold text-zinc-200 block'>Adicionar ao Contas a Pagar (Despesa Extra)?</span>
                              <span className='text-[11px] text-zinc-500'>
                                {state.adicionaNoContas 
                                  ? '📈 SIM: Soma no Subtotal Contas a Pagar do Fechamento' 
                                  : '🚫 NÃO: Apenas justifica a saída sem inflar as despesas operacionais'}
                              </span>
                            </div>
                            <div className='flex items-center gap-2'>
                              <button
                                type='button'
                                onClick={() => updateOutflowState(entry.id, { adicionaNoContas: false }, entry.description)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  !state.adicionaNoContas ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                }`}
                              >
                                Apenas Justificar
                              </button>
                              <button
                                type='button'
                                onClick={() => updateOutflowState(entry.id, { adicionaNoContas: true }, entry.description)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  state.adicionaNoContas ? 'bg-rose-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                }`}
                              >
                                + Despesa Extra
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      <div className='flex items-center justify-end gap-2 pt-2'>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => setEditingId(null)}
                          className='text-xs text-zinc-400 hover:text-white'
                        >
                          Cancelar
                        </Button>
                        <Button
                          size='sm'
                          disabled={state.saving}
                          onClick={() => handleSaveOutflow(entry)}
                          className='text-xs font-bold bg-rose-500 hover:bg-rose-400 text-zinc-950 cursor-pointer flex items-center gap-1'
                        >
                          {state.saving ? <Loader2 size={12} className='animate-spin' /> : <Save size={12} />}
                          Salvar Destinação
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Navegação de Rodapé */}
      <div className='flex items-center justify-between pt-4 border-t border-zinc-800'>
        <Button
          variant='outline'
          onClick={onBack}
          className='py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-2'
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>

        <Button
          onClick={onNext}
          className='py-2.5 px-6 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/40 flex items-center gap-2 cursor-pointer'
        >
          Avançar para Cofres
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
