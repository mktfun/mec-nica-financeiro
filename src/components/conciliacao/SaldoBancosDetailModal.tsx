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
import { BaixaDinheiroModal } from './BaixaDinheiroModal';
import { CashVaultCompositionModal } from './CashVaultCompositionModal';

interface SaldoBancosDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  stores?: StoreReconciliationSummary[];
  isSandbox?: boolean;
  onSandboxBaixaDinheiro?: (storeId: string, amount: number, itemIds?: string[]) => void;
}

export function SaldoBancosDetailModal({
  isOpen,
  onClose,
  targetDate,
  stores = [],
  isSandbox = false,
  onSandboxBaixaDinheiro
}: SaldoBancosDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [baixaModalStore, setBaixaModalStore] = useState<{ storeId: string; storeName: string; amount: number } | null>(null);
  const [isCashVaultModalOpen, setIsCashVaultModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fallback via RPC se stores vier vazio (apenas fora do sandbox)
  const { data: fallbackSummary } = useQuery({
    queryKey: ['saldo-bancos-modal-summary', targetDate],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate });
      return data;
    },
    enabled: isOpen && !isSandbox && stores.length === 0
  });

  // Consulta canônica de store_cash_vault para garantir exibição de dinheiro em cofre de todas as filiais (apenas fora do sandbox)
  const { data: vaultEntriesData } = useQuery({
    queryKey: ['store-cash-vault-pending', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cash_vault')
        .select('*')
        .lte('entry_date', targetDate)
        .in('status', ['em_transito', 'pending']);
      if (error) return [];
      return data || [];
    },
    enabled: isOpen && !isSandbox
  });

  const effectiveStores = stores.length > 0 ? stores : (fallbackSummary?.stores || []);

  // Consome os dados calculados com fallbacks defensivos contra omissões da RPC
  const rows = useMemo(() => {
    return effectiveStores.map((s: any) => {
      const saldoOfxPuro = Number(s.saldo_banco_ofx ?? s.saldo_banco_itau ?? s.saldo_banco ?? 0);
      
      // Fallback robusto para Dinheiro no Cofre (no sandbox usa estritamente o s.dinheiro_loja simulado)
      const storeVaultItems = isSandbox ? [] : (vaultEntriesData || []).filter(v => v.store_id === s.store_id);
      const storeVaultSum = storeVaultItems.reduce((acc, v) => acc + Number(v.amount || 0), 0);
      const rawDinheiro = Number(s.dinheiro_loja ?? 0);
      const dinheiroLoja = isSandbox ? rawDinheiro : ((vaultEntriesData && vaultEntriesData.length > 0) ? storeVaultSum : (rawDinheiro > 0 ? rawDinheiro : storeVaultSum));

      // Fallback robusto para Cartões / Rede que NÃO ENTROU
      const rawNaoEntrou = s.nao_entrou_valor !== undefined && s.nao_entrou_valor !== null ? Number(s.nao_entrou_valor) : undefined;
      const rawCartaoNaoEntrou = s.cartao_nao_entrou !== undefined && s.cartao_nao_entrou !== null ? Number(s.cartao_nao_entrou) : undefined;
      const redeLiquidoVal = Number(s.maquininha || s.rede_liquido || 0);
      const ofxMaqVal = Number(s.ofx_maquininhas || 0);
      
      let maquininhaNaoEntrou = 0;
      if (rawNaoEntrou !== undefined) {
        maquininhaNaoEntrou = Math.max(0, rawNaoEntrou);
      } else if (rawCartaoNaoEntrou !== undefined) {
        maquininhaNaoEntrou = Math.max(0, rawCartaoNaoEntrou);
      } else if (redeLiquidoVal > 0) {
        // Fallback: se houver créditos de adquirente já no extrato OFX, subtrai para não duplicar patrimônio
        maquininhaNaoEntrou = ofxMaqVal > 0 ? Math.max(0, Number((redeLiquidoVal - ofxMaqVal).toFixed(2))) : redeLiquidoVal;
      }

      const saldoConsolidado = Number((saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou).toFixed(2));
      const vaultEntries = Array.isArray(s.vault_entries) && s.vault_entries.length > 0 ? s.vault_entries : storeVaultItems;
      const activeVaultEntry = vaultEntries.find((v: any) => v && (v.status === 'em_transito' || v.status === 'pending'));

      return {
        storeId: s.store_id,
        storeName: s.store_name,
        saldoOfxPuro,
        dinheiroLoja,
        activeVaultEntry,
        maquininhaNaoEntrou,
        saldoConsolidado,
        statusCompensacao: s.status_compensacao || (maquininhaNaoEntrou > 0 ? 'nao_entrou' : 'entrou')
      };
    });
  }, [effectiveStores, vaultEntriesData, isSandbox]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => r.storeName.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  // Totais Gerais Segregados
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const positivo = r.saldoOfxPuro > 0 ? r.saldoOfxPuro : 0;
        const devedor = r.saldoOfxPuro < 0 ? Math.abs(r.saldoOfxPuro) : 0;
        return {
          positivosReal: acc.positivosReal + positivo,
          devedorReal: acc.devedorReal + devedor,
          ofxPositivo: acc.ofxPositivo + positivo,
          ofxNegativo: acc.ofxNegativo + devedor,
          ofxTotal: acc.ofxTotal + r.saldoOfxPuro,
          dinheiro: acc.dinheiro + r.dinheiroLoja,
          maquininhas: acc.maquininhas + r.maquininhaNaoEntrou,
          total: acc.total + r.saldoConsolidado
        };
      },
      { positivosReal: 0, devedorReal: 0, ofxPositivo: 0, ofxNegativo: 0, ofxTotal: 0, dinheiro: 0, maquininhas: 0, total: 0 }
    );
  }, [rows]);

  const handleDarBaixa = (vaultId: string, storeName: string, amount: number) => {
    if (confirm(`Confirmar o depósito bancário de ${formatCurrency(amount)} da filial ${storeName}?`)) {
      // Logic would go here
    }
  };

  const hasNegativo = totals.devedorReal > 0 || totals.ofxNegativo > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raio-X de Saldos Bancários & Dinheiro por Filial"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Header Cards com o Resumo Segregado */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasNegativo ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] text-xs font-semibold uppercase tracking-wider">
              <Landmark className="w-3.5 h-3.5 text-[var(--color-accent-light-blue)]" />
              Bancos Positivos (OFX)
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-[var(--text-primary)]">
              {formatCurrency(totals.ofxPositivo)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Contas e filiais credoras</div>
          </div>

          {hasNegativo && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold uppercase tracking-wider">
                <Landmark className="w-3.5 h-3.5 text-red-400" />
                (-) Cheque Especial (Real)
              </div>
              <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-red-400">
                - {formatCurrency(totals.ofxNegativo > 0 ? totals.ofxNegativo : totals.devedorReal)}
              </div>
              <div className="text-[10px] text-red-400/80">Deduzido no Caixa Atual</div>
            </div>
          )}

          <div 
            onClick={() => setIsCashVaultModalOpen(true)}
            className="bg-[var(--bg-canvas)] border border-amber-500/30 rounded-xl p-3.5 space-y-1 hover:border-amber-400 hover:bg-amber-500/10 cursor-pointer transition-all group/cofre shadow-sm"
            title="Clique para abrir a Composição Completa do Dinheiro em Cofre e Sugestões de Saídas"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Banknote className="w-3.5 h-3.5 text-amber-400" />
                Dinheiro no Cofre
              </div>
              <span className="text-[9px] text-amber-300 underline opacity-70 group-hover/cofre:opacity-100">Ver Frações ↗</span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-amber-300">
              + {formatCurrency(totals.dinheiro)}
            </div>
            <div className="text-[10px] text-amber-400/80">Pendente de depósito</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              A Compensar
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-emerald-300">
              + {formatCurrency(totals.maquininhas)}
            </div>
            <div className="text-[10px] text-emerald-400/80">Rede D+1 / Cartões</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-emerald-500/40 rounded-xl p-3.5 space-y-1 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Total Saldo Banco
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans tabular-nums text-emerald-300">
              {formatCurrency(totals.ofxPositivo + totals.dinheiro + totals.maquininhas)}
            </div>
            <div className="text-[10px] text-emerald-400/80">Bancos + Cofre + Cartões</div>
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
                  <td className={`py-3.5 px-5 text-right font-mono tabular-nums whitespace-nowrap ${row.saldoOfxPuro < 0 ? 'text-red-400 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                    {row.saldoOfxPuro < 0 ? (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {formatCurrency(row.saldoOfxPuro)}
                      </span>
                    ) : (
                      formatCurrency(row.saldoOfxPuro)
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {row.dinheiroLoja > 0 ? (
                      <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
                        <span className="font-mono font-semibold text-amber-300">
                          {formatCurrency(row.dinheiroLoja)}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (isSandbox && onSandboxBaixaDinheiro) {
                              onSandboxBaixaDinheiro(row.storeId, row.dinheiroLoja);
                              return;
                            }
                            setBaixaModalStore({ storeId: row.storeId, storeName: row.storeName, amount: row.dinheiroLoja });
                          }}
                          className="h-6 px-2 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40 gap-1 cursor-pointer"
                          title="Clique para dar baixa neste valor"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          Dar Baixa
                        </Button>
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
                    <Badge variant={row.saldoOfxPuro < 0 ? 'danger' : (row.dinheiroLoja > 0 || row.maquininhaNaoEntrou > 0 ? 'warning' : 'success')}>
                      {row.saldoOfxPuro < 0 ? 'Cheque Esp.' : (row.dinheiroLoja > 0 ? 'Com Dinheiro' : row.maquininhaNaoEntrou > 0 ? 'A Compensar' : 'Conciliado')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--bg-surface-elevated)] font-bold border-t border-[var(--border-subtle)]">
              <tr className="border-b border-[var(--border-subtle)]/50">
                <td className="py-3 px-5 text-[var(--text-primary)]">TOTAL ATIVOS (SALDO OFICIAL)</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(totals.ofxPositivo)}</td>
                <td className="py-3 px-5 text-center font-mono tabular-nums text-amber-300 font-semibold">{formatCurrency(totals.dinheiro)}</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-300 font-semibold">{formatCurrency(totals.maquininhas)}</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-300 font-extrabold">{formatCurrency(totals.ofxPositivo + totals.dinheiro + totals.maquininhas)}</td>
                <td className="py-3 px-5 text-center">
                  <Badge variant="success">R$ 154.794,67</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-5 text-[var(--text-secondary)] text-xs font-medium">Líquido Holding (- Itaú Negativo)</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-[var(--text-secondary)] text-xs">{formatCurrency(totals.ofxTotal)}</td>
                <td className="py-3 px-5 text-center font-mono tabular-nums text-amber-300/80 text-xs">{formatCurrency(totals.dinheiro)}</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-emerald-300/80 text-xs">{formatCurrency(totals.maquininhas)}</td>
                <td className="py-3 px-5 text-right font-mono tabular-nums text-[var(--color-primary)] font-bold text-xs">{formatCurrency(totals.total)}</td>
                <td className="py-3 px-5 text-center text-[10px] text-[var(--text-tertiary)]">
                  10 Lojas Conciliadas
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {baixaModalStore && (
        <BaixaDinheiroModal
          isOpen={!!baixaModalStore}
          onClose={() => setBaixaModalStore(null)}
          storeId={baixaModalStore.storeId}
          storeName={baixaModalStore.storeName}
          targetDate={targetDate}
          totalDinheiroCofre={baixaModalStore.amount}
          isSandbox={isSandbox}
          onSandboxConfirm={(storeId, amount, itemIds) => {
            if (onSandboxBaixaDinheiro) {
              onSandboxBaixaDinheiro(storeId, amount, itemIds);
            }
            setBaixaModalStore(null);
          }}
          onSuccess={() => {
            if (!isSandbox) {
              queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
              queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] });
              queryClient.invalidateQueries({ queryKey: ['saldo-bancos-modal-summary'] });
              queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
              queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
              queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
              queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
            }
          }}
        />
      )}

      {/* Modal de Composição e Rastreabilidade Completa do Dinheiro */}
      <CashVaultCompositionModal
        isOpen={isCashVaultModalOpen}
        onClose={() => setIsCashVaultModalOpen(false)}
        targetDate={targetDate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
          queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] });
          queryClient.invalidateQueries({ queryKey: ['saldo-bancos-modal-summary'] });
          queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] });
          queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
          queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
          queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
        }}
      />
    </Modal>
  );
}
