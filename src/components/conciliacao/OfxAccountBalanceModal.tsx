import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  History,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import {
  useOfxBalanceMappings,
  useOfxAccountHistory,
  BalanceSelectionPayload
} from '@/hooks/useOfxBalanceMappings';
import { toast } from 'sonner';

interface OfxAccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  targetDate: string;
  currentBankTotal?: number;
  onSuccess?: () => void;
}

export function OfxAccountBalanceModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  targetDate,
  currentBankTotal = 0,
  onSuccess
}: OfxAccountBalanceModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'selection' | 'history'>('selection');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [rememberRule, setRememberRule] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);

  // 1. Busca os mapeamentos de conta para esta loja
  const { data: storeAccounts = [] } = useQuery({
    queryKey: ['store_accounts_mapping', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('store_file_mappings')
        .select('*')
        .eq('store_id', storeId);
      
      const accounts = (data || []).map((m: any) => m.file_alias).filter((a: string) => a && a.includes('_'));
      return Array.from(new Set(accounts)) as string[];
    },
    enabled: isOpen && Boolean(storeId)
  });

  // 2. Busca todos os candidatos de saldo gravados no banco para esta loja ou contas
  const { data: dbCandidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['ofx_balance_candidates_modal', storeId, storeAccounts],
    queryFn: async () => {
      let query: any = (supabase as any)
        .from('ofx_balance_candidates')
        .select('*');

      if (storeAccounts.length > 0) {
        query = query.or(`store_id.eq.${storeId},account_key.in.(${storeAccounts.join(',')})`);
      } else {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query.order('posted_date', { ascending: false });
      if (error) {
        console.warn('Erro ao carregar candidatos de saldo:', error);
        return [];
      }
      return data || [];
    },
    enabled: isOpen && Boolean(storeId)
  });

  // Determina as contas disponíveis
  const availableAccounts = useMemo(() => {
    const fromCandidates = dbCandidates.map((c: any) => c.account_key);
    const set = new Set<string>([...storeAccounts, ...fromCandidates]);
    return Array.from(set).filter(Boolean);
  }, [storeAccounts, dbCandidates]);

  // Conta ativa
  const currentAccountKey = selectedAccountKey || availableAccounts[0] || null;

  // Regras e seleções
  const { rules, selections, applySelection, isApplyingSelection } = useOfxBalanceMappings({
    accountKeys: currentAccountKey ? [currentAccountKey] : availableAccounts,
    date: targetDate
  });

  // Histórico de alterações da conta ativa
  const { data: historyEvents = [], isLoading: isLoadingHistory } = useOfxAccountHistory(currentAccountKey || undefined);

  // Candidatos filtrados para a conta ativa
  const accountCandidates = useMemo(() => {
    if (!currentAccountKey) return dbCandidates;
    return dbCandidates.filter((c: any) => c.account_key === currentAccountKey);
  }, [dbCandidates, currentAccountKey]);

  // Seleção atual gravada para a conta ativa nesta data
  const currentSelection = useMemo(() => {
    return selections.find((s: any) => s.account_key === currentAccountKey);
  }, [selections, currentAccountKey]);

  // Regra ativa para esta conta
  const activeRule = useMemo(() => {
    return rules.find((r: any) => r.account_key === currentAccountKey && r.is_active);
  }, [rules, currentAccountKey]);

  // Sincroniza o candidato selecionado inicialmente
  useEffect(() => {
    if (accountCandidates.length === 0) return;

    // Se já houver seleção gravada para a data
    if (currentSelection?.candidate_id) {
      setSelectedCandidateId(currentSelection.candidate_id);
      return;
    }

    // Se houver candidato que corresponda à data de conciliação
    const sameDateCandidate = accountCandidates.find((c: any) => c.posted_date === targetDate);
    if (sameDateCandidate) {
      setSelectedCandidateId(sameDateCandidate.id);
      return;
    }

    // Fallback: primeiro candidato
    setSelectedCandidateId(accountCandidates[0].id);
  }, [accountCandidates, currentSelection, targetDate]);

  // Candidato atualmente focado na UI
  const chosenCandidate = useMemo(() => {
    return accountCandidates.find((c: any) => c.id === selectedCandidateId) || null;
  }, [accountCandidates, selectedCandidateId]);

  // Cálculo da prévia de impacto
  const preview = useMemo(() => {
    if (!chosenCandidate) {
      return {
        currentTotal: currentBankTotal,
        newTotal: currentBankTotal,
        diff: 0
      };
    }
    const candidateVal = Number(chosenCandidate.raw_amount ?? (chosenCandidate.amount_cents / 100));
    const diff = Number((candidateVal - currentBankTotal).toFixed(2));
    return {
      currentTotal: currentBankTotal,
      newTotal: candidateVal,
      diff
    };
  }, [chosenCandidate, currentBankTotal]);

  const handleSave = async () => {
    if (!chosenCandidate || !currentAccountKey) {
      toast.warning('Selecione um candidato de saldo antes de confirmar.');
      return;
    }

    try {
      const payload: BalanceSelectionPayload = {
        account_key: currentAccountKey,
        store_id: storeId,
        candidate_id: chosenCandidate.id,
        candidate_data: {
          source_kind: chosenCandidate.source_kind,
          balance_role: chosenCandidate.balance_role,
          memo_raw: chosenCandidate.memo_raw,
          memo_normalized: chosenCandidate.memo_normalized,
          posted_date: chosenCandidate.posted_date,
          amount: Number(chosenCandidate.raw_amount ?? (chosenCandidate.amount_cents / 100)),
          amount_cents: chosenCandidate.amount_cents
        },
        remember_rule: rememberRule,
        selection_mode: 'manual'
      };

      await applySelection({
        selections: [payload],
        targetDate,
        reason: reason.trim() || `Ajuste manual de saldo via Raio-X de Bancos para ${storeName}`
      });

      toast.success(`Saldo bancário de ${storeName} atualizado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['saldo-bancos-modal-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao aplicar seleção de saldo:', err);
      toast.error(`Falha ao salvar seleção: ${err.message}`);
    }
  };

  const isDivergentDate = chosenCandidate && chosenCandidate.posted_date !== targetDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configuração de Saldo OFX — ${storeName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Sub-header com contexto e Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--color-primary)]">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {storeName}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                Data de Referência: <span className="font-mono font-medium text-[var(--text-secondary)]">{targetDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] p-1 rounded-lg border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab('selection')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'selection'
                  ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Candidatos & Regras
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--bg-canvas)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico ({historyEvents.length})
            </button>
          </div>
        </div>

        {/* Seletor de Contas (quando a filial possui mais de 1 conta associada) */}
        {availableAccounts.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-[var(--text-tertiary)] shrink-0">Contas:</span>
            {availableAccounts.map(acct => {
              const parts = acct.split('_');
              const label = parts.length === 2 ? `Ag. ${parts[0]} • CC ${parts[1]}` : acct;
              const isSelected = acct === currentAccountKey;
              return (
                <button
                  key={acct}
                  type="button"
                  onClick={() => setSelectedAccountKey(acct)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                      : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'selection' ? (
          <div className="space-y-5">
            {/* Informações da Regra Atual */}
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <div className="text-xs">
                  <span className="text-[var(--text-tertiary)]">Regra memorizada para esta conta: </span>
                  {activeRule ? (
                    <span className="font-semibold text-[var(--text-primary)]">
                      {activeRule.source_kind === 'STMTTRN_MEMO' ? `MEMO "${activeRule.memo_normalized}"` : `<${activeRule.source_kind}>`} (v{activeRule.version})
                    </span>
                  ) : (
                    <span className="text-[var(--text-tertiary)] italic">Nenhuma regra permanente cadastrada</span>
                  )}
                </div>
              </div>
              {activeRule && (
                <Badge variant="success" className="text-[10px]">
                  Ativa
                </Badge>
              )}
            </div>

            {/* Lista de Candidatos Extraídos */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>Candidatos de Saldo Encontrados nos Extratos</span>
                <span className="text-[var(--text-tertiary)] font-normal">
                  {accountCandidates.length} opções disponíveis
                </span>
              </div>

              {isLoadingCandidates ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : accountCandidates.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <Info className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Nenhum candidato de saldo OFX registrado para esta conta/loja.
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    Importe um arquivo de extrato OFX recente no menu de Importações para povoar os candidatos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {accountCandidates.map((cand: any) => {
                    const isSelected = cand.id === selectedCandidateId;
                    const isDateMatch = cand.posted_date === targetDate;
                    const isRuleMatch = activeRule && (
                      (activeRule.source_kind === cand.source_kind) &&
                      (!activeRule.memo_normalized || activeRule.memo_normalized === cand.memo_normalized)
                    );
                    const val = Number(cand.raw_amount ?? (cand.amount_cents / 100));

                    return (
                      <div
                        key={cand.id}
                        onClick={() => setSelectedCandidateId(cand.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                            isSelected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--bg-canvas)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-[var(--text-primary)]">
                                {cand.source_kind === 'STMTTRN_MEMO' ? `MEMO: ${cand.memo_raw || cand.memo_normalized}` : `<${cand.source_kind}>`}
                              </span>
                              <Badge variant={isDateMatch ? 'success' : 'warning'} className="text-[10px]">
                                {cand.posted_date}
                              </Badge>
                              {isRuleMatch && (
                                <Badge variant="neutral" className="text-[10px]">
                                  Padrão da Regra
                                </Badge>
                              )}
                              {cand.balance_role && (
                                <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-mono">
                                  {cand.balance_role}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-tertiary)]">
                              Conta: <span className="font-mono">{cand.account_key}</span>
                              {cand.fitid && <span> • FITID: {cand.fitid}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-mono text-sm font-bold tabular-nums ${val < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(val)}
                          </div>
                          {!isDateMatch && (
                            <div className="text-[10px] text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Diverge da data de conciliação
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alerta de Divergência de Data */}
            {isDivergentDate && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Atenção: Candidato com data diferente da conciliação</div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5">
                    Você está selecionando um saldo com data bancária <span className="font-mono font-semibold">{chosenCandidate?.posted_date}</span> para a conciliação do dia <span className="font-mono font-semibold">{targetDate}</span>. Esta ação será auditada no histórico.
                  </div>
                </div>
              </div>
            )}

            {/* Live Impact Preview Card */}
            {chosenCandidate && (
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-3">
                <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  Prévia do Impacto no Saldo da Filial
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Saldo Atual</div>
                    <div className="text-xs font-mono font-bold text-[var(--text-secondary)] mt-1">
                      {formatCurrency(preview.currentTotal)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Novo Saldo Selecionado</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                      {formatCurrency(preview.newTotal)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Variação Líquida</div>
                    <div className={`text-xs font-mono font-bold mt-1 flex items-center gap-1 ${
                      preview.diff > 0 ? 'text-emerald-400' : preview.diff < 0 ? 'text-red-400' : 'text-[var(--text-tertiary)]'
                    }`}>
                      {preview.diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : preview.diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                      {preview.diff > 0 ? `+ ${formatCurrency(preview.diff)}` : formatCurrency(preview.diff)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox: Lembrar regra */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={rememberRule}
                onChange={e => setRememberRule(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
              />
              <span>Definir esta fonte como <strong>regra duradoura</strong> para as próximas importações desta conta</span>
            </label>

            {/* Justificativa / Motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
                <span>Motivo / Justificativa do Ajuste</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">(Obrigatório em conciliação fechada)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ex: Ajustado para considerar saldo do dia em vez de saldo de D+2"
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        ) : (
          /* Aba de Histórico de Auditoria */
          <div className="space-y-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              Trilha de Auditoria da Conta ({currentAccountKey})
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner size="md" />
              </div>
            ) : historyEvents.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <History className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Nenhum evento de alteração registrado para esta conta ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {historyEvents.map((evt: any) => {
                  return (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-tertiary)]">
                          {new Date(evt.created_at).toLocaleString('pt-BR')}
                        </span>
                        <Badge variant="neutral" className="text-[10px]">
                          {evt.selection_mode || 'manual'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[var(--text-tertiary)]">
                          {evt.previous_amount !== undefined && evt.previous_amount !== null ? formatCurrency(Number(evt.previous_amount)) : 'R$ 0,00'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(Number(evt.new_amount))}
                        </span>
                      </div>

                      {evt.reason && (
                        <div className="text-[11px] text-[var(--text-secondary)] italic bg-[var(--bg-surface-elevated)] p-1.5 rounded">
                          "{evt.reason}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isApplyingSelection}
          >
            Cancelar
          </Button>

          {activeTab === 'selection' && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isApplyingSelection || !chosenCandidate || accountCandidates.length === 0}
              className="gap-2"
            >
              {isApplyingSelection ? (
                <>
                  <LoadingSpinner size="sm" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar e Recalcular Saldo
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
