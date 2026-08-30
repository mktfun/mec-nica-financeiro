import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FileQuestion, CheckCircle2, Save, X, ArrowLeft, ArrowRight, Loader2, TrendingUp, Ban, Check } from 'lucide-react';

export interface OFXEntry {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  date: string;
  fitid: string;
}

export interface QuickCategory {
  id: string;
  label: string;
  defaultImpact: boolean;
  color: string;
}

export const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'transf_lojas', label: 'Transferência Entre Lojas', defaultImpact: false, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'aporte_socios', label: 'Aporte de Sócios', defaultImpact: false, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'estorno', label: 'Estorno / Ajuste', defaultImpact: false, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { id: 'tarifa', label: 'Tarifa / Despesa Bancária', defaultImpact: false, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'venda_sucata', label: 'Venda de Sucata', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'deposito_avulso', label: 'Depósito Avulso', defaultImpact: true, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'outros', label: 'Outros', defaultImpact: false, color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10' },
];

interface ItemState {
  category: string;
  impactsRevenue: boolean;
  observacao: string;
  saved: boolean;
  saving: boolean;
  cancelled: boolean;
}

interface Props {
  results: UnifiedImportResult;
  mapping: Record<string, string>; // alias -> store_id
  targetDate: string;
  stores: { id: string; name: string }[];
  onNext: () => void;
  onBack: () => void;
}

// 1. REGEX DE EXCLUSÃO ABSOLUTA (Adquirentes de Cartão e Rendimentos Financeiros NUNCA aparecem aqui)
export const EXCLUDE_ACQUIRER_REGEX =
  /(?:^|[^a-zA-Z0-9])(REDE|REDECARD|CIELO|GETNET|STONE|PAGSEGURO|PAGS|BIN|ADQ|ADQUIRENTE|MAST|MASTER|MASTERCARD|VISA|VISA\s+ELECTRON|ELO|AMEX|AMERICAN\s+EXPRESS|HIPERCARD|ALELO|SODEXO|TICKET|VR|VOUCHER|LIQ[\.\s]|LIQUIDACAO|CARTAO|CRED[\.\s]?CARTAO)(?:$|[^a-zA-Z0-9])/i;

export const EXCLUDE_BANK_EARNINGS_REGEX =
  /(?:^|[^a-zA-Z0-9])(REND|RENDIMENTO|REND\s+PAGO\s+APLIC|APLIC|APLICACAO|APLICAÇÃO|RESG|RESGATE|CDB|LCI|LCA|TESOURO|FUNDO|FUNDOS|JUROS|POUP|POUPANCA|POUPANÇA|AUT\s+APR|APL\s+AUT|RESG\s+AUT|IOF|REMUNERAC|IRRF\s+S\/\s+APLIC)(?:$|[^a-zA-Z0-9])/i;

// 2. REGEX DE RECONHECIMENTO DE NÃO-FATURAMENTO
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

