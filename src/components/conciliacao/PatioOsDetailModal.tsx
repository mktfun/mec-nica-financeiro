import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AmountCell } from '@/components/finance/AmountCell';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Car,
  FileText,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  Filter
} from 'lucide-react';

interface PatioOsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
}

interface PatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name?: string;
  plate?: string;
  total_value: number;
  paid_value: number;
  status: string;
  opened_at?: string;
  closed_at?: string;
  payment_method?: string;
  last_payment_date?: string;
}

export function PatioOsDetailModal({
  isOpen,
  onClose,
  targetDate
}: PatioOsDetailModalProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('em_aberto');

  // Buscar todas as lojas para mapeamento
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-list-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  const storeMap = useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach((s: any) => {
      map[s.id] = s.name;
    });
    return map;
  }, [stores]);

  // Buscar todas as OSs do pátio para a data
  const { data: rawOsList = [], isLoading, refetch } = useQuery({
    queryKey: ['patio-os-detail-modal', targetDate],
    queryFn: async (): Promise<PatioOsItem[]> => {
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .lte('opened_at', `${targetDate}T23:59:59`)
        .order('store_id')
        .order('os_number');

      if (error) {
        console.error('Erro ao buscar patio_os:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        os_number: row.os_number || '',
        store_id: row.store_id || '',
        store_name: row.store_name || storeMap[row.store_id] || row.store_id,
        plate: row.plate || 'N/I',
        total_value: Number(row.total_value || 0),
        paid_value: Number(row.paid_value || 0),
        status: row.status || 'em_aberto',
        opened_at: row.opened_at,
        closed_at: row.closed_at,
        payment_method: row.payment_method,
        last_payment_date: row.last_payment_date
      }));
    },
    enabled: isOpen && !!targetDate
  });

  // Mutação para atualizar OS no banco
  const updateOsMutation = useMutation({
    mutationFn: async ({ id, total_value, paid_value, status }: { id: string; total_value: number; paid_value: number; status: string }) => {
      const { data: updated, error } = await supabase
        .from('patio_os')
        .update({
          total_value,
          paid_value,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Recalcula somatório de patio_os para targetDate e sincroniza daily_snapshots e reconciliations
      const { data: allPatio } = await supabase
        .from('patio_os')
        .select('*')
        .lte('opened_at', `${targetDate}T23:59:59`);

      if (allPatio) {
        const activeList = allPatio.filter((os: any) => {
          const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
          const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
          return !isClosed && saldo > 0;
        });
        const newTotal = activeList.reduce((acc: number, os: any) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

        // Atualiza daily_snapshots
        await supabase
          .from('daily_snapshots')
          .update({ total_patio: newTotal })
          .eq('date', targetDate);

        // Atualiza reconciliations da loja afetada
        if (updated?.store_id) {
          const storeTotal = activeList
            .filter((os: any) => os.store_id === updated.store_id)
            .reduce((acc: number, os: any) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

          await supabase
            .from('reconciliations')
            .update({ na_loja_os: storeTotal })
            .eq('date', targetDate)
            .eq('store_id', updated.store_id);
        }
      }
    },
    onSuccess: async () => {
      toast.success('Ordem de Serviço atualizada com sucesso!');
      setEditingId(null);
      await refetch();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['availableStoreOs'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] })
      ]);
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar OS: ${err.message || err}`);
    }
  });

  // Filtra as OSs que estão ativas no pátio (saldo restante > 0 e não finalizadas)
  const patioOsList = useMemo(() => {
    return rawOsList.filter((os) => {
      const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());
      const saldoRestante = os.total_value - os.paid_value;
      // Inclui se tem saldo restante e não está fechada, ou se foi fechada no próprio dia
      return !isClosed && saldoRestante > 0;
    });
  }, [rawOsList]);

  // Lista filtrada por busca e loja
  const filteredOsList = useMemo(() => {
    return patioOsList.filter((os) => {
      const matchesStore = selectedStore === 'ALL' || os.store_id === selectedStore;
      if (!matchesStore) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      const storeName = storeMap[os.store_id] || os.store_name || '';
      return (
        os.os_number.toLowerCase().includes(q) ||
        (os.plate && os.plate.toLowerCase().includes(q)) ||
        storeName.toLowerCase().includes(q) ||
        (os.payment_method && os.payment_method.toLowerCase().includes(q))
      );
    });
  }, [patioOsList, selectedStore, searchTerm, storeMap]);

  // Totais Consolidados
  const totalPatioGlobal = useMemo(() => {
    return patioOsList.reduce((acc, os) => acc + (os.total_value - os.paid_value), 0);
  }, [patioOsList]);

  const totalValorOriginalGlobal = useMemo(() => {
    return patioOsList.reduce((acc, os) => acc + os.total_value, 0);
  }, [patioOsList]);

  const totalPagoAcumuladoGlobal = useMemo(() => {
    return patioOsList.reduce((acc, os) => acc + os.paid_value, 0);
  }, [patioOsList]);

  // Total filtrado
  const totalPatioFiltrado = useMemo(() => {
    return filteredOsList.reduce((acc, os) => acc + (os.total_value - os.paid_value), 0);
  }, [filteredOsList]);

  // Iniciar edição
  const handleStartEdit = (os: PatioOsItem) => {
    setEditingId(os.id);
    setEditTotal(os.total_value);
    setEditPaid(os.paid_value);
    setEditStatus(os.status);
  };

  // Salvar edição
  const handleSaveEdit = (id: string) => {
    updateOsMutation.mutate({
      id,
      total_value: editTotal,
      paid_value: editPaid,
      status: editStatus
    });
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  if (!isOpen) return null;

  const formattedDate = targetDate.split('-').reverse().join('/');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ordens de Serviço no Pátio (Na Loja OS) — ${formattedDate}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* 4 Summary Cards Canônicos (border-l-4) — Padrão Pátio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Restante no Pátio */}
          <Card className="border-l-4 border-l-amber-500">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Saldo Total no Pátio
            </p>
            <p className="font-display font-bold text-2xl font-mono text-amber-400">
              <AmountCell value={totalPatioGlobal} tone="warning" />
            </p>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono flex justify-between items-center">
              <span>Filtrado na tela:</span>
              <span className="text-zinc-200 font-semibold">{formatCurrency(totalPatioFiltrado)}</span>
            </div>
          </Card>

          {/* Card 2: Valor Total Bruto */}
          <Card className="border-l-4 border-l-blue-500">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Valor Total das OSs
            </p>
            <p className="font-display font-bold text-2xl font-mono text-zinc-100">
              <AmountCell value={totalValorOriginalGlobal} tone="neutral" />
            </p>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono flex justify-between items-center">
              <span>Total Pago Acumulado:</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(totalPagoAcumuladoGlobal)}</span>
            </div>
          </Card>

          {/* Card 3: Quantidade de Veículos / OSs */}
          <Card className="border-l-4 border-l-purple-500">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Veículos no Pátio
            </p>
            <p className="font-display font-bold text-2xl font-mono text-purple-400">
              {patioOsList.length} OSs
            </p>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono flex justify-between items-center">
              <span>Exibidas no filtro:</span>
              <span className="text-zinc-200 font-semibold">{filteredOsList.length} OSs</span>
            </div>
          </Card>

          {/* Card 4: Filiais Ativas */}
          <Card className="border-l-4 border-l-emerald-500">
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Lojas com OS Aberta
            </p>
            <p className="font-display font-bold text-2xl font-mono text-emerald-400">
              {new Set(patioOsList.map((os) => os.store_id)).size} de {stores.length}
            </p>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono flex justify-between items-center">
              <span>Data Base:</span>
              <span className="text-zinc-200 font-semibold">{formattedDate}</span>
            </div>
          </Card>
        </div>

        {/* Barra de Filtros e Busca Padronizada */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS, Placa, Filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[var(--text-tertiary)]" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
            >
              <option value="ALL">Todas as Filiais ({patioOsList.length} OSs)</option>
              {stores.map((s: any) => {
                const count = patioOsList.filter((os) => os.store_id === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} OSs)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Tabela de OSs Padronizada */}
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner text="Carregando Ordens de Serviço do pátio..." />
            </div>
          ) : filteredOsList.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-30 text-amber-400" />
              Nenhuma Ordem de Serviço encontrada no pátio para os filtros selecionados.
            </div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-surface-elevated)] sticky top-0 border-b border-[var(--border-subtle)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] z-10">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold">Filial</th>
                    <th className="py-3 px-3 text-left font-semibold">OS #</th>
                    <th className="py-3 px-3 text-left font-semibold">Placa</th>
                    <th className="py-3 px-3 text-left font-semibold">Status</th>
                    <th className="py-3 px-3 text-right font-semibold">Valor Total</th>
                    <th className="py-3 px-3 text-right font-semibold">Valor Pago</th>
                    <th className="py-3 px-4 text-right font-semibold">Saldo Restante (Pátio)</th>
                    <th className="py-3 px-4 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                  {filteredOsList.map((os) => {
                    const isEditing = editingId === os.id;
                    const saldoRestante = isEditing ? editTotal - editPaid : os.total_value - os.paid_value;
                    const storeName = storeMap[os.store_id] || os.store_name || os.store_id;

                    return (
                      <tr
                        key={os.id}
                        className={`transition-colors ${
                          isEditing
                            ? 'bg-amber-500/10 border-l-2 border-amber-500'
                            : 'hover:bg-[var(--bg-surface-elevated)]'
                        }`}
                      >
                        {/* Filial */}
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-[var(--text-tertiary)] shrink-0" />
                            <span className="truncate max-w-[140px]">{storeName}</span>
                          </div>
                        </td>

                        {/* OS # */}
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          OS #{os.os_number}
                        </td>

                        {/* Placa */}
                        <td className="py-3 px-3 font-mono text-zinc-300">
                          {os.plate || 'N/I'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {isEditing ? (
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                            >
                              <option value="em_aberto">Em Aberto</option>
                              <option value="pago_parcial">Pago Parcial</option>
                              <option value="finalizada">Finalizada (Não conta no pátio)</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                          ) : (
                            <Badge
                              variant={os.status.toLowerCase().includes('aberto') ? 'warning' : 'brand'}
                              dot
                              className="text-[10px]"
                            >
                              {os.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editTotal}
                              onChange={(e) => setEditTotal(Number(e.target.value))}
                              className="w-24 bg-zinc-900 border border-amber-500 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <AmountCell value={os.total_value} tone="neutral" />
                          )}
                        </td>

                        {/* Valor Pago */}
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editPaid}
                              onChange={(e) => setEditPaid(Number(e.target.value))}
                              className="w-24 bg-zinc-900 border border-emerald-500 rounded px-2 py-0.5 text-right font-mono text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <AmountCell value={os.paid_value} tone="success" />
                          )}
                        </td>

                        {/* Saldo Restante */}
                        <td className="py-3 px-4 text-right">
                          <AmountCell value={saldoRestante} tone="warning" className="font-bold text-sm" />
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleSaveEdit(os.id)}
                                disabled={updateOsMutation.isPending}
                                className="h-7 px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs cursor-pointer"
                                title="Salvar alterações nesta OS"
                              >
                                <Save size={13} className="mr-1" />
                                {updateOsMutation.isPending ? '...' : 'Salvar'}
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7 px-2 text-zinc-400 hover:text-white cursor-pointer"
                                title="Cancelar"
                              >
                                <X size={13} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleStartEdit(os)}
                              className="h-7 px-2.5 border-[var(--border-subtle)] hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-300 text-xs cursor-pointer"
                              title="Editar valor total ou valor pago desta OS"
                            >
                              <Edit2 size={12} className="mr-1" />
                              Editar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Rodapé informativo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
          <span>
            Ao alterar o valor total ou valor pago de uma OS, o somatório de <strong className="text-white">Na Loja OS</strong> e o <strong className="text-white">Caixa Atual</strong> serão recalculados automaticamente.
          </span>
          <Button variant="outline" onClick={onClose} className="px-5 py-1.5 text-xs text-zinc-300 border-[var(--border-subtle)] cursor-pointer">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
