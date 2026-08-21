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
  FileText,
  Search,
  Filter,
  Settings2,
  ArrowRightLeft,
  Car
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useStores } from '@/hooks/useStores';
import { IntercompanyEntitiesModal } from '@/components/configuracoes/IntercompanyEntitiesModal';
import { CATEGORY_LABELS } from '@/lib/parsers/contasPagarParser';

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
  const { data: stores = [] } = useStores();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEntitiesModalOpen, setIsEntitiesModalOpen] = useState(false);

  // Form states for manual bill addition
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('pecas');
  const [storeId, setStoreId] = useState('');
  const [amount, setAmount] = useState('');

  // 1. Busca as contas cadastradas ou importadas
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['daily-manual-bills', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_manual_bills')
        .select('*')
        .or(`date.eq.${targetDate},target_date.eq.${targetDate}`)
        .order('amount', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // 2. Mutação para adicionar nova conta avulsa
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
        target_date: targetDate,
        date: targetDate,
        title: title.trim(),
        recipient_name: title.trim(),
        description: description.trim() || null,
        category,
        store_id: storeId || null,
        amount: numAmount
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Despesa adicionada com sucesso!');
      setTitle('');
      setDescription('');
      setAmount('');
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar despesa.');
    }
  });

  // 3. Mutação para alterar categoria inline
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, newCategory }: { id: string; newCategory: string }) => {
      const { error } = await supabase
        .from('daily_manual_bills')
        .update({ category: newCategory })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      toast.success('Categoria atualizada!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar categoria: ${err.message}`);
    }
  });

  // 4. Mutação para excluir conta
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
  const displayTotal = totalBills > 0 ? totalBills : fallbackTotal;

  // Filtragem dos itens na tela
  const filteredBills = bills.filter(b => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (b.recipient_name && b.recipient_name.toLowerCase().includes(term)) ||
      (b.title && b.title.toLowerCase().includes(term)) ||
      (b.description && b.description.toLowerCase().includes(term)) ||
      (b.external_code && b.external_code.toLowerCase().includes(term));

    const matchesStore = selectedStore === 'all' || b.store_id === selectedStore || (selectedStore === 'master' && !b.store_id);
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;

    return matchesSearch && matchesStore && matchesCategory;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contas a Pagar & Despesas Analíticas do Dia"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Card Resumo do Topo */}
        <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Total de Contas a Pagar</h3>
              <div className="flex flex-col text-xs text-[var(--text-tertiary)] mt-0.5">
                <span>{bills.length} contas cadastradas/importadas</span>
                {selectedStore !== 'all' || selectedCategory !== 'all' || searchTerm ? (
                  <span className="text-amber-400">Filtrado: {filteredBills.length} contas ({formatCurrency(filteredBills.reduce((acc, b) => acc + Number(b.amount || 0), 0))})</span>
                ) : null}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEntitiesModalOpen(true)}
              className="text-xs py-2 px-3 flex items-center gap-1.5 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Settings2 size={13} className="text-amber-400" />
              Sócios & Regras
            </Button>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-rose-400">
                {formatCurrency(displayTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca Rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[var(--text-tertiary)]" size={14} />
            <input
              type="text"
              placeholder="Buscar fornecedor, código, OS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Todas as Filiais ({bills.length})</option>
              <option value="master">Matriz / Compartilhado</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Todas as Categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Contas Analítica */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-canvas)]">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] font-semibold sticky top-0 border-b border-[var(--border-subtle)] z-10">
                <tr>
                  <th className="py-2.5 px-3">Fornecedor / Título</th>
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Detalhes / OS</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                      Nenhuma conta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(b => {
                    const storeObj = stores.find(s => s.id === b.store_id);
                    const storeLabel = storeObj ? storeObj.name : 'Matriz';

                    return (
                      <tr key={b.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-[var(--text-primary)]">
                            {b.recipient_name || b.title}
                          </div>
                          {b.external_code && (
                            <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                              Cód: {b.external_code} • Parc: {b.installment || '1/1'}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                          <span className="truncate max-w-[120px] block" title={storeLabel}>
                            {storeLabel}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <select
                            value={b.category || 'outros'}
                            onChange={(e) => updateCategoryMutation.mutate({ id: b.id, newCategory: e.target.value })}
                            className="bg-zinc-800 text-[10px] text-zinc-200 border border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.is_intercompany && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded flex items-center gap-1">
                                <ArrowRightLeft size={10} /> Sócio/Aporte
                              </span>
                            )}
                            {b.matched_os_number && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1">
                                <Car size={10} /> OS #{b.matched_os_number}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[150px]">
                              {b.description || '-'}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-400 whitespace-nowrap">
                          {formatCurrency(Number(b.amount))}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => deleteBillMutation.mutate(b.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Excluir conta"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulário Retrátil para Adicionar Conta Avulsa */}
        <details className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs group">
          <summary className="font-semibold text-[var(--text-primary)] cursor-pointer flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs">
              <Plus size={13} className="text-[var(--color-primary)]" />
              Lançar Despesa Avulsa Manual (Não Constante no Arquivo)
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 mt-3 border-t border-[var(--border-subtle)]">
            <div className="sm:col-span-4">
              <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Nome / Fornecedor *</label>
              <input
                type="text"
                placeholder="Ex: Peças Bosch, Aluguel..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Filial</label>
              <select
                value={storeId}
                onChange={e => setStoreId(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Matriz / Geral</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Valor (R$) *</label>
              <input
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="sm:col-span-12 flex justify-end">
              <Button
                onClick={() => addBillMutation.mutate()}
                disabled={addBillMutation.isPending || !title || !amount}
                className="text-xs py-1.5 px-4 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 rounded-lg flex items-center gap-1"
              >
                <Plus size={13} />
                {addBillMutation.isPending ? 'Salvando...' : 'Adicionar Despesa'}
              </Button>
            </div>
          </div>
        </details>
      </div>

      {/* Modal de Sócios e Entidades */}
      <IntercompanyEntitiesModal
        isOpen={isEntitiesModalOpen}
        onClose={() => setIsEntitiesModalOpen(false)}
      />
    </Modal>
  );
}
