import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { OfxBalanceCandidate } from '@/lib/parsers/ofxParser';

export interface OfxBalanceRule {
  id: string;
  account_key: string;
  store_id?: string;
  source_kind: string;
  memo_normalized?: string;
  date_role: string;
  is_active: boolean;
  version: number;
  updated_by?: string;
  updated_at: string;
}

export interface OfxBalanceSelection {
  id: string;
  account_key: string;
  store_id?: string;
  reconciliation_date: string;
  candidate_id?: string;
  source_kind: string;
  memo_normalized?: string;
  posted_date: string;
  selected_amount: number;
  selection_mode: 'rule' | 'manual';
  rule_version?: number;
  selected_by?: string;
  selected_at: string;
}

export interface OfxAccountHistoryEvent {
  id: string;
  account_key: string;
  store_id?: string;
  reconciliation_date: string;
  previous_amount?: number;
  new_amount: number;
  selection_mode?: string;
  reason?: string;
  actor_id?: string;
  created_at: string;
}

export interface BalanceSelectionPayload {
  account_key: string;
  store_id?: string;
  candidate_id?: string;
  candidate_data?: {
    source_kind: string;
    balance_role?: string;
    memo_raw?: string;
    memo_normalized?: string;
    posted_date: string;
    amount: number;
    amount_cents?: number;
  };
  source_kind?: string;
  balance_role?: string;
  memo_raw?: string;
  memo_normalized?: string;
  posted_date?: string;
  amount?: number;
  remember_rule?: boolean;
  selection_mode?: 'rule' | 'manual';
}

export interface BalancePreviewImpact {
  store_id: string;
  store_name: string;
  current_bank_total: number;
  new_bank_total: number;
  diff: number;
}

export function useOfxBalanceMappings(options?: { accountKeys?: string[]; date?: string }) {
  const queryClient = useQueryClient();
  const { accountKeys, date } = options || {};

  // 1. Carrega regras ativas para as contas
  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['ofx_balance_rules', accountKeys],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_ofx_balance_rules', {
        p_account_keys: accountKeys && accountKeys.length > 0 ? accountKeys : null,
      });
      if (error) {
        console.warn('[useOfxBalanceMappings] Erro ao carregar regras:', error);
        return [];
      }
      return ((data || []) as unknown) as OfxBalanceRule[];
    },
    staleTime: 60 * 1000,
  });

  // 2. Carrega seleções gravadas para a data específica
  const { data: selections = [], isLoading: isLoadingSelections } = useQuery({
    queryKey: ['ofx_balance_selections', date],
    queryFn: async () => {
      if (!date) return [];
      const { data, error } = await (supabase as any)
        .from('ofx_balance_selections')
        .select('*')
        .eq('reconciliation_date', date);
      if (error) {
        console.warn('[useOfxBalanceMappings] Erro ao carregar seleções:', error);
        return [];
      }
      return ((data || []) as unknown) as OfxBalanceSelection[];
    },
    enabled: Boolean(date),
    staleTime: 30 * 1000,
  });

  // 3. Mutação para prévia de impacto
  const previewMutation = useMutation({
    mutationFn: async ({
      selections: previewItems,
      date: targetDate,
    }: {
      selections: Array<{ account_key: string; store_id?: string; amount: number }>;
      date: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('preview_ofx_balance_selection', {
        p_selections: previewItems,
        p_date: targetDate,
      });
      if (error) throw error;
      return (data?.impacts || []) as BalancePreviewImpact[];
    },
  });

  // 4. Mutação para aplicação transacional da seleção de saldo
  const applyMutation = useMutation({
    mutationFn: async ({
      selections: items,
      targetDate,
      userId,
      reason,
    }: {
      selections: BalanceSelectionPayload[];
      targetDate: string;
      userId?: string;
      reason?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('apply_ofx_balance_selection', {
        p_selections: items,
        p_target_date: targetDate,
        p_user_id: userId || null,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['ofx_balance_rules'] });
      queryClient.invalidateQueries({ queryKey: ['ofx_balance_selections', variables.targetDate] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['conciliacao-backend'] });
    },
  });

  return {
    rules,
    selections,
    isLoading: isLoadingRules || isLoadingSelections,
    previewImpact: previewMutation.mutateAsync,
    isCalculatingPreview: previewMutation.isPending,
    applySelection: applyMutation.mutateAsync,
    isApplyingSelection: applyMutation.isPending,
  };
}

export function useOfxAccountHistory(accountKey?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['ofx_account_history', accountKey, limit],
    queryFn: async () => {
      if (!accountKey) return [];
      const { data, error } = await (supabase as any).rpc('get_ofx_account_history', {
        p_account_key: accountKey,
        p_limit: limit,
      });
      if (error) {
        console.warn('[useOfxAccountHistory] Erro ao carregar histórico:', error);
        return [];
      }
      return ((data || []) as unknown) as OfxAccountHistoryEvent[];
    },
    enabled: Boolean(accountKey),
    staleTime: 60 * 1000,
  });
}