function inferCategoryAndImpact(desc: string): { category: string; impactsRevenue: boolean } {
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

export function Step2NonRevenueJustifications({
  results,
  mapping,
  targetDate,
  stores,
  onNext,
  onBack,
}: Props) {
  // Filtro Estrito: Apenas movimentações manuais reais (Transferências entre lojas, Aportes, etc.)
  const nonRevenueEntries = useMemo<OFXEntry[]>(() => {
    const entries: OFXEntry[] = [];

    results.ofxResults?.forEach((ofxResult: any) => {
      const storeId = mapping[ofxResult.alias] || '';
      const storeObj = stores.find(s => s.id === storeId);
      const storeName = storeObj?.name || ofxResult.alias || 'Loja';

      (ofxResult.transactions || []).forEach((tx: any) => {
        if (tx.type !== 'in') return;
        const fullDesc = `${tx.title || ''} ${tx.counterpart_name || ''}`.trim();

        // 1. BLOQUEIO ABSOLUTO de liquidações da Rede / Cielo e adquirentes
        if (EXCLUDE_ACQUIRER_REGEX.test(fullDesc)) return;

        // 2. BLOQUEIO ABSOLUTO de rendimentos e aplicações automáticas
        if (EXCLUDE_BANK_EARNINGS_REGEX.test(fullDesc)) return;

        // 3. BLOQUEIO de transações casadas com OS
        if (tx.matched_os_number) return;

        // 4. Se for PIX de cliente, ele pertence ao Step 4 (vínculo de OS) e não à Tela B,
        // a não ser que seja explicitamente transferência entre filiais / aporte
        const isTransferOrAporte =
          NON_REVENUE_PATTERNS.TRANSFERENCIA_ENTRE_LOJAS.test(fullDesc) ||
          NON_REVENUE_PATTERNS.APORTE.test(fullDesc) ||
          NON_REVENUE_PATTERNS.TARIFA_BANCARIA.test(fullDesc) ||
          NON_REVENUE_PATTERNS.ESTORNO.test(fullDesc) ||
          NON_REVENUE_PATTERNS.SUCATA.test(fullDesc);

        // Se for um crédito genérico não-adquirente e não-rendimento que sobrou
        if (isTransferOrAporte || !/PIX|QRS|CHAVE/i.test(fullDesc)) {
          entries.push({
            id: tx.fitid || `${ofxResult.alias}_${tx.amount}_${Math.random()}`,
            storeId,
            storeName,
            amount: Number(tx.amount || 0),
            description: tx.counterpart_name || tx.title || 'Movimentação Bancária',
            date: tx.date || targetDate,
            fitid: tx.fitid || '',
          });
        }
      });
    });

    return entries;
  }, [results, mapping, stores, targetDate]);

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const getState = (id: string, desc = ''): ItemState => {
    if (itemStates[id]) return itemStates[id];
    const inferred = inferCategoryAndImpact(desc);
    return {
      category: inferred.category,
      impactsRevenue: inferred.impactsRevenue,
      observacao: '',
      saved: false,
      saving: false,
      cancelled: false,
    };
  };

  const updateState = (id: string, partial: Partial<ItemState>, desc = '') => {
    setItemStates(prev => ({
      ...prev,
      [id]: { ...getState(id, desc), ...partial },
    }));
  };

  const handleSave = async (entry: OFXEntry) => {
    const state = getState(entry.id, entry.description);
    updateState(entry.id, { saving: true }, entry.description);

    try {
      const cleanCategory = state.category.replace(/\s*\[Apenas Conciliar\]/gi, '').trim();
      const finalCategory = state.impactsRevenue ? cleanCategory : `${cleanCategory} [Apenas Conciliar]`;
      const cleanJustification = state.observacao.replace(/\s*\[NÃO SOMAR\]/gi, '').trim();
      const finalJustification = state.impactsRevenue ? cleanJustification : `${cleanJustification} [NÃO SOMAR]`.trim();

      // 1. Inserir em daily_manual_bills
      const { error: insertError } = await supabase.from('daily_manual_bills').insert({
        date: targetDate,
        store_id: entry.storeId || null,
        title: entry.description,
        amount: entry.amount,
        category: finalCategory,
        external_code: null,
        description: finalJustification || null,
      });

      if (insertError) throw insertError;

      // 2. Atualizar em transactions se existir fitid
      if (entry.fitid) {
        await supabase
          .from('transactions')
          .update({
            manual_category: finalCategory,
            manual_justification: finalJustification,
          })
          .eq('fitid', entry.fitid);
      }

      updateState(entry.id, { saving: false, saved: true }, entry.description);
      setEditingId(null);
      toast.success(
        `Justificativa salva! (${state.impactsRevenue ? '📈 Soma ao Faturamento' : '🚫 Apenas Conciliar'})`
      );
    } catch (err: any) {
      updateState(entry.id, { saving: false }, entry.description);
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleCancel = (id: string, desc = '') => {
    updateState(id, { cancelled: true }, desc);
    setEditingId(null);
  };

  const visibleEntries = nonRevenueEntries.filter(e => !getState(e.id, e.description).cancelled);
  const savedCount = nonRevenueEntries.filter(e => getState(e.id, e.description).saved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-zinc-900 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <FileQuestion className="text-amber-400" size={20} />
              Passo 5: Justificativas de Movimentações por Loja
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Classifique entradas bancárias manuais e defina se somam ao faturamento (ex: Venda de Sucata) ou se são apenas conciliação interna (ex: Transferência entre Lojas, Aportes e Devoluções).
            </p>
          </div>

          <Badge variant="brand" className="font-mono text-xs shrink-0">
            {savedCount}/{visibleEntries.length} Justificadas
          </Badge>
        </div>
      </Card>

      {/* Lista de Entradas a Justificar */}
      <div className="space-y-3">
        {visibleEntries.length === 0 ? (
          <Card className="p-12 text-center text-zinc-500 bg-zinc-900/30 border-zinc-800">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400/60" />
            <p className="text-base font-semibold text-zinc-200">
              Nenhuma movimentação pendente de justificativa!
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Todas as entradas do extrato bancário estão devidamente conciliadas com as OSs e Adquirentes.
            </p>
          </Card>
        ) : (
          visibleEntries.map(entry => {
            const state = getState(entry.id, entry.description);
            const isEditing = editingId === entry.id;

            return (
              <Card
                key={entry.id}
                className={`p-4 bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-all ${
                  state.saved ? 'border-emerald-800/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info da Transação */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{entry.storeName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">• {entry.date}</span>
                      {state.saved && (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              state.impactsRevenue
                                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                            }`}
                          >
                            {state.impactsRevenue ? '📈 Soma ao Faturamento' : '🚫 Apenas Conciliar'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono border text-zinc-300 border-zinc-700 bg-zinc-900">
                            {state.category}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            ✓ Salvo
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 font-mono truncate max-w-2xl" title={entry.description}>
                      {entry.description}
                    </p>
                    {state.saved && state.observacao && (
                      <p className="text-xs text-zinc-400 italic mt-1">
                        Obs: {state.observacao}
                      </p>
                    )}
                  </div>

                  {/* Valor e Ações */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Valor</span>
                      <AmountCell
                        value={entry.amount}
                        tone="success"
                        className="text-sm font-bold"
                      />
                    </div>

                    {!state.saved && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(isEditing ? null : entry.id)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                        >
                          {isEditing ? 'Fechar' : 'Classificar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(entry.id, entry.description)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                          title="Ignorar esta entrada"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulário de Classificação Inline Completo (Padrão Extrato) */}
                {isEditing && !state.saved && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">
                    {/* 1. Escolha de Impacto (2 botões claros de Faturamento vs Apenas Conciliar) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Destino da Justificativa *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => updateState(entry.id, { impactsRevenue: true }, entry.description)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            state.impactsRevenue
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <TrendingUp size={14} className={state.impactsRevenue ? 'text-emerald-400' : 'text-zinc-400'} />
                              Somar ao Faturamento
                            </span>
                            {state.impactsRevenue && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            Receita avulsa da loja (Venda de sucata, serviços ou depósitos sem OS)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateState(entry.id, { impactsRevenue: false }, entry.description)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            !state.impactsRevenue
                              ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <Ban size={14} className={!state.impactsRevenue ? 'text-amber-400' : 'text-zinc-400'} />
                              Apenas Conciliar
                            </span>
                            {!state.impactsRevenue && <Check size={14} className="text-amber-400" />}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            Não soma no faturamento (Transferência entre lojas, aporte, estorno, tarifa)
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Chips de Categorias Rápidas */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Categoria Sugerida
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {QUICK_CATEGORIES.map(cat => {
                          const isSelected = state.category === cat.label;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() =>
                                updateState(
                                  entry.id,
                                  { category: cat.label, impactsRevenue: cat.defaultImpact },
                                  entry.description
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-100 text-zinc-950 font-bold border-white shadow-sm'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Observação / Justificativa detalhada */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Observação / Descrição Detalhada
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Transferência autorizada pelo sócio para cobrir folha/fornecedor..."
                        value={state.observacao}
                        onChange={e =>
                          updateState(entry.id, { observacao: e.target.value }, entry.description)
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* 4. Botões de Ação */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-zinc-400 cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(entry)}
                        disabled={state.saving}
                        className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          state.impactsRevenue
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                        }`}
                      >
                        {state.saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Salvar Justificativa
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Navegação de Rodapé */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2 text-sm border-zinc-700 text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Voltar ao Passo 4
        </Button>
        <Button
          onClick={onNext}
          className="flex items-center gap-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 cursor-pointer shadow-md shadow-emerald-950/30"
        >
          Próximo: Conferência de Cofre
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
