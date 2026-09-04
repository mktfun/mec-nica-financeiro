import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  Plus,
  Trash2,
  Building2,
  DollarSign,
  Receipt,
  Sparkles,
  ArrowUpRight,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FaturamentoDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  faturamentoOiBase?: number;
  faturamentoTotal?: number;
}

export function FaturamentoDetalhesModal({
  isOpen,
  onClose,
  targetDate,
  faturamentoOiBase = 0,
  faturamentoTotal = 0
}: FaturamentoDetalhesModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('aporte');
  const [amount, setAmount] = useState('');
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [customBaseInput, setCustomBaseInput] = useState('');

  // 1. Busca os ajustes cadastrados no banco
  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['daily-revenue-adjustments', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_revenue_adjustments')
        .select('*')
        .eq('date', targetDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  const totalAdjustments = adjustments.reduce((acc, a) => acc + Number(a.amount || 0), 0);

  // 0. Busca metadados do snapshot para odômetro e base
  const { data: snapshotData } = useQuery({
    queryKey: ['daily-snapshot-faturamento-modal', targetDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_snapshots')
        .select('id, faturamento, metadata')
        .eq('date', targetDate)
        .maybeSingle();
      return data;
    },
    enabled: isOpen && !!targetDate
  });

  const snapMeta = (snapshotData?.metadata as any) || {};
  const odometroHoje = Number(snapMeta.odometro_hoje ?? snapshotData?.faturamento ?? 0);
  const odometroAnt = Number(snapMeta.faturamento_anterior ?? 0);

  // Mutação para ajustar faturamento base diretamente no snapshot
  const updateBaseRevenueMutation = useMutation({
    mutationFn: async () => {
      const numBase = parseFloat(customBaseInput.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numBase) || numBase < 0) {
        throw new Error('Informe um valor de faturamento válido.');
      }
      if (!snapshotData?.id) {
        throw new Error('Snapshot não encontrado para esta data.');
      }

      const updatedMeta = {
        ...snapMeta,
        faturamento_oi_base: numBase,
        faturamento_periodo: numBase + totalAdjustments,
        faturamento_liquido: numBase + totalAdjustments
      };

      const { error } = await supabase
        .from('daily_snapshots')
        .update({
          metadata: updatedMeta
        })
        .eq('id', snapshotData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Faturamento base do OI atualizado com sucesso!');
      setIsEditingBase(false);
      queryClient.invalidateQueries({ queryKey: ['daily-snapshot-faturamento-modal', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar faturamento base.');
    }
  });

  // 2. Mutação para adicionar novo ajuste
  const addAdjustmentMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero.');
      }
      if (!title.trim()) {
        throw new Error('Informe o nome ou motivo do faturamento/ajuste.');
      }

      const { error } = await supabase.from('daily_revenue_adjustments').insert({
        date: targetDate,
        title: title.trim(),
        description: description.trim() || null,
        type,
        amount: numAmount
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ajuste de faturamento adicionado com sucesso!');
      setTitle('');
      setDescription('');
      setAmount('');
      queryClient.invalidateQueries({ queryKey: ['daily-revenue-adjustments', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar ajuste de faturamento.');
    }
  });

  // 3. Mutação para excluir ajuste
  const deleteAdjustmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_revenue_adjustments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ajuste removido com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['daily-revenue-adjustments', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover ajuste.');
    }
  });

  const effectiveConsolidated = faturamentoOiBase + totalAdjustments;

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'aporte': return 'Aporte / Sócios';
      case 'estorno_cartao': return 'Estorno de Cartão';
      case 'venda_avulsa': return 'Venda Avulsa / Balcão';
      default: return 'Outros';
    }
  };

  const getTypeBadgeVariant = (t: string): 'success' | 'warning' | 'info' | 'secondary' => {
    switch (t) {
      case 'aporte': return 'info';
      case 'estorno_cartao': return 'warning';
      case 'venda_avulsa': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Composição e Ajustes do Faturamento do Dia"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Header Cards: Faturamento Base OI vs Total Consolidado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between text-[var(--text-tertiary)] text-xs font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                Oficina Inteligente (Dia)
              </span>
              {!isEditingBase ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBaseInput(String(faturamentoOiBase || ''));
                    setIsEditingBase(true);
                  }}
                  className="text-zinc-500 hover:text-blue-400 transition-colors p-1"
                  title="Editar Faturamento Base OI"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingBase(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingBase ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customBaseInput}
                  onChange={e => setCustomBaseInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[var(--bg-surface-elevated)] border border-blue-500/50 rounded px-2 py-1 text-sm font-mono text-[var(--text-primary)] focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => updateBaseRevenueMutation.mutate()}
                  disabled={updateBaseRevenueMutation.isPending}
                  className="h-8 px-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="text-xl font-bold font-sans tabular-nums text-[var(--text-primary)]">
                {formatCurrency(faturamentoOiBase)}
              </div>
            )}

            {odometroHoje > 0 ? (
              <div className="text-[10px] text-[var(--text-tertiary)] font-mono flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span>Odômetro: {formatCurrency(odometroHoje)}</span>
                {odometroAnt > 0 && <span>- Ant: {formatCurrency(odometroAnt)}</span>}
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text-tertiary)]">Apuração do sistema OI</div>
            )}
          </div>

          <div className="bg-[var(--bg-canvas)] border border-amber-500/30 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Plus className="w-4 h-4 text-amber-400" />
              Ajustes / Entradas Extras
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-amber-300">
              {formatCurrency(totalAdjustments)}
            </div>
            <div className="text-[11px] text-amber-400/70">{adjustments.length} ajustes lançados</div>
          </div>

          <div className="bg-[var(--bg-canvas)] border border-emerald-500/40 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Faturamento Consolidado
            </div>
            <div className="text-xl font-bold font-sans tabular-nums text-emerald-300">
              {formatCurrency(effectiveConsolidated)}
            </div>
            <div className="text-[11px] text-emerald-400/70">Base para Disponível Contas</div>
          </div>
        </div>

        {/* Formulário para Adicionar Ajuste */}
        <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Adicionar Aporte, Estorno ou Entrada de Faturamento
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Tipo de Ajuste</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="aporte">Aporte / Sócios</option>
                <option value="estorno_cartao">Estorno de Cartão</option>
                <option value="venda_avulsa">Venda Avulsa / Balcão</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Nome / Título *</label>
              <input
                type="text"
                placeholder="Ex: Aporte Sócios, Estorno Visa..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Valor (R$) *</label>
              <input
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <Button
                onClick={() => addAdjustmentMutation.mutate()}
                disabled={addAdjustmentMutation.isPending || !title || !amount}
                className="w-full h-9 bg-[var(--color-primary)] text-white hover:opacity-90 font-medium text-xs gap-1"
              >
                <Plus className="w-4 h-4" />
                {addAdjustmentMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>

            <div className="sm:col-span-12">
              <input
                type="text"
                placeholder="Descrição detalhada / Justificativa (opcional)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Ajustes Cadastrados */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span>Ajustes & Aportes Cadastrados ({adjustments.length})</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] text-xs font-semibold border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Nome / Título</th>
                  <th className="py-3 px-4">Descrição / Justificativa</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                      Nenhum aporte ou estorno manual cadastrado para esta data. Use o formulário acima para lançar.
                    </td>
                  </tr>
                ) : (
                  adjustments.map(a => (
                    <tr key={a.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={getTypeBadgeVariant(a.type)} className="text-[10px]">
                          {getTypeLabel(a.type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {a.title}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                        {a.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                        + {formatCurrency(Number(a.amount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteAdjustmentMutation.mutate(a.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Excluir ajuste"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {adjustments.length > 0 && (
                <tfoot className="bg-[var(--bg-surface-elevated)] font-bold border-t border-[var(--border-subtle)]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-[var(--text-primary)]">TOTAL DE AJUSTES SOMADOS</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">+ {formatCurrency(totalAdjustments)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
