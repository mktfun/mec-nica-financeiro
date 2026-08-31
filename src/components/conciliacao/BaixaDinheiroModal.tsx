import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Banknote,
  Building2,
  CheckCircle2,
  ArrowDownToLine,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  Plus
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface BaixaDinheiroModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  targetDate: string;
  totalDinheiroCofre: number;
  onSuccess?: () => void;
}

interface VaultItem {
  id: string;
  amount: number;
  entry_date: string;
  description: string;
  os_number_ref?: string;
  status: string;
}

export function BaixaDinheiroModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  targetDate,
  totalDinheiroCofre,
  onSuccess
}: BaixaDinheiroModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isDepositing, setIsDepositing] = useState(false);
  const [customOsNumber, setCustomOsNumber] = useState('');
  const [customAmount, setCustomAmount] = useState<number>(0);

  // Busca lançamentos em trânsito no cofre da loja
  const { data: vaultItems = [], isLoading } = useQuery<VaultItem[]>({
    queryKey: ['store-cash-vault-pending', storeId, targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cash_vault')
        .select('*')
        .eq('store_id', storeId)
        .lte('entry_date', targetDate)
        .in('status', ['em_transito', 'pending'])
        .order('entry_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount || 0),
        entry_date: row.entry_date,
        description: row.description || 'Recebimento em Dinheiro',
        os_number_ref: row.os_number_ref || '',
        status: row.status
      }));
    },
    enabled: isOpen && !!storeId
  });

  // Inicializa a seleção ao carregar itens
  useEffect(() => {
    if (vaultItems.length > 0) {
      const initial: Record<string, number> = {};
      vaultItems.forEach(v => {
        initial[v.id] = v.amount;
      });
      setSelectedItems(initial);
    } else {
      setSelectedItems({});
    }
  }, [vaultItems]);

  const toggleSelect = (id: string, maxAmount: number) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[id] !== undefined) {
        delete copy[id];
      } else {
        copy[id] = maxAmount;
      }
      return copy;
    });
  };

  const handleAmountChange = (id: string, value: number, maxAmount: number) => {
    const val = Math.min(Math.max(0, value), maxAmount);
    setSelectedItems(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleSelectAll = () => {
    if (Object.keys(selectedItems).length === vaultItems.length) {
      setSelectedItems({});
    } else {
      const all: Record<string, number> = {};
      vaultItems.forEach(v => {
        all[v.id] = v.amount;
      });
      setSelectedItems(all);
    }
  };

  const totalToDeposit = useMemo(() => {
    return Object.values(selectedItems).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [selectedItems]);

  const remainingInVault = Math.max(0, totalDinheiroCofre - totalToDeposit);
  // Executar Baixa / Depósito
  const handleConfirmBaixa = async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => (selectedItems[id] || 0) > 0);
    if (selectedIds.length === 0 && (!customOsNumber.trim() || customAmount <= 0)) {
      toast.error('Selecione pelo menos um item ou informe uma OS para dar baixa.');
      return;
    }

    setIsDepositing(true);
    try {
      // 1. Processa itens selecionados do cofre
      for (const id of selectedIds) {
        const amountToDeposit = selectedItems[id];
        
        await supabase.rpc('dar_baixa_dinheiro', {
          p_vault_id: id,
          p_amount_to_deposit: amountToDeposit,
          p_deposit_date: targetDate
        });
      }

      // 2. Processa baixa manual avulsa por OS se preenchida
      if (customOsNumber.trim() && customAmount > 0) {
        await supabase.rpc('dar_baixa_dinheiro', {
          p_store_id: storeId,
          p_os_number: customOsNumber.trim(),
          p_amount_to_deposit: customAmount,
          p_deposit_date: targetDate
        });
      }

      toast.success(`Baixa de ${formatCurrency(totalToDeposit + (customAmount || 0))} realizada com sucesso!`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['saldo-bancos-modal-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['store-cash-vault-pending'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] })
      ]);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Erro ao processar baixa: ' + (err.message || err));
    } finally {
      setIsDepositing(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return vaultItems;
    const term = searchTerm.toLowerCase().trim();
    return vaultItems.filter(v => 
      v.description.toLowerCase().includes(term) ||
      (v.os_number_ref && v.os_number_ref.toLowerCase().includes(term))
    );
  }, [vaultItems, searchTerm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Baixa de Dinheiro no Cofre — ${storeName}`}
      size="lg"
    >
      <div className="space-y-5 pt-1 text-xs text-zinc-200 font-sans">
        {/* Header Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block mb-1">
              Total no Cofre
            </span>
            <p className="text-base font-bold font-mono text-amber-300">
              {formatCurrency(totalDinheiroCofre)}
            </p>
          </div>

          <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block mb-1">
              Total a Depositar
            </span>
            <p className="text-base font-bold font-mono text-emerald-400">
              {formatCurrency(totalToDeposit + (customAmount || 0))}
            </p>
          </div>

          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block mb-1">
              Saldo Restante no Cofre
            </span>
            <p className="text-base font-bold font-mono text-zinc-200">
              {formatCurrency(Math.max(0, remainingInVault - (customAmount || 0)))}
            </p>
          </div>
        </div>

        {/* Barra de Filtro e Ação em Massa */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-sans"
            />
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleSelectAll}
            className="h-7 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 cursor-pointer"
          >
            {Object.keys(selectedItems).length === vaultItems.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
          </Button>
        </div>

        {/* Tabela de Lançamentos de Dinheiro */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner text="Buscando valores em dinheiro no cofre..." />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
              <p>Nenhum lançamento pendente encontrado no cofre desta filial.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Você pode informar uma OS avulsa abaixo para baixar.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">OS / Referência</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-right">Disponível</th>
                  <th className="py-2.5 px-3 text-right w-36">Valor a Depositar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredItems.map(item => {
                  const isSelected = selectedItems[item.id] !== undefined;
                  const currentDeposit = selectedItems[item.id] ?? 0;

                  return (
                    <tr 
                      key={item.id}
                      className={`transition-colors ${isSelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-zinc-900/40'}`}
                    >
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.id, item.amount)}
                          className="text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600" />
                          )}
                        </button>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {item.os_number_ref ? (
                            <Badge variant="brand" className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 border-blue-500/30">
                              OS #{item.os_number_ref}
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] px-1.5 py-0.5">
                              Avulso
                            </Badge>
                          )}
                          <span className="text-zinc-300 truncate max-w-[180px]" title={item.description}>
                            {item.description}
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-3 font-mono text-zinc-400 whitespace-nowrap text-[11px]">
                        {item.entry_date}
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-semibold text-amber-300">
                        {formatCurrency(item.amount)}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.amount}
                          value={isSelected ? currentDeposit : ''}
                          disabled={!isSelected}
                          onChange={(e) => handleAmountChange(item.id, Number(e.target.value), item.amount)}
                          placeholder="0,00"
                          className={`w-24 px-2 py-0.5 text-right font-mono text-xs rounded border focus:outline-none ${
                            isSelected 
                              ? 'bg-zinc-900 border-emerald-500 text-emerald-300 font-bold' 
                              : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Baixa Avulsa / Por OS Manual */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Baixar Dinheiro de Outra OS Específica (Não Listada)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                Nº da OS
              </label>
              <input
                type="text"
                placeholder="Ex: 8762"
                value={customOsNumber}
                onChange={(e) => setCustomOsNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                Valor em Dinheiro (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={customAmount || ''}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Ações do Modal */}
        <div className="pt-3 flex items-center justify-between border-t border-zinc-800">
          <p className="text-[11px] text-zinc-400">
            O valor baixado será transferido para a custódia bancária (OFX).
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isDepositing}
              className="text-xs text-zinc-400 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmBaixa}
              disabled={isDepositing || (totalToDeposit <= 0 && customAmount <= 0)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 gap-1.5 shadow-sm cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              {isDepositing ? 'Processando Depósito...' : 'Confirmar Depósito (Baixar)'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
