import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useConciliationBreakdown } from '@/hooks/useConciliationBreakdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Landmark, TrendingDown, ShoppingBag, CreditCard,
  AlertTriangle, Camera, Zap, Info, Loader2
} from 'lucide-react';

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string | null;
  storeName: string;
  date: string | null;
}

type Tab = 'entradas' | 'saidas' | 'os' | 'taxas';

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return iso?.substring(0, 16) || '—';
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-tertiary)]">
      <Info size={28} className="mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

const TAB_DEFS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'entradas', label: 'Entradas (Banco)', icon: Landmark, color: 'text-[var(--color-accent-light-blue)]' },
  { id: 'saidas',   label: 'Saídas (Despesas)', icon: TrendingDown, color: 'text-[var(--color-accent-danger)]' },
  { id: 'os',       label: 'Na Loja OS', icon: ShoppingBag, color: 'text-[var(--color-accent-warning)]' },
  { id: 'taxas',    label: 'Taxas Maquininha', icon: CreditCard, color: 'text-[var(--color-accent-teal)]' },
];

export function BreakdownModal({ isOpen, onClose, storeId, storeName, date }: BreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('entradas');

  const { data, isLoading, isError } = useConciliationBreakdown(
    isOpen ? storeId : null,
    isOpen ? date : null
  );

  const dateLabel = date
    ? format(new Date(date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔍 Raio-X — ${storeName}`}
      position="right"
    >
      <div className="flex flex-col gap-4 min-h-[60vh]">
        {/* Data */}
        <p className="text-xs text-[var(--text-tertiary)] -mt-2">{dateLabel}</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-canvas)] rounded-xl p-1 border border-[var(--border-subtle)]">
          {TAB_DEFS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={14} className={isActive ? t.color : ''} />
                <span className="leading-tight text-center hidden sm:block">{t.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] py-12">
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-2 text-[var(--color-accent-danger)] text-sm bg-[var(--color-accent-danger)]/10 rounded-lg p-3">
            <AlertTriangle size={16} />
            Erro ao carregar dados do banco. Tente novamente.
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <>
            {/* ABA 1 — ENTRADAS OFX */}
            {activeTab === 'entradas' && (
              <div className="flex flex-col gap-3">
                {/* Badge de fonte */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                    data.bank_total_source === 'snapshot_reconciliations'
                      ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {data.bank_total_source === 'snapshot_reconciliations'
                      ? <><Camera size={10} /> Snapshot Salvo</>
                      : <><Zap size={10} /> Leitura ao Vivo</>}
                  </span>
                  {data.bank_total_warning === 'trigger_desatualizado' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                      <AlertTriangle size={10} /> Trigger desatualizado — banco zerado mas OFX tem dados
                    </span>
                  )}
                </div>

                {/* Tabela de entradas */}
                {data.ofx_in.transactions.length === 0 ? (
                  <EmptyState label="Nenhuma entrada OFX encontrada para este dia." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Data/Hora</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Descrição</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">FITID</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.ofx_in.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(tx.occurred_at)}</td>
                            <td className="px-3 py-2.5 text-xs text-[var(--text-primary)] max-w-[160px] truncate" title={tx.description}>{tx.description}</td>
                            <td className="px-3 py-2.5 text-[10px] font-mono text-[var(--text-tertiary)]">{tx.fitid || '—'}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-[var(--color-accent-teal)] text-right tabular-nums whitespace-nowrap">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">Total Entradas</td>
                          <td className="px-3 py-2 text-sm font-bold text-[var(--color-accent-light-blue)] text-right tabular-nums">
                            {formatCurrency(data.ofx_in.total)}
                          </td>
                        </tr>
                        {data.bank_total_source === 'snapshot_reconciliations' && (
                          <tr className="bg-[var(--bg-canvas)]">
                            <td colSpan={3} className="px-3 pb-2 text-[10px] text-[var(--text-tertiary)]">Snapshot salvo (bank_total)</td>
                            <td className="px-3 pb-2 text-xs font-semibold text-[var(--color-accent-light-blue)] text-right tabular-nums">
                              {formatCurrency(data.bank_total)}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2 — SAÍDAS OFX */}
            {activeTab === 'saidas' && (
              <div className="flex flex-col gap-3">
                {data.ofx_out.transactions.length === 0 ? (
                  <EmptyState label="Nenhuma saída OFX encontrada para este dia." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Data/Hora</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Descrição</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">FITID</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.ofx_out.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(tx.occurred_at)}</td>
                            <td className="px-3 py-2.5 text-xs text-[var(--text-primary)] max-w-[160px] truncate" title={tx.description}>{tx.description}</td>
                            <td className="px-3 py-2.5 text-[10px] font-mono text-[var(--text-tertiary)]">{tx.fitid || '—'}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-[var(--color-accent-danger)] text-right tabular-nums whitespace-nowrap">
                              -{formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">Total Saídas</td>
                          <td className="px-3 py-2 text-sm font-bold text-[var(--color-accent-danger)] text-right tabular-nums">
                            -{formatCurrency(data.ofx_out.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABA 3 — NA LOJA OS */}
            {activeTab === 'os' && (
              <div className="flex flex-col gap-3">
                {/* Badge de fonte */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                    data.na_loja.source === 'snapshot_reconciliations'
                      ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {data.na_loja.source === 'snapshot_reconciliations'
                      ? <><Camera size={10} /> Snapshot Salvo</>
                      : <><Zap size={10} /> Cálculo ao Vivo</>}
                  </span>
                </div>

                {/* Subtotais */}
                {(data.na_loja.previous_month > 0 || data.na_loja.current_month > 0) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--bg-canvas)] rounded-lg p-2 border border-[var(--border-subtle)]">
                      <p className="text-[10px] text-[var(--text-tertiary)]">Mês Atual</p>
                      <p className="text-sm font-bold text-[var(--color-accent-teal)] tabular-nums">{formatCurrency(data.na_loja.current_month)}</p>
                    </div>
                    <div className="bg-amber-500/5 rounded-lg p-2 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400">Mês Anterior</p>
                      <p className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(data.na_loja.previous_month)}</p>
                    </div>
                  </div>
                )}

                {data.na_loja.transactions.length === 0 ? (
                  <EmptyState label="Nenhuma OS encontrada para este dia." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Nº OS</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Abertura</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Status</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Total</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Pago</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Restante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.na_loja.transactions.map((os, idx) => (
                          <tr
                            key={os.os_number + idx}
                            className={`transition-colors ${
                              os.is_previous_month
                                ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                : 'hover:bg-[var(--bg-surface-hover)]'
                            }`}
                          >
                            <td className="px-3 py-2.5 text-xs font-mono text-[var(--text-primary)]">
                              {os.is_previous_month && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-semibold mr-1">
                                  📅 Ant.
                                </span>
                              )}
                              #{os.os_number}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(os.opened_at)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                os.status === 'finalizada'
                                  ? 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]'
                                  : 'bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning)]'
                              }`}>
                                {os.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right text-[var(--text-primary)]">{formatCurrency(os.total_value)}</td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right text-[var(--color-accent-teal)]">{formatCurrency(os.paid_value)}</td>
                            <td className={`px-3 py-2.5 text-xs tabular-nums text-right font-semibold ${
                              os.remaining > 0 ? 'text-[var(--color-accent-warning)]' : 'text-[var(--text-tertiary)]'
                            }`}>
                              {formatCurrency(os.remaining)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <td colSpan={5} className="px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">Total Na Loja OS</td>
                          <td className="px-3 py-2 text-sm font-bold text-[var(--color-accent-warning)] text-right tabular-nums">
                            {formatCurrency(data.na_loja.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABA 4 — TAXAS MAQUININHA */}
            {activeTab === 'taxas' && (
              <div className="flex flex-col gap-3">
                {data.rede_transactions.length === 0 ? (
                  <EmptyState label="Nenhuma taxa de maquininha encontrada para este dia." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Hora</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Forma</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Bruto</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Taxa R$</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Taxa %</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Líquido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.rede_transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                            <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(tx.occurred_at)}</td>
                            <td className="px-3 py-2.5 text-xs text-[var(--text-primary)] capitalize">{tx.payment_method}</td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right text-[var(--text-primary)]">{formatCurrency(tx.gross_amount)}</td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right text-[var(--color-accent-danger)]">-{formatCurrency(tx.fee_amount)}</td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right text-[var(--color-accent-danger)]">{tx.fee_pct}%</td>
                            <td className="px-3 py-2.5 text-xs tabular-nums text-right font-semibold text-[var(--color-accent-teal)]">{formatCurrency(tx.net_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <td colSpan={3} className="px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">Total Taxas</td>
                          <td className="px-3 py-2 text-sm font-bold text-[var(--color-accent-danger)] text-right tabular-nums">
                            -{formatCurrency(data.juros_rede)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
