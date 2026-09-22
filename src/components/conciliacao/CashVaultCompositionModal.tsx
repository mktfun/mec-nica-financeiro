import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Banknote,
  Building2,
  CheckCircle2,
  ArrowDownToLine,
  Search,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Lock,
  Undo2,
  EyeOff
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface CashVaultCompositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  isClosed?: boolean;
  isEditing?: boolean;
  onSuccess?: () => void;
}

export interface VaultEntryRow {
  id: string;
  store_id: string;
  amount: number;
  entry_date: string;
  description: string;
  os_number_ref?: string;
  client_name?: string;
  plate?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface UnmatchedBillRow {
  id: string;
  title: string;
  description?: string;
  category?: string;
  amount: number;
  store_id?: string;
  due_date?: string;
  match_status?: string;
}

export function CashVaultCompositionModal({
  isOpen,
  onClose,
  targetDate,
  isClosed = false,
  isEditing = false,
  onSuccess
}: CashVaultCompositionModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'entries' | 'unmatched_bills'>('entries');
  const [billsFilter, setBillsFilter] = useState<'unmatched' | 'paid_cash' | 'ignored' | 'all'>('unmatched');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Loja selecionada por conta para baixa rápida
  const [selectedStoreByBill, setSelectedStoreByBill] = useState<Record<string, string>>({});

  // Modal interno para registrar despesa em dinheiro
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseStore, setExpenseStore] = useState('st-01');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Pequenas Despesas / Operacional');
  const [expenseRecipient, setExpenseRecipient] = useState('');

