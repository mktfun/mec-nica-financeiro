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
  Car,
  CheckCircle2,
  AlertCircle,
  Link,
  Sparkles,
  Check,
  X,
  Pencil
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

  // Active Tab
  const [activeTab, setActiveTab] = useState<'contas' | 'batimento'>('contas');

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
  const [contabilizarSubtotal, setContabilizarSubtotal] = useState(true);

  // 1. Busca as contas cadastradas ou importadas
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['daily-manual-bills', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_manual_bills')
        .select('*')
        .eq('date', targetDate)
        .order('amount', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // 2. Busca saídas bancárias do OFX do dia
  const { data: ofxSaidas = [], isLoading: isLoadingOfx } = useQuery({
    queryKey: ['ofx-saidas', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('*')
        .eq('target_date', targetDate)
        .eq('type', 'out')
        .order('amount', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // 3. Mutação para adicionar nova conta avulsa
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
        recipient_name: title.trim(),
        description: description.trim() || null,
        category,
        store_id: storeId || null,
        amount: numAmount,
        contabilizar_no_subtotal: contabilizarSubtotal
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Despesa adicionada com sucesso!');
      setTitle('');
      setDescription('');
      setAmount('');
      setContabilizarSubtotal(true);
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar despesa.');
    }
  });

  // Estado para modal de edição de despesa
  const [editingBill, setEditingBill] = useState<any | null>(null);

  // Mutação para atualizar despesa completa (RPC update_manual_bill)
  const updateBillMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      amount,
      category,
      storeId,
      description,
      contabilizarSubtotal
    }: {
      id: string;
      title: string;
      amount: number;
      category: string;
      storeId: string | null;
      description: string | null;
      contabilizarSubtotal: boolean;
    }) => {
      const { data, error } = await supabase.rpc('update_manual_bill', {
        p_bill_id: id,
        p_title: title,
        p_amount: amount,
        p_category: category,
        p_store_id: storeId || '',
        p_description: description,
        p_contabilizar_no_subtotal: contabilizarSubtotal
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Despesa atualizada com sucesso!');
      setEditingBill(null);
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar despesa: ${err.message}`);
    }
  });

  // 4. Mutação para alterar categoria inline
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

  // 5. Mutação para toggle de Contabilizar no Subtotal
  const toggleContabilizarMutation = useMutation({
    mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) => {
      const { error } = await supabase
        .from('daily_manual_bills')
        .update({ contabilizar_no_subtotal: !currentState })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] });
      toast.success('Status contábil atualizado!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao alternar status contábil: ${err.message}`);
    }
  });

  // 6. Mutação para Auto-Match de Saídas
  const autoMatchSaidasMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('auto_match_saidas', { p_date: targetDate });
      if (error) throw error;
      return data;
    },
    onSuccess: (res: any) => {
      toast.success(`Pareamento automático concluído! ${res?.matched_saidas_count || 0} saídas vinculadas.`);
      queryClient.invalidateQueries({ queryKey: ['daily-manual-bills', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['ofx-saidas', targetDate] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao parear saídas: ${err.message}`);
    }
  });

  // 7. Mutação para excluir conta
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

  // Cálculos consolidados
  const totalBillsContabilizados = bills
    .filter(b => b.contabilizar_no_subtotal !== false)
    .reduce((acc, b) => acc + Number(b.amount || 0), 0);
  
  const totalBillsNaoContabilizados = bills
    .filter(b => b.contabilizar_no_subtotal === false)
    .reduce((acc, b) => acc + Number(b.amount || 0), 0);

  const displayTotal = totalBillsContabilizados > 0 ? totalBillsContabilizados : fallbackTotal;
  const totalDebitosOfx = ofxSaidas.reduce((acc, tx) => acc + Math.abs(Number(tx.amount || 0)), 0);

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
        {/* Navegação de Abas */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('contas')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'contas'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <Receipt size={14} />
            Contas a Pagar ({bills.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batimento')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'batimento'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <ArrowRightLeft size={14} />
            Batimento de Saídas (Contas x Débitos OFX)
            <Badge variant="outline" className="text-[10px] ml-1 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              {ofxSaidas.length} débitos
            </Badge>
          </button>
        </div>

        {/* Card Resumo do Topo */}
        <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Total a Cobrir no Fechamento</h3>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)] mt-0.5">
                <span>{bills.length} contas cadastradas</span>
                {totalBillsNaoContabilizados > 0 && (
                  <span className="text-zinc-500 line-through">
                    (Ignoradas no DRE: {formatCurrency(totalBillsNaoContabilizados)})
                  </span>
                )}
                {selectedStore !== 'all' || selectedCategory !== 'all' || searchTerm ? (
                  <span className="text-amber-400">Filtrado: {filteredBills.length} ({formatCurrency(filteredBills.reduce((acc, b) => acc + (b.contabilizar_no_subtotal !== false ? Number(b.amount || 0) : 0), 0))})</span>
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
              <span className="text-[10px] text-[var(--text-tertiary)]">Soma no Subtotal</span>
            </div>
          </div>
        </div>

        {/* CONTEÚDO DA ABA 1: CONTAS A PAGAR */}
        {activeTab === 'contas' && (
          <div className="space-y-4">
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
                      <th className="py-2.5 px-3">Status Contábil</th>
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
                        const isContabilizado = b.contabilizar_no_subtotal !== false;

                        return (
                          <tr key={b.id} className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${!isContabilizado ? 'opacity-60 bg-zinc-900/30' : ''}`}>
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
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleContabilizarMutation.mutate({ id: b.id, currentState: isContabilizado })}
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                                    isContabilizado 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                                  }`}
                                  title={isContabilizado ? 'Clique para NÃO somar no subtotal de contas' : 'Clique para somar no subtotal de contas'}
                                >
                                  {isContabilizado ? <Check size={10} /> : <X size={10} />}
                                  {isContabilizado ? 'No Fechamento' : 'Apenas Conciliar'}
                                </button>
                                {b.matched_ofx_id && (
                                  <span className="text-[9px] font-mono text-indigo-400 flex items-center gap-0.5" title="Vinculada a débito bancário">
                                    <Link size={10} /> OFX
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${isContabilizado ? 'text-rose-400' : 'text-zinc-500 line-through'}`}>
                              {formatCurrency(Number(b.amount))}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingBill(b)}
                                  className="text-zinc-500 hover:text-amber-400 p-1 rounded hover:bg-amber-500/10 transition-colors cursor-pointer"
                                  title="Editar dados da conta"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteBillMutation.mutate(b.id)}
                                  className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Excluir conta"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
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

                <div className="sm:col-span-12 flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={contabilizarSubtotal}
                      onChange={e => setContabilizarSubtotal(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-rose-500 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Contabilizar no Subtotal de Contas do Fechamento</span>
                  </label>

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
        )}

        {/* CONTEÚDO DA ABA 2: BATIMENTO DE SAÍDAS */}
        {activeTab === 'batimento' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
              <div>
                <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ArrowRightLeft size={14} className="text-indigo-400" />
                  Confronto de Débitos Bancários x Títulos Pagos
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Total Débitos OFX: <span className="font-mono font-bold text-rose-400">{formatCurrency(totalDebitosOfx)}</span> | Contas Registradas: <span className="font-mono font-bold text-zinc-200">{formatCurrency(displayTotal)}</span>
                </p>
              </div>

              <Button
                type="button"
                onClick={() => autoMatchSaidasMutation.mutate()}
                disabled={autoMatchSaidasMutation.isPending || ofxSaidas.length === 0}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 flex items-center gap-1.5 rounded-lg cursor-pointer"
              >
                <Sparkles size={13} />
                {autoMatchSaidasMutation.isPending ? 'Pareando...' : 'Auto-Match Saídas'}
              </Button>
            </div>

            {/* Grid 2 Colunas: Débitos OFX vs Contas a Pagar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coluna 1: Débitos do Extrato Bancário */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">1. Débitos OFX ({ofxSaidas.length})</span>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">{formatCurrency(totalDebitosOfx)}</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
                  {ofxSaidas.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-xs">Nenhum débito bancário registrado.</div>
                  ) : (
                    ofxSaidas.map(tx => {
                      const isMatched = !!tx.matched_bill_id;
                      return (
                        <div key={tx.id} className={`p-2.5 flex items-center justify-between hover:bg-zinc-900/40 transition-colors ${isMatched ? 'bg-indigo-950/10' : ''}`}>
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-zinc-200 truncate" title={tx.counterpart_name}>
                              {tx.counterpart_name || 'Débito Bancário'}
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                              <span>{tx.bank_name || 'Banco'}</span>
                              <span>•</span>
                              <span className="font-mono">{tx.fitid}</span>
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-rose-400">
                              {formatCurrency(Math.abs(Number(tx.amount)))}
                            </div>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              isMatched ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {isMatched ? 'Vinculado' : 'Sem Vínculo'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Coluna 2: Contas a Pagar / Despesas */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">2. Contas a Pagar ({bills.length})</span>
                  <span className="text-[10px] font-mono text-zinc-300 font-bold">{formatCurrency(displayTotal)}</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60 text-xs">
                  {bills.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500 text-xs">Nenhuma conta cadastrada.</div>
                  ) : (
                    bills.map(b => {
                      const isMatched = !!b.matched_ofx_id;
                      const isContab = b.contabilizar_no_subtotal !== false;
                      return (
                        <div key={b.id} className={`p-2.5 flex items-center justify-between hover:bg-zinc-900/40 transition-colors ${isMatched ? 'bg-indigo-950/10' : ''}`}>
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-zinc-200 truncate" title={b.recipient_name || b.title}>
                              {b.recipient_name || b.title}
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                              <span>{b.category || 'Geral'}</span>
                              {b.external_code && <span>• Cód: {b.external_code}</span>}
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className={`font-mono font-bold ${isContab ? 'text-rose-400' : 'text-zinc-500 line-through'}`}>
                              {formatCurrency(Number(b.amount))}
                            </div>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              isMatched ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {isMatched ? 'Pareada' : (isContab ? 'Pendente OFX' : 'Ignorada')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição Completa da Despesa */}
      {editingBill && (
        <Modal
          isOpen={!!editingBill}
          onClose={() => setEditingBill(null)}
          title={`Editar Despesa: ${editingBill.recipient_name || editingBill.title}`}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const titleVal = (formData.get('title') as string) || '';
              const rawAmount = (formData.get('amount') as string) || '0';
              const numAmount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
              const categoryVal = (formData.get('category') as string) || 'outros';
              const storeIdVal = (formData.get('storeId') as string) || null;
              const descriptionVal = (formData.get('description') as string) || null;
              const contabilizar = formData.get('contabilizar') === 'on';

              if (isNaN(numAmount) || numAmount <= 0) {
                toast.error('Informe um valor válido maior que zero.');
                return;
              }

              updateBillMutation.mutate({
                id: editingBill.id,
                title: titleVal,
                amount: numAmount,
                category: categoryVal,
                storeId: storeIdVal,
                description: descriptionVal,
                contabilizarSubtotal: contabilizar
              });
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block font-semibold">Nome / Fornecedor *</label>
              <input
                name="title"
                defaultValue={editingBill.recipient_name || editingBill.title}
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block font-semibold">Valor (R$) *</label>
                <input
                  name="amount"
                  defaultValue={Number(editingBill.amount).toFixed(2).replace('.', ',')}
                  required
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block font-semibold">Filial</label>
                <select
                  name="storeId"
                  defaultValue={editingBill.store_id || ''}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Matriz / Geral</option>
                  {stores.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block font-semibold">Categoria DRE</label>
                <select
                  name="category"
                  defaultValue={editingBill.category || 'outros'}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    name="contabilizar"
                    defaultChecked={editingBill.contabilizar_no_subtotal !== false}
                    className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs">Somar no Subtotal (Fechamento)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 mb-1 block font-semibold">Observações / Descrição</label>
              <textarea
                name="description"
                defaultValue={editingBill.description || ''}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBill(null)}
                className="text-xs py-1.5 px-3"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateBillMutation.isPending}
                className="text-xs py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {updateBillMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Sócios e Entidades */}
      <IntercompanyEntitiesModal
        isOpen={isEntitiesModalOpen}
        onClose={() => setIsEntitiesModalOpen(false)}
      />
    </Modal>
  );
}
