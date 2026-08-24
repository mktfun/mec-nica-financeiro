import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
        {/* Cards de Resumo Global */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Restante no Pátio */}
          <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ShoppingBag size={14} className="text-amber-400" />
                Saldo Total no Pátio
              </span>
              <p className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
                {formatCurrency(totalPatioGlobal)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex justify-between items-center">
              <span className="text-zinc-500">Filtrado na tela:</span>
              <span className="text-zinc-300 font-semibold">{formatCurrency(totalPatioFiltrado)}</span>
            </div>
          </div>

          {/* Card 2: Valor Total Bruto */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <FileText size={14} className="text-blue-400" />
                Valor Total das OSs
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                {formatCurrency(totalValorOriginalGlobal)}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex justify-between items-center">
              <span className="text-zinc-500">Total Pago Acumulado:</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(totalPagoAcumuladoGlobal)}</span>
            </div>
          </div>

          {/* Card 3: Quantidade de Veículos / OSs */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Car size={14} className="text-purple-400" />
                Veículos no Pátio
              </span>
              <p className="text-2xl font-bold font-mono text-purple-400 tracking-tight">
                {patioOsList.length} OSs
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex justify-between items-center">
              <span className="text-zinc-500">Exibidas no filtro:</span>
              <span className="text-zinc-300 font-semibold">{filteredOsList.length} OSs</span>
            </div>
          </div>

          {/* Card 4: Filiais Ativas */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Building2 size={14} className="text-emerald-400" />
                Lojas com OS Aberta
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                {new Set(patioOsList.map((os) => os.store_id)).size} de {stores.length}
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex justify-between items-center">
              <span className="text-zinc-500">Data Base:</span>
              <span className="text-zinc-300 font-semibold">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS, Placa, Filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-zinc-400" />
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 font-sans"
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

        {/* Tabela de OSs com Edição Inline */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60 shadow-inner">
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
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900/90 sticky top-0 border-b border-zinc-800 text-zinc-400 uppercase font-mono tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4 text-left">Filial</th>
                    <th className="py-3 px-3 text-left">OS #</th>
                    <th className="py-3 px-3 text-left">Placa</th>
                    <th className="py-3 px-3 text-left">Status</th>
                    <th className="py-3 px-3 text-right">Valor Total</th>
                    <th className="py-3 px-3 text-right">Valor Pago</th>
                    <th className="py-3 px-4 text-right">Saldo Restante (Pátio)</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
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
                            : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        {/* Filial */}
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} className="text-zinc-400 shrink-0" />
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
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
                            >
                              <option value="em_aberto">Em Aberto</option>
                              <option value="pago_parcial">Pago Parcial</option>
                              <option value="finalizada">Finalizada (Não conta no pátio)</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-mono ${
                                os.status.toLowerCase().includes('aberto')
                                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                  : os.status.toLowerCase().includes('parcial')
                                  ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                                  : 'border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {os.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3 px-3 text-right font-mono text-zinc-200">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editTotal}
                              onChange={(e) => setEditTotal(Number(e.target.value))}
                              className="w-24 bg-zinc-900 border border-amber-500 rounded px-2 py-0.5 text-right font-mono text-xs text-white"
                            />
                          ) : (
                            formatCurrency(os.total_value)
                          )}
                        </td>

                        {/* Valor Pago */}
                        <td className="py-3 px-3 text-right font-mono text-emerald-400">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editPaid}
                              onChange={(e) => setEditPaid(Number(e.target.value))}
                              className="w-24 bg-zinc-900 border border-emerald-500 rounded px-2 py-0.5 text-right font-mono text-xs text-white"
                            />
                          ) : (
                            formatCurrency(os.paid_value)
                          )}
                        </td>

                        {/* Saldo Restante */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                          {formatCurrency(saldoRestante)}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveEdit(os.id)}
                                disabled={updateOsMutation.isPending}
                                className="h-7 px-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                                title="Salvar alterações nesta OS"
                              >
                                <Save size={13} className="mr-1" />
                                {updateOsMutation.isPending ? '...' : 'Salvar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7 px-2 text-zinc-400 hover:text-white"
                                title="Cancelar"
                              >
                                <X size={13} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(os)}
                              className="h-7 px-2.5 border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-300 text-xs"
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
        </div>

        {/* Rodapé informativo */}
        <div className="flex justify-between items-center text-xs text-zinc-400 pt-2 border-t border-zinc-800">
          <span>
            Ao alterar o valor total ou valor pago de uma OS, o somatório de <strong>Na Loja OS</strong> e o <strong>Caixa Atual</strong> serão recalculados automaticamente.
          </span>
          <Button variant="outline" onClick={onClose} className="px-5 py-1.5 text-xs text-zinc-300 border-zinc-700">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
