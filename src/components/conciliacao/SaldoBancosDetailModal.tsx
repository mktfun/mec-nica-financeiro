import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import {
  Landmark,
  Building2,
  Banknote,
  CreditCard,
  Search,
  CheckCircle2,
  ArrowDownToLine,
  Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StoreReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { toast } from 'sonner';

interface SaldoBancosDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  stores?: StoreReconciliationSummary[];
}

export function SaldoBancosDetailModal({
  isOpen,
  onClose,
  targetDate,
  stores = []
}: SaldoBancosDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fallback via RPC se stores vier vazio
  const { data: fallbackSummary } = useQuery({
    queryKey: ['saldo-bancos-modal-summary', targetDate],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate });
      return data;
    },
    enabled: isOpen && stores.length === 0
  });

  const effectiveStores = stores.length > 0 ? stores : (fallbackSummary?.stores || []);

  // Mutação para dar baixa em dinheiro no cofre
  const clearCashMutation = useMutation({
    mutationFn: async (vaultId: string) => {
      const { error } = await supabase
        .from('store_cash_vault')
        .update({
          status: 'depositado',
          deposited_at: new Date().toISOString()
        })
        .eq('id', vaultId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Baixa de depósito realizada com sucesso! O dinheiro foi transferido para o banco.');
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['saldo-bancos-modal-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      setDepositingId(null);
    },
    onError: (err: any) => {
      toast.error('Erro ao dar baixa: ' + (err.message || err));
      setDepositingId(null);
    }
  });

  // Consome 100% os dados calculados diretamente no Postgres/RPC
  const rows = useMemo(() => {
    return effectiveStores.map((s: any) => {
      const saldoOfxPuro = Number(s.saldo_banco_ofx ?? 0);
      const dinheiroLoja = Number(s.dinheiro_loja ?? 0);
      const maquininhaNaoEntrou = Number(s.nao_entrou_valor ?? 0);
      const saldoConsolidado = Number(s.saldo_banco ?? (saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou));
      const vaultEntries = Array.isArray(s.vault_entries) ? s.vault_entries : [];
      const activeVaultEntry = vaultEntries.find((v: any) => v && v.status === 'em_transito');

      return {
        storeId: s.store_id,
        storeName: s.store_name,
        saldoOfxPuro,
        dinheiroLoja,
        activeVaultEntry,
        maquininhaNaoEntrou,
        saldoConsolidado,
        statusCompensacao: s.status_compensacao || 'entrou'
      };
    });
  }, [effectiveStores]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => r.storeName.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  // Totais Gerais
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, curr) => ({
        ofx: acc.ofx + curr.saldoOfxPuro,
        dinheiro: acc.dinheiro + curr.dinheiroLoja,
        maquininhas: acc.maquininhas + curr.maquininhaNaoEntrou,
        total: acc.total + curr.saldoConsolidado
      }),
      { ofx: 0, dinheiro: 0, maquininhas: 0, total: 0 }
    );
  }, [rows]);

  const handleDarBaixa = (vaultId: string, storeName: string, amount: number) => {
    if (confirm(`Confirmar o depósito bancário de ${formatCurrency(amount)} da filial ${storeName}?`)) {
      setDepositingId(vaultId);
      clearCashMutation.mutate(vaultId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raio-X de Saldos Bancários & Dinheiro por Filial"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Header Cards com o Resumo dos 4 Componentes no padrão visual do sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-xs font-semibold uppercase tracking-wider">
              <Landmark className="w-4 h-4 text-[var(--color-accent-light-blue)]" />
              Extratos OFX (Bancos)
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-[var(--text-primary)]">
              {formatCurrency(totals.ofx)}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">10 contas Itaú ativas</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-amber-500/30 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Banknote className="w-4 h-4 text-amber-400" />
              Dinheiro no Cofre
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-amber-300">
              {formatCurrency(totals.dinheiro)}
            </div>
            <div className="text-[11px] text-amber-400/70">Em trânsito nas lojas</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-emerald-500/30 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Maquininhas (A Compensar)
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-emerald-300">
              {formatCurrency(totals.maquininhas)}
            </div>
            <div className="text-[11px] text-emerald-400/70">Vendas Rede a compensar</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-[var(--color-primary)]/40 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />
              Total Consolidado
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-[var(--text-primary)]">
              {formatCurrency(totals.total)}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">Pilar 1 do Fechamento</div>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar por filial..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            Exibindo <span className="font-semibold text-[var(--text-primary)]">{filteredRows.length}</span> filiais
          </div>
        </div>

        {/* Tabela Ampla e Arejada por Filial */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] text-xs font-semibold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3 px-5">Filial / Loja</th>
                <th className="py-3 px-5 text-right">Extrato OFX (Itaú)</th>
                <th className="py-3 px-5 text-center">Dinheiro no Cofre / Loja</th>
                <th className="py-3 px-5 text-right">Maquininhas (Rede)</th>
                <th className="py-3 px-5 text-right">Saldo Consolidado</th>
                <th className="py-3 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredRows.map(row => (
                <tr key={row.storeId} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                  <td className="py-3.5 px-5 font-medium text-[var(--text-primary)] flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                    <span className="whitespace-nowrap">{row.storeName}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                    {formatCurrency(row.saldoOfxPuro)}
                  </td>
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {row.dinheiroLoja > 0 ? (
                      <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
                        <span className="font-mono font-semibold text-amber-300">
                          {formatCurrency(row.dinheiroLoja)}
                        </span>
                        {row.activeVaultEntry ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDarBaixa(row.activeVaultEntry.id, row.storeName, row.dinheiroLoja)}
                            disabled={depositingId === row.activeVaultEntry.id}
                            className="h-6 px-2 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 gap-1"
                            title="Clique para confirmar o depósito deste valor no banco"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            {depositingId === row.activeVaultEntry.id ? 'Baixando...' : 'Dar Baixa'}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-medium">No Cofre</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums whitespace-nowrap">
                    {row.maquininhaNaoEntrou > 0 ? (
                      <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {formatCurrency(row.maquininhaNaoEntrou)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[var(--text-primary)] whitespace-nowrap">
                    {formatCurrency(row.saldoConsolidado)}
                  </td>
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    <Badge variant={row.dinheiroLoja > 0 || row.maquininhaNaoEntrou > 0 ? 'warning' : 'success'}>
                      {row.dinheiroLoja > 0 ? 'Com Dinheiro' : row.maquininhaNaoEntrou > 0 ? 'A Compensar' : 'Conciliado'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--bg-surface-elevated)] font-bold border-t border-[var(--border-subtle)]">
              <tr>
                <td className="py-4 px-5 text-[var(--text-primary)]">TOTAIS CONSOLIDADOS</td>
                <td className="py-4 px-5 text-right font-mono tabular-nums text-[var(--text-primary)]">{formatCurrency(totals.ofx)}</td>
                <td className="py-4 px-5 text-center font-mono tabular-nums text-amber-300 font-semibold">{formatCurrency(totals.dinheiro)}</td>
                <td className="py-4 px-5 text-right font-mono tabular-nums text-emerald-300 font-semibold">{formatCurrency(totals.maquininhas)}</td>
                <td className="py-4 px-5 text-right font-mono tabular-nums text-[var(--color-primary)] font-extrabold">{formatCurrency(totals.total)}</td>
                <td className="py-4 px-5 text-center">
                  <Badge variant="success">10 Lojas OK</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}
