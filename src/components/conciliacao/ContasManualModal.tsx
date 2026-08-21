import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import {
  Receipt,
  Plus,
  Trash2,
  Building2,
  DollarSign,
  Tag,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ContasManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
  fallbackTotal?: number;
}

export function ContasManualModal({
  isOpen,
  onClose,
  targetDate,
  fallbackTotal = 0
}: ContasManualModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Fornecedor');
  const [amount, setAmount] = useState('');

  // 1. Busca os itens cadastrados no banco
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['daily-manual-bills', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_manual_bills')
        .select('*')
        .eq('date', targetDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // 2. Mutação para adicionar nova conta
  const addBillMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Informe um valor válido maior que zero.');
      }
      if (!title.trim()) {
        throw new Error('Informe o nome da conta ou fornecedor.');
      }

      const { error } = await supabase.from('daily_manual_bills').insert({
        date: targetDate,
        title: title.trim(),
        description: description.trim() || null,
        category,
        amount: numAmount
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta adicionada com sucesso!');
      setTitle('');
      setDescription('');
      setAmount('');
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar conta.');
    }
  });

  // 3. Mutação para excluir conta
  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_manual_bills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Conta removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover conta.');
    }
  });

  const totalBills = bills.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const displayTotal = bills.length > 0 ? totalBills : fallbackTotal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lançamento de Contas a Pagar do Dia (Item a Item)"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Card Resumo do Topo */}
        <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Total de Contas a Pagar</h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                {bills.length > 0 ? `${bills.length} contas lançadas nesta data` : 'Valor informado no fechamento'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-sans tabular-nums text-red-400">
              {formatCurrency(displayTotal)}
            </div>
          </div>
        </div>

        {/* Formulário de Adicionar Conta */}
        <div className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Adicionar Nova Conta / Despesa
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Nome / Fornecedor *</label>
              <input
                type="text"
                placeholder="Ex: Aluguel Dom Pedro, Peças Bosch..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] text-[var(--text-tertiary)] mb-1 block">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Fornecedor">Fornecedor / Peças</option>
                <option value="Aluguel">Aluguel / Imóvel</option>
                <option value="Folha">Folha de Pagamento</option>
                <option value="Prolabore">Prolabore</option>
                <option value="Imposto">Impostos / Tarifas</option>
                <option value="Serviços">Serviços / Manutenção</option>
                <option value="Outros">Outros</option>
              </select>
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
                onClick={() => addBillMutation.mutate()}
                disabled={addBillMutation.isPending || !title || !amount}
                className="w-full h-9 bg-[var(--color-primary)] text-white hover:opacity-90 font-medium text-xs gap-1"
              >
                <Plus className="w-4 h-4" />
                {addBillMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>

            <div className="sm:col-span-12">
              <input
                type="text"
                placeholder="Descrição / Observação adicional (opcional)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Contas Cadastradas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span>Contas Cadastradas ({bills.length})</span>
            {bills.length === 0 && fallbackTotal > 0 && (
              <span className="text-amber-400">Usando valor global importado (R$ {fallbackTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] text-xs font-semibold border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-4">Nome / Fornecedor</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                      Nenhuma conta individual cadastrada para este dia. Use o formulário acima para lançar item a item.
                    </td>
                  </tr>
                ) : (
                  bills.map(b => (
                    <tr key={b.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {b.title}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px]">
                          {b.category || 'Outros'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                        {b.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-red-400 whitespace-nowrap">
                        {formatCurrency(Number(b.amount))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteBillMutation.mutate(b.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Excluir conta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {bills.length > 0 && (
                <tfoot className="bg-[var(--bg-surface-elevated)] font-bold border-t border-[var(--border-subtle)]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-[var(--text-primary)]">TOTAL DAS CONTAS LANÇADAS</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{formatCurrency(totalBills)}</td>
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