  // 1. Busca lojas
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name').order('name');
      return data || [];
    },
    enabled: isOpen
  });

  const storeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach((s: any) => { map[s.id] = s.name; });
    return map;
  }, [stores]);

  // 2. Busca snapshot diário para verificar se há snapshot congelado (blindagem temporal R4)
  const { data: snapshotData } = useQuery({
    queryKey: ['daily-snapshot-for-vault', targetDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_snapshots')
        .select('is_closed, metadata')
        .eq('date', targetDate)
        .maybeSingle();
      return data;
    },
    enabled: isOpen
  });

  const effectiveIsClosed = isClosed || Boolean(snapshotData?.is_closed);

  const frozenSnapshot = useMemo(() => {
    if (effectiveIsClosed && !isEditing && snapshotData?.metadata && (snapshotData.metadata as any).cash_vault_snapshot) {
      return (snapshotData.metadata as any).cash_vault_snapshot;
    }
    return null;
  }, [effectiveIsClosed, isEditing, snapshotData]);

  // 3. Busca lançamentos em store_cash_vault (ao vivo ou do snapshot)
  const { data: liveVaultItems = [], isLoading: isLoadingVault, refetch: refetchVault } = useQuery<VaultEntryRow[]>({
    queryKey: ['store-cash-vault-composition', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cash_vault')
        .select('*')
        .lte('entry_date', targetDate)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        store_id: r.store_id,
        amount: Number(r.amount || 0),
        entry_date: r.entry_date,
        description: r.description || 'Recebimento em Dinheiro',
        os_number_ref: r.os_number_ref || '',
        status: r.status,
        notes: r.notes || '',
        created_at: r.created_at
      }));
    },
    enabled: isOpen && !frozenSnapshot
  });

  const rawVaultItems: VaultEntryRow[] = useMemo(() => {
    if (frozenSnapshot && (frozenSnapshot.entries || frozenSnapshot.fractions)) {
      return (frozenSnapshot.entries || frozenSnapshot.fractions);
    }
    return liveVaultItems;
  }, [frozenSnapshot, liveVaultItems]);

  // 4. Busca dados de pátio para enriquecer cliente e placa das OSs (R2)
  const osRefs = useMemo(() => {
    return rawVaultItems.map(v => v.os_number_ref).filter(Boolean) as string[];
  }, [rawVaultItems]);

  const { data: patioMap = {} } = useQuery<Record<string, { client_name?: string; plate?: string }>>({
    queryKey: ['patio-os-details-for-vault', osRefs],
    queryFn: async () => {
      if (osRefs.length === 0) return {};
      const { data } = await supabase
        .from('patio_os')
        .select('os_number, client_name, plate')
        .in('os_number', osRefs);
      const map: Record<string, { client_name?: string; plate?: string }> = {};
      (data || []).forEach((p: any) => {
        map[String(p.os_number)] = { client_name: p.client_name, plate: p.plate };
      });
      return map;
    },
    enabled: isOpen && osRefs.length > 0
  });

  // Enriquecer vaultItems com cliente e placa
  const vaultItems: VaultEntryRow[] = useMemo(() => {
    return rawVaultItems.map(item => {
      const pInfo = item.os_number_ref ? patioMap[String(item.os_number_ref)] : undefined;
      return {
        ...item,
        client_name: item.client_name || pInfo?.client_name,
        plate: item.plate || pInfo?.plate
      };
    });
  }, [rawVaultItems, patioMap]);

  // 5. Saldo em trânsito disponível por loja
  const availableInTransitByStore = useMemo(() => {
    const map: Record<string, number> = {};
    vaultItems.forEach(v => {
      const isSaida = v.notes?.includes('[SAIDA_DESPESA]') || v.description?.toUpperCase().includes('[SAÍDA');
      if (!isSaida && (v.status === 'em_transito' || v.status === 'pending')) {
        map[v.store_id] = (map[v.store_id] || 0) + v.amount;
      }
    });
    return map;
  }, [vaultItems]);

  // 6. Busca contas a pagar da data para sugestão inteligente (R3)
  const { data: allBills = [], isLoading: isLoadingBills, refetch: refetchBills } = useQuery<UnmatchedBillRow[]>({
    queryKey: ['daily-bills-for-cash-vault', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_manual_bills')
        .select('*')
        .eq('date', targetDate)
        .order('amount', { ascending: false });

      if (error) throw error;
      return (data || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description || '',
        category: b.category || 'Geral',
        amount: Number(b.amount || 0),
        store_id: b.store_id,
        due_date: b.due_date,
        match_status: b.match_status || (b.matched_ofx_id ? 'matched' : 'unmatched')
      }));
    },
    enabled: isOpen
  });

  // Métricas de Totais
  const metrics = useMemo(() => {
    if (frozenSnapshot) {
      return {
        totalEmTransito: Number(frozenSnapshot.total_em_transito || 0),
        totalDepositado: Number(frozenSnapshot.total_depositado || 0),
        totalSaidas: Number(frozenSnapshot.total_saidas || 0),
        totalGeral: Number(frozenSnapshot.total_geral || (Number(frozenSnapshot.total_em_transito || 0) + Number(frozenSnapshot.total_depositado || 0)))
      };
    }

    let totalEmTransito = 0;
    let totalDepositado = 0;
    let totalSaidas = 0;
    let totalGeral = 0;

    vaultItems.forEach(item => {
      const isSaida = item.notes?.includes('[SAIDA_DESPESA]') || item.description?.toUpperCase().includes('[SAÍDA');
      if (isSaida) {
        totalSaidas += item.amount;
      } else if (item.status === 'em_transito' || item.status === 'pending') {
        totalEmTransito += item.amount;
      } else if (item.status === 'depositado') {
        totalDepositado += item.amount;
      }
      totalGeral += item.amount;
    });

    return { totalEmTransito, totalDepositado, totalSaidas, totalGeral };
  }, [vaultItems, frozenSnapshot]);

  // Contas filtradas
  const filteredBills = useMemo(() => {
    return allBills.filter(bill => {
      if (billsFilter === 'unmatched') {
        return bill.match_status === 'unmatched' || (!bill.match_status);
      }
      if (billsFilter === 'paid_cash') {
        return bill.match_status === 'paid_cash';
      }
      if (billsFilter === 'ignored') {
        return bill.match_status === 'ignored';
      }
      return true;
    });
  }, [allBills, billsFilter]);

  const unmatchedCount = useMemo(() => {
    return allBills.filter(b => b.match_status === 'unmatched' || !b.match_status).length;
  }, [allBills]);

  // Filtros de frações de cofre
  const filteredVaultItems = useMemo(() => {
    return vaultItems.filter(item => {
      const matchesStore = storeFilter === 'ALL' || item.store_id === storeFilter;
      const sLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() || 
        item.description.toLowerCase().includes(sLower) ||
        (item.os_number_ref && item.os_number_ref.toLowerCase().includes(sLower)) ||
        (item.client_name && item.client_name.toLowerCase().includes(sLower)) ||
        (item.plate && item.plate.toLowerCase().includes(sLower)) ||
        (storeNameMap[item.store_id] && storeNameMap[item.store_id].toLowerCase().includes(sLower));
      return matchesStore && matchesSearch;
    });
  }, [vaultItems, storeFilter, searchTerm, storeNameMap]);

  // Mutações: Alternar Status de Depósito
  const toggleDepositMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: 'depositado' | 'em_transito' }) => {
      const { error } = await supabase
        .from('store_cash_vault')
        .update({
          status: nextStatus,
          deposited_at: nextStatus === 'depositado' ? new Date().toISOString() : null,
          deposited_by: nextStatus === 'depositado' ? 'Operador Caixa' : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status da fração de dinheiro atualizado com sucesso!');
      refetchVault();
      queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar: ${err.message || err}`);
    }
  });

  // Mutação: Baixar Conta com Dinheiro do Cofre (Abate do Saldo em Trânsito R2/R3)
  const payBillWithCashMutation = useMutation({
    mutationFn: async ({ bill, storeIdChosen }: { bill: UnmatchedBillRow; storeIdChosen: string }) => {
      const available = availableInTransitByStore[storeIdChosen] || 0;
      if (available < bill.amount) {
        throw new Error(
          `Saldo insuficiente no cofre da loja ${storeNameMap[storeIdChosen] || storeIdChosen} (Disponível: ${formatCurrency(available)}, Necessário: ${formatCurrency(bill.amount)}). Selecione uma filial com saldo suficiente no cofre.`
        );
      }

      // 1. Busca lançamentos em trânsito da loja para abater
      const { data: inTransit, error: fetchErr } = await supabase
        .from('store_cash_vault')
        .select('*')
        .eq('store_id', storeIdChosen)
        .lte('entry_date', targetDate)
        .in('status', ['em_transito', 'pending'])
        .order('entry_date', { ascending: true });

      if (fetchErr) throw fetchErr;

      let remaining = bill.amount;
      for (const item of inTransit || []) {
        if (remaining <= 0) break;
        const amt = Number(item.amount || 0);
        if (amt > remaining) {
          const newAmt = Math.round((amt - remaining) * 100) / 100;
          await supabase
            .from('store_cash_vault')
            .update({
              amount: newAmt,
              notes: `${item.notes || ''} [Abatido ${formatCurrency(remaining)} para conta: ${bill.title}]`.trim()
            })
            .eq('id', item.id);
          remaining = 0;
        } else {
          await supabase
            .from('store_cash_vault')
            .update({
              status: 'depositado',
              deposited_at: new Date().toISOString(),
              deposited_by: 'Baixa em Dinheiro',
              notes: `${item.notes || ''} [Consumido integralmente para conta: ${bill.title}]`.trim()
            })
            .eq('id', item.id);
          remaining = Math.round((remaining - amt) * 100) / 100;
        }
      }

      // 2. Insere o registro de saída para rastreabilidade
      const notePayload = JSON.stringify({
        type: 'saida_despesa',
        bill_id: bill.id,
        title: bill.title,
        category: bill.category,
        paid_at: new Date().toISOString()
      });

      const { error: vaultErr } = await supabase
        .from('store_cash_vault')
        .insert({
          store_id: storeIdChosen,
          amount: bill.amount,
          description: `[SAÍDA EM DINHEIRO] ${bill.title}`,
          entry_date: targetDate,
          status: 'depositado',
          notes: `[SAIDA_DESPESA] ${notePayload}`
        });

      if (vaultErr) throw vaultErr;

      // 3. Atualiza a conta em daily_manual_bills marcando como paga em dinheiro
      const { error: billErr } = await supabase
        .from('daily_manual_bills')
        .update({
          match_status: 'paid_cash',
          payment_date: targetDate,
          description: `${bill.description || ''} [PAGO EM DINHEIRO DO COFRE - REF: ${storeNameMap[storeIdChosen] || storeIdChosen}]`.trim()
        })
        .eq('id', bill.id);

      if (billErr) throw billErr;
    },
    onSuccess: () => {
      toast.success('Conta baixada como saída de dinheiro físico com sucesso!');
      refetchVault();
      refetchBills();
      queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_manual_bills'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(`Erro ao baixar conta em dinheiro: ${err.message || err}`);
    }
  });

  // Mutação: Ignorar / Manter Aberto
  const ignoreBillMutation = useMutation({
    mutationFn: async ({ billId, nextStatus }: { billId: string; nextStatus: 'ignored' | 'unmatched' }) => {
      const { error } = await supabase
        .from('daily_manual_bills')
        .update({ match_status: nextStatus })
        .eq('id', billId);
      if (error) throw error;
    },
    onSuccess: (_, { nextStatus }) => {
      toast.success(nextStatus === 'ignored' ? 'Conta ignorada para baixa em dinheiro.' : 'Conta reaberta para baixa.');
      refetchBills();
      queryClient.invalidateQueries({ queryKey: ['daily_manual_bills'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message || err}`);
    }
  });

  // Mutação: Desfazer Baixa em Dinheiro
  const undoPayBillMutation = useMutation({
    mutationFn: async (bill: UnmatchedBillRow) => {
      // 1. Busca saída em store_cash_vault correspondente
      const { data: outflows } = await supabase
        .from('store_cash_vault')
        .select('*')
        .eq('entry_date', targetDate)
        .like('notes', `%${bill.id}%`);

      if (outflows && outflows.length > 0) {
        const out = outflows[0];
        // Restaura valor ao cofre da loja
        const { data: latestInTransit } = await supabase
          .from('store_cash_vault')
          .select('*')
          .eq('store_id', out.store_id)
          .eq('entry_date', targetDate)
          .in('status', ['em_transito', 'pending'])
          .limit(1);

        if (latestInTransit && latestInTransit.length > 0) {
          await supabase
            .from('store_cash_vault')
            .update({ amount: Number(latestInTransit[0].amount) + Number(out.amount) })
            .eq('id', latestInTransit[0].id);
        } else {
          // Cria fração de volta em trânsito
          await supabase
            .from('store_cash_vault')
            .insert({
              store_id: out.store_id,
              amount: out.amount,
              description: `[ESTORNO SAÍDA] ${bill.title}`,
              entry_date: targetDate,
              status: 'em_transito'
            });
        }

        // Deleta o registro de saída
        await supabase.from('store_cash_vault').delete().eq('id', out.id);
      }

      // 2. Restaura o status da conta para 'unmatched'
      await supabase
        .from('daily_manual_bills')
        .update({
          match_status: 'unmatched',
          payment_date: null
        })
        .eq('id', bill.id);
    },
    onSuccess: () => {
      toast.success('Baixa em dinheiro desfeita e saldo restaurado ao cofre!');
      refetchVault();
      refetchBills();
      queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_manual_bills'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      if (onSuccess) onSuccess();
    }
  });

  // Mutação: Criar Nova Despesa Manual em Dinheiro (Abate do Saldo em Trânsito)
  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      if (expenseAmount <= 0) throw new Error('Informe um valor válido maior que zero.');
      if (!expenseDesc.trim()) throw new Error('Informe a descrição ou motivo da saída.');

      const available = availableInTransitByStore[expenseStore] || 0;
      if (available < expenseAmount) {
        throw new Error(
          `Saldo insuficiente no cofre da loja ${storeNameMap[expenseStore] || expenseStore} (Disponível: ${formatCurrency(available)}, Solicitado: ${formatCurrency(expenseAmount)}).`
        );
      }

      // Abate dos itens em trânsito
      const { data: inTransit, error: fetchErr } = await supabase
        .from('store_cash_vault')
        .select('*')
        .eq('store_id', expenseStore)
        .lte('entry_date', targetDate)
        .in('status', ['em_transito', 'pending'])
        .order('entry_date', { ascending: true });

      if (fetchErr) throw fetchErr;

      let remaining = expenseAmount;
      for (const item of inTransit || []) {
        if (remaining <= 0) break;
        const amt = Number(item.amount || 0);
        if (amt > remaining) {
          const newAmt = Math.round((amt - remaining) * 100) / 100;
          await supabase
            .from('store_cash_vault')
            .update({
              amount: newAmt,
              notes: `${item.notes || ''} [Abatido ${formatCurrency(remaining)} para despesa: ${expenseDesc}]`.trim()
            })
            .eq('id', item.id);
          remaining = 0;
        } else {
          await supabase
            .from('store_cash_vault')
            .update({
              status: 'depositado',
              deposited_at: new Date().toISOString(),
              deposited_by: 'Despesa em Dinheiro',
              notes: `${item.notes || ''} [Consumido integralmente para despesa: ${expenseDesc}]`.trim()
            })
            .eq('id', item.id);
          remaining = Math.round((remaining - amt) * 100) / 100;
        }
      }

      const notePayload = JSON.stringify({
        type: 'saida_despesa',
        recipient: expenseRecipient,
        category: expenseCategory,
        paid_at: new Date().toISOString()
      });

      const { error } = await supabase
        .from('store_cash_vault')
        .insert({
          store_id: expenseStore,
          amount: expenseAmount,
          description: `[SAÍDA EM DINHEIRO] ${expenseDesc.trim()}`,
          entry_date: targetDate,
          status: 'depositado',
          notes: `[SAIDA_DESPESA] ${notePayload}`
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Saída em dinheiro registrada e abatida do cofre com sucesso!');
      setIsExpenseModalOpen(false);
      setExpenseAmount(0);
      setExpenseDesc('');
      setExpenseRecipient('');
      refetchVault();
      queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(`Erro ao registrar saída: ${err.message || err}`);
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title="Gestão e Rastreabilidade do Dinheiro em Cofre"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-[var(--text-tertiary)]">
          <span>Data Base: {targetDate}</span>
          <Button size="sm" variant="outline" onClick={onClose} className="border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toolbar Superior com Subtítulo e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Composição fração a fração do dinheiro recebido nas OSs e baixas inteligentes de despesas em espécie
              </p>
              <div className="flex items-center gap-2 mt-1">
                {frozenSnapshot ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] gap-1">
                    <Lock className="w-3 h-3" /> Snapshot Histórico Congelado (Fechado)
                  </Badge>
                ) : isEditing ? (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] gap-1">
                    <Sparkles className="w-3 h-3" /> Modo Edição / Descongelamento Ativo
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpenseModalOpen(true)}
            className="border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-xs gap-1.5 h-8 font-medium shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Saída em Dinheiro
          </Button>
        </div>

        {/* Cards de Métricas Consolidadas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Em Trânsito / No Cofre
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-amber-300">
              {formatCurrency(metrics.totalEmTransito)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Conta no Caixa Atual</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Depositado no Banco
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-emerald-300">
              {formatCurrency(metrics.totalDepositado)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Entrou no Extrato OFX</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Saídas / Despesas Pagas
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-rose-300">
              {formatCurrency(metrics.totalSaidas)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Abatido do Cofre</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]"></span>
              Total Movimentado
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-[var(--text-primary)]">
              {formatCurrency(metrics.totalGeral)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{vaultItems.length} frações registradas</div>
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="flex border-b border-[var(--border-subtle)] gap-2">
          <button
            onClick={() => setActiveTab('entries')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'entries'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Composição Fração a Fração ({vaultItems.length})
          </button>

          <button
            onClick={() => setActiveTab('unmatched_bills')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'unmatched_bills'
                ? 'border-primary text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Sugestões de Saídas (Contas sem OFX)
            {unmatchedCount > 0 && (
              <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded-full font-mono">
                {unmatchedCount}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo Aba 1: Frações em Dinheiro */}
        {activeTab === 'entries' && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por OS, cliente, placa ou loja..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <select
                  value={storeFilter}
                  onChange={e => setStoreFilter(e.target.value)}
                  className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ALL">Todas as Lojas</option>
                  {stores.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <span className="text-[11px] text-[var(--text-tertiary)] self-end sm:self-auto whitespace-nowrap">
                Mostrando {filteredVaultItems.length} de {vaultItems.length} frações
              </span>
            </div>

            {/* Tabela de Frações de Dinheiro */}
            {isLoadingVault ? (
              <div className="py-12 flex justify-center items-center">
                <LoadingSpinner size="md" />
              </div>
            ) : filteredVaultItems.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                Nenhum lançamento em dinheiro encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-canvas)] shadow-inner">
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead className="bg-[var(--bg-surface)] text-[var(--text-tertiary)] text-[10px] uppercase font-semibold border-b border-[var(--border-subtle)] sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[130px]">Loja</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[110px]">OS / Placa</th>
                        <th className="py-2.5 px-3.5 min-w-[200px]">Cliente / Descrição</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[90px]">Data</th>
                        <th className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[100px]">Valor</th>
                        <th className="py-2.5 px-3.5 text-center whitespace-nowrap min-w-[100px]">Status</th>
                        <th className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[130px]">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]/60 font-mono">
                      {filteredVaultItems.map(item => {
                        const isSaida = item.notes?.includes('[SAIDA_DESPESA]') || item.description?.toUpperCase().includes('[SAÍDA');
                        const isDepositado = item.status === 'depositado';
                        const isEmTransito = item.status === 'em_transito' || item.status === 'pending';

                        return (
                          <tr key={item.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                            <td className="py-2.5 px-3.5 font-sans font-medium text-[var(--text-primary)] whitespace-nowrap">
                              {storeNameMap[item.store_id] || item.store_id}
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              {item.os_number_ref ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-amber-300 text-[11px] font-semibold border border-[var(--border-subtle)]">
                                    OS #{item.os_number_ref}
                                  </span>
                                  {item.plate && (
                                    <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                                      {item.plate}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--text-tertiary)] text-[11px]">Manual / Avulso</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-sans text-[var(--text-secondary)] text-[11px]">
                              <div className="font-medium text-[var(--text-primary)] truncate max-w-xs">
                                {item.client_name || item.description}
                              </div>
                              {item.client_name && (
                                <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-xs">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-[var(--text-tertiary)] text-[11px] font-sans whitespace-nowrap">
                              {item.entry_date}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-[var(--text-primary)] font-sans tabular-nums whitespace-nowrap">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              {isSaida ? (
                                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px]">
                                  Saída / Despesa
                                </Badge>
                              ) : isEmTransito ? (
                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]">
                                  No Cofre
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                                  Depositado
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                              {isEmTransito && !frozenSnapshot && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleDepositMutation.mutate({ id: item.id, nextStatus: 'depositado' })}
                                  className="h-7 px-2.5 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer whitespace-nowrap"
                                >
                                  Marcar Depositado
                                </Button>
                              )}
                              {isDepositado && !isSaida && !frozenSnapshot && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDepositMutation.mutate({ id: item.id, nextStatus: 'em_transito' })}
                                  className="h-7 px-2.5 text-[11px] text-[var(--text-tertiary)] hover:text-amber-300 cursor-pointer whitespace-nowrap"
                                >
                                  Voltar p/ Cofre
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba 2: Sugestões de Saídas */}
        {activeTab === 'unmatched_bills' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-secondary/30 border border-[var(--border-subtle)] rounded-xl flex items-start gap-3 text-xs text-[var(--text-secondary)]">
              <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Motor de Recomendação de Pagamentos em Dinheiro Físico:</span>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                  Estas contas do arquivo <strong>BuscaContasAPagar.xls</strong> não tiveram débito correspondente no extrato bancário (OFX).
                  Se foram pagas com o dinheiro vivo do cofre de alguma filial, dê baixa abaixo para abater o valor do cofre e sanar a despesa sem distorções contábeis.
                </p>
              </div>
            </div>

            {/* Sub-filtros para Contas */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-tertiary)] font-medium">Exibir:</span>
              <button
                onClick={() => setBillsFilter('unmatched')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  billsFilter === 'unmatched'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]'
                }`}
              >
                💡 Não Conciliadas no OFX ({unmatchedCount})
              </button>
              <button
                onClick={() => setBillsFilter('paid_cash')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  billsFilter === 'paid_cash'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]'
                }`}
              >
                Pagas em Dinheiro ({allBills.filter(b => b.match_status === 'paid_cash').length})
              </button>
              <button
                onClick={() => setBillsFilter('ignored')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  billsFilter === 'ignored'
                    ? 'bg-muted text-foreground border border-border'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]'
                }`}
              >
                Ignoradas ({allBills.filter(b => b.match_status === 'ignored').length})
              </button>
              <button
                onClick={() => setBillsFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  billsFilter === 'all'
                    ? 'bg-secondary text-secondary-foreground border border-[var(--border-subtle)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]'
                }`}
              >
                Todas ({allBills.length})
              </button>
            </div>

            {isLoadingBills ? (
              <div className="py-12 flex justify-center items-center">
                <LoadingSpinner size="md" />
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                Nenhuma conta encontrada para o filtro selecionado.
              </div>
            ) : (
              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-canvas)] shadow-inner">
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead className="bg-[var(--bg-surface)] text-[var(--text-tertiary)] text-[10px] uppercase font-semibold border-b border-[var(--border-subtle)] sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[180px]">Favorecido / Título</th>
                        <th className="py-2.5 px-3.5 whitespace-nowrap min-w-[120px]">Categoria</th>
                        <th className="py-2.5 px-3.5 min-w-[180px]">Descrição</th>
                        <th className="py-2.5 px-3.5 min-w-[180px]">Loja do Cofre</th>
                        <th className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[100px]">Valor</th>
                        <th className="py-2.5 px-3.5 text-right whitespace-nowrap min-w-[150px]">Ação Consciente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]/60 font-mono">
                      {filteredBills.map(bill => {
                        const isPaidCash = bill.match_status === 'paid_cash';
                        const isIgnored = bill.match_status === 'ignored';
                        const currentChosenStore = selectedStoreByBill[bill.id] || bill.store_id || 'st-01';
                        const storeAvailable = availableInTransitByStore[currentChosenStore] || 0;

                        return (
                          <tr key={bill.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                            <td className="py-2.5 px-3.5 font-sans font-medium text-[var(--text-primary)]">
                              <div>{bill.title}</div>
                              {isPaidCash && (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[9px] mt-0.5">
                                  Baixa Realizada em Dinheiro
                                </Badge>
                              )}
                              {isIgnored && (
                                <Badge variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-400 text-[9px] mt-0.5">
                                  Ignorada
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 font-sans text-[var(--text-tertiary)] text-[11px] whitespace-nowrap">
                              {bill.category}
                            </td>
                            <td className="py-2.5 px-3.5 font-sans text-[var(--text-secondary)] text-[11px] max-w-xs truncate">
                              {bill.description || '—'}
                            </td>
                            <td className="py-2.5 px-3.5 font-sans whitespace-nowrap">
                              {!isPaidCash ? (
                                <select
                                  value={currentChosenStore}
                                  onChange={e => setSelectedStoreByBill(prev => ({ ...prev, [bill.id]: e.target.value }))}
                                  className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer"
                                >
                                  {stores.map((s: any) => {
                                    const c = availableInTransitByStore[s.id] || 0;
                                    return (
                                      <option key={s.id} value={s.id}>
                                        {s.name} (Cofre: {formatCurrency(c)})
                                      </option>
                                    );
                                  })}
                                </select>
                              ) : (
                                <span className="text-[var(--text-tertiary)] text-[11px]">
                                  {storeNameMap[bill.store_id || ''] || 'Loja Vinculada'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-amber-300 font-sans tabular-nums whitespace-nowrap">
                              {formatCurrency(bill.amount)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-sans whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isPaidCash && !isIgnored && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        payBillWithCashMutation.mutate({
                                          bill,
                                          storeIdChosen: currentChosenStore
                                        });
                                      }}
                                      disabled={payBillWithCashMutation.isPending || storeAvailable < bill.amount}
                                      title={storeAvailable < bill.amount ? `Cofre da filial com apenas ${formatCurrency(storeAvailable)}. Selecione outra loja com saldo.` : undefined}
                                      className="h-7 px-2.5 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                                    >
                                      <ArrowDownToLine className="w-3.5 h-3.5 text-amber-400" />
                                      Dar Baixa como Saída
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => ignoreBillMutation.mutate({ billId: bill.id, nextStatus: 'ignored' })}
                                      className="h-7 px-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                                      title="Ignorar esta conta na sugestão de baixa em dinheiro"
                                    >
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      Ignorar
                                    </Button>
                                  </>
                                )}

                                {isPaidCash && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => undoPayBillMutation.mutate(bill)}
                                    disabled={undoPayBillMutation.isPending}
                                    className="h-7 px-2 text-[11px] text-[var(--text-tertiary)] hover:text-rose-300 gap-1 cursor-pointer whitespace-nowrap"
                                    title="Estornar a baixa em dinheiro e devolver o valor ao cofre"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                    Desfazer Baixa
                                  </Button>
                                )}

                                {isIgnored && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => ignoreBillMutation.mutate({ billId: bill.id, nextStatus: 'unmatched' })}
                                    className="h-7 px-2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                                  >
                                    Reabrir
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Secundário: Registrar Saída Manual em Dinheiro */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Registrar Saída / Pagamento em Dinheiro Vivo
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Registre uma retirada ou despesa paga com o dinheiro em espécie do cofre de uma loja. O saldo em trânsito será abatido automaticamente.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[var(--text-tertiary)] block mb-1">Loja de Saída</label>
                <select
                  value={expenseStore}
                  onChange={e => setExpenseStore(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  {stores.map((s: any) => {
                    const c = availableInTransitByStore[s.id] || 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} (Disponível no Cofre: {formatCurrency(c)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[var(--text-tertiary)] block mb-1">Valor da Saída (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount || ''}
                  onChange={e => setExpenseAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2 font-mono text-[var(--text-primary)] font-bold focus:outline-none focus:border-amber-500/50"
                />
                {expenseStore && (
                  <span className="text-[10px] text-amber-400/80 mt-0.5 block">
                    Saldo disponível no cofre: {formatCurrency(availableInTransitByStore[expenseStore] || 0)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[var(--text-tertiary)] block mb-1">Categoria da Despesa</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="Pequenas Despesas / Operacional">Pequenas Despesas / Operacional</option>
                  <option value="Adiantamento / Pró-Labore">Adiantamento / Pró-Labore</option>
                  <option value="Peças e Materiais de Loja">Peças e Materiais de Loja</option>
                  <option value="Serviços Terceiros">Serviços Terceiros</option>
                  <option value="Outros Pagamentos em Espécie">Outros Pagamentos em Espécie</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-tertiary)] block mb-1">Motivo / Descrição</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="Ex: Compra de material de limpeza, lanche, adiantamento..."
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-[var(--text-tertiary)] block mb-1">Favorecido / Para Quem</label>
                <input
                  type="text"
                  value={expenseRecipient}
                  onChange={e => setExpenseRecipient(e.target.value)}
                  placeholder="Nome da pessoa ou fornecedor (opcional)"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button size="sm" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => createExpenseMutation.mutate()}
                disabled={createExpenseMutation.isPending || expenseAmount <= 0}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold cursor-pointer"
              >
                {createExpenseMutation.isPending ? 'Salvando...' : 'Confirmar Saída'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
