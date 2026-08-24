import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  ShoppingBag, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Car, 
  ExternalLink,
  Search,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { OsDetailModal } from './OsDetailModal';

interface StoreOrdensServicoViewProps {
  storeId: string;
  date: string;
}

interface PatioOsRow {
  id: string;
  os_number: string;
  store_id: string;
  plate?: string;
  client_name?: string;
  total_value: number;
  paid_value: number;
  status: string;
  payment_method?: string;
  opened_at?: string;
  closed_at?: string;
}

export function StoreOrdensServicoView({ storeId, date }: StoreOrdensServicoViewProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editPaid, setEditPaid] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('em_aberto');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  // Form para nova OS manual
  const [newOsNumber, setNewOsNumber] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newTotal, setNewTotal] = useState<number>(0);
  const [newPaid, setNewPaid] = useState<number>(0);
  const [newStatus, setNewStatus] = useState('em_aberto');
  const [newMethod, setNewMethod] = useState('PIX');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Busca as OSs da loja na data alvo
  const { data: rawOsList = [], isLoading, refetch } = useQuery<PatioOsRow[]>({
    queryKey: ['store-ordens-servico', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId)
        .lte('opened_at', `${date}T23:59:59`)
        .order('os_number', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        os_number: row.os_number || '',
        store_id: row.store_id || storeId,
        plate: row.plate || 'N/I',
        client_name: row.client_name || row.store_name || 'Cliente',
        total_value: Number(row.total_value || 0),
        paid_value: Number(row.paid_value || 0),
        status: row.status || 'em_aberto',
        payment_method: row.payment_method || 'Cartão/PIX',
        opened_at: row.opened_at,
        closed_at: row.closed_at,
      }));
    },
    enabled: !!storeId && !!date,
  });

  // Mutação para salvar edição
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

      // Recalcula somatório de patio_os e sincroniza daily_snapshots e reconciliations
      const { data: allPatio } = await supabase
        .from('patio_os')
        .select('*')
        .lte('opened_at', `${date}T23:59:59`);

      if (allPatio) {
        const activeList = allPatio.filter((os: any) => {
          const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(os.status).toLowerCase());
          const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
          return !isClosed && saldo > 0;
        });

        const newTotal = activeList.reduce((acc: number, os: any) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

        await supabase
          .from('daily_snapshots')
          .update({ total_patio: newTotal })
          .eq('date', date);

        const storeTotal = activeList
          .filter((os: any) => os.store_id === storeId)
          .reduce((acc: number, os: any) => acc + (Number(os.total_value || 0) - Number(os.paid_value || 0)), 0);

        await supabase
          .from('reconciliations')
          .update({ na_loja_os: storeTotal })
          .eq('date', date)
          .eq('store_id', storeId);
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
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
        queryClient.invalidateQueries({ queryKey: ['patio-os-detail-modal'] })
      ]);
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar OS: ${err.message || err}`);
    }
  });

  // Criar nova OS manual
  const handleCreateManualOs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOsNumber.trim()) {
      toast.error('Informe o número da OS');
      return;
    }

    setIsSubmittingNew(true);
    try {
      const { error } = await supabase
        .from('patio_os')
        .insert({
          store_id: storeId,
          os_number: newOsNumber.trim(),
          plate: newPlate.trim().toUpperCase() || 'N/I',
          client_name: newClient.trim() || 'Cliente Manual',
          total_value: newTotal,
          paid_value: newPaid,
          status: newStatus,
          payment_method: newMethod,
          opened_at: `${date}T12:00:00Z`
        });

      if (error) throw error;

      toast.success(`OS #${newOsNumber} cadastrada com sucesso!`);
      setIsAddModalOpen(false);
      setNewOsNumber('');
      setNewPlate('');
      setNewClient('');
      setNewTotal(0);
      setNewPaid(0);

      await refetch();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] })
      ]);
    } catch (err: any) {
      toast.error(`Erro ao criar OS: ${err.message || err}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Filtragem
  const filteredList = useMemo(() => {
    return rawOsList.filter(os => {
      if (statusFilter === 'OPEN') {
        const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());
        const saldo = os.total_value - os.paid_value;
        if (isClosed || saldo <= 0) return false;
      } else if (statusFilter === 'CLOSED') {
        const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());
        if (!isClosed) return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        os.os_number.toLowerCase().includes(q) ||
        (os.plate && os.plate.toLowerCase().includes(q)) ||
        (os.client_name && os.client_name.toLowerCase().includes(q))
      );
    });
  }, [rawOsList, statusFilter, searchTerm]);

  // Totais
  const totalOsBruto = rawOsList.reduce((acc, os) => acc + os.total_value, 0);
  const totalOsPago = rawOsList.reduce((acc, os) => acc + os.paid_value, 0);
  const totalSaldoPatio = rawOsList
    .filter(os => {
      const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());
      return !isClosed && (os.total_value - os.paid_value) > 0;
    })
    .reduce((acc, os) => acc + (os.total_value - os.paid_value), 0);

  const openCount = rawOsList.filter(os => {
    const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());
    return !isClosed && (os.total_value - os.paid_value) > 0;
  }).length;

  const handleStartEdit = (os: PatioOsRow) => {
    setEditingId(os.id);
    setEditTotal(os.total_value);
    setEditPaid(os.paid_value);
    setEditStatus(os.status);
  };

  const handleSaveEdit = (id: string) => {
    updateOsMutation.mutate({
      id,
      total_value: editTotal,
      paid_value: editPaid,
      status: editStatus
    });
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando ordens de serviço..." /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 4 Cards de Resumo de OSs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Faturado */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total das OSs</span>
            <FileText size={16} className="text-zinc-400" />
          </div>
          <p className="text-xl font-bold text-zinc-100 font-mono">
            {formatCurrency(totalOsBruto)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{rawOsList.length} OSs cadastradas</span>
        </Card>

        {/* Card 2: Total Pago */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Recebido / Pago</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalOsPago)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Pagamentos efetuados</span>
        </Card>

        {/* Card 3: Saldo em Pátio (Pendente) */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saldo no Pátio (Na Loja OS)</span>
            <ShoppingBag size={16} className="text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400">
            {formatCurrency(totalSaldoPatio)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{openCount} veículos com saldo aberto</span>
        </Card>

        {/* Card 4: Botão de Nova OS */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Ação Rápida</span>
            <p className="text-xs text-zinc-400">Cadastre OSs ausentes manualmente no fechamento.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 h-8 shadow-sm"
          >
            <Plus size={14} />
            + Nova OS Manual
          </Button>
        </Card>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-zinc-100">
              <Car size={18} className="text-amber-400" />
              3. Ordens de Serviço da Loja & Pátio
            </h3>
            <p className="text-xs text-zinc-400">
              Consulte e edite valores totais, pagamentos e status das ordens de serviço da filial.
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar OS, placa..."
                className="bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 w-36 sm:w-44 font-sans"
              />
            </div>

            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors ${statusFilter === 'ALL' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Todas ({rawOsList.length})
              </button>
              <button
                onClick={() => setStatusFilter('OPEN')}
                className={`px-2.5 py-1 rounded-md transition-colors ${statusFilter === 'OPEN' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Pátio Aberto ({openCount})
              </button>
              <button
                onClick={() => setStatusFilter('CLOSED')}
                className={`px-2.5 py-1 rounded-md transition-colors ${statusFilter === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Finalizadas
              </button>
            </div>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <ShoppingBag size={36} className="opacity-20 mb-3" />
            Nenhuma Ordem de Serviço encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono">
                  <th className="text-left py-3 px-4 font-medium">Nº OS</th>
                  <th className="text-left py-3 px-4 font-medium">Placa / Veículo</th>
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Total</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Pago</th>
                  <th className="text-right py-3 px-4 font-medium">Saldo no Pátio</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-center py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredList.map((os) => {
                  const isEditing = editingId === os.id;
                  const saldoRestante = os.total_value - os.paid_value;
                  const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(os.status.toLowerCase());

                  return (
                    <tr key={os.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Nº OS */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-400 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOsData(os)}
                          className="hover:underline flex items-center gap-1"
                          title="Ver detalhes da OS"
                        >
                          #{os.os_number}
                          <ExternalLink size={11} />
                        </button>
                      </td>

                      {/* Placa */}
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-200 whitespace-nowrap">
                        {os.plate || 'N/I'}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4 text-zinc-300 max-w-[160px] truncate" title={os.client_name}>
                        {os.client_name || 'Cliente'}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-4 text-right font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editTotal}
                            onChange={(e) => setEditTotal(Number(e.target.value))}
                            className="w-24 bg-zinc-900 border border-emerald-500 rounded px-1.5 py-0.5 text-right text-xs font-mono text-zinc-100 focus:outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-zinc-200">{formatCurrency(os.total_value)}</span>
                        )}
                      </td>

                      {/* Valor Pago */}
                      <td className="py-3 px-4 text-right font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editPaid}
                            onChange={(e) => setEditPaid(Number(e.target.value))}
                            className="w-24 bg-zinc-900 border border-emerald-500 rounded px-1.5 py-0.5 text-right text-xs font-mono text-emerald-400 focus:outline-none"
                          />
                        ) : (
                          <span className="text-emerald-400 font-semibold">{formatCurrency(os.paid_value)}</span>
                        )}
                      </td>

                      {/* Saldo no Pátio */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {saldoRestante > 0 && !isClosed ? (
                          <span className="text-amber-400">{formatCurrency(saldoRestante)}</span>
                        ) : (
                          <span className="text-zinc-500">R$ 0,00</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="bg-zinc-900 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                          >
                            <option value="em_aberto">Em Aberto</option>
                            <option value="pago_parcial">Pago Parcial</option>
                            <option value="finalizado">Finalizado / Pago</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        ) : isClosed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Finalizado
                          </span>
                        ) : saldoRestante > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Pátio ({os.status})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            Pago
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(os.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                              title="Salvar alterações"
                            >
                              <Save size={12} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              title="Cancelar"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(os)}
                            className="text-[11px] h-7 px-2 text-zinc-400 hover:text-zinc-200 gap-1"
                            title="Editar valores e status"
                          >
                            <Edit2 size={11} />
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

      {/* Modal Nova OS Manual */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Cadastrar Nova Ordem de Serviço Manual"
        >
          <form onSubmit={handleCreateManualOs} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Número da OS <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={newOsNumber}
                  onChange={(e) => setNewOsNumber(e.target.value)}
                  placeholder="Ex: 8752"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  placeholder="Ex: ABC1234"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Cliente / Observação
              </label>
              <input
                type="text"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                placeholder="Ex: João da Silva / Troca de óleo"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Valor Total da OS (R$) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTotal || ''}
                  onChange={(e) => setNewTotal(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Valor Pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPaid || ''}
                  onChange={(e) => setNewPaid(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="em_aberto">Em Aberto</option>
                  <option value="pago_parcial">Pago Parcial</option>
                  <option value="finalizado">Finalizado / Pago</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão (Rede)</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Boleto">Boleto / A Receber</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmittingNew}
                className="text-xs text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingNew || !newOsNumber.trim() || newTotal <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4"
              >
                {isSubmittingNew ? 'Salvando...' : 'Salvar Ordem de Serviço'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detalhes da OS */}
      {selectedOsData && (
        <OsDetailModal
          isOpen={!!selectedOsData}
          onClose={() => setSelectedOsData(null)}
          os={selectedOsData}
          storeId={storeId}
        />
      )}
    </div>
  );
}
