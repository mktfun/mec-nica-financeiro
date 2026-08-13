import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Check, Clock, CheckCircle2, ShieldCheck, Database, Search } from 'lucide-react';
import { toast } from 'sonner';

interface LegacyOs {
  id: string;
  os_number: string;
  plate: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago' | 'pago_parcial' | 'conciliado';
}

export function LegacyOsTable({ storeId, date }: { storeId: string; date: string }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Legacy OSs
  const { data: legacyOsList = [], isLoading } = useQuery({
    queryKey: ['legacy-os', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', storeId)
        .eq('opened_at', date)
        .order('os_number', { ascending: true });

      if (error) throw error;
      return data as LegacyOs[];
    }
  });

  // Mutation to liquidate OSs
  const liquidateMutation = useMutation({
    mutationFn: async (osIds: string[]) => {
      if (osIds.length === 0) return;
      const { data, error } = await supabase.rpc('liquidate_legacy_os', {
        p_os_ids: osIds
      });
      if (error) throw error;
      if (data?.status === 'error') throw new Error(data.message);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(data?.message || `${variables.length} OS(s) liquidadas com sucesso.`);
      setSelectedIds([]);
      // Cache invalidation
      queryClient.invalidateQueries({ queryKey: ['legacy-os', storeId, date] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-views'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['daily-snapshot'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao liquidar OSs: ' + (err.message || 'Desconhecido'));
    }
  });

  const totals = {
    count: legacyOsList.length,
    totalValue: legacyOsList.reduce((acc, os) => acc + os.total_value, 0),
    paidValue: legacyOsList.filter(os => os.status === 'pago' || os.status === 'conciliado').reduce((acc, os) => acc + os.total_value, 0),
    pendingValue: legacyOsList.filter(os => os.status === 'em_aberto').reduce((acc, os) => acc + os.total_value, 0),
  };

  const filteredOsList = legacyOsList.filter(os => 
    os.os_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (os.plate && os.plate.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelectAll = () => {
    const allPending = filteredOsList.filter(os => os.status === 'em_aberto').map(os => os.id);
    if (selectedIds.length === allPending.length && allPending.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPending);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500">Carregando OSs legadas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1 font-semibold uppercase tracking-wider">Total de OSs</span>
          <span className="font-bold text-xl text-zinc-100">{totals.count}</span>
        </div>
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1 font-semibold uppercase tracking-wider">Valor Legado</span>
          <span className="font-bold text-xl text-zinc-100">{formatCurrency(totals.totalValue)}</span>
        </div>
        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
          <span className="text-xs text-emerald-400 block mb-1 font-semibold uppercase tracking-wider">Total Pago (Baixado)</span>
          <span className="font-bold text-xl text-emerald-400">{formatCurrency(totals.paidValue)}</span>
        </div>
        <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
          <span className="text-xs text-orange-400 block mb-1 font-semibold uppercase tracking-wider">Total Pendente</span>
          <span className="font-bold text-xl text-orange-400">{formatCurrency(totals.pendingValue)}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por número da OS..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
          />
        </div>
        
        <Button 
          onClick={() => liquidateMutation.mutate(selectedIds)}
          disabled={selectedIds.length === 0 || liquidateMutation.isPending}
          className="w-full md:w-auto flex items-center gap-2"
        >
          {liquidateMutation.isPending ? (
             <span className="animate-spin mr-1">⚙</span>
          ) : (
            <Check size={16} />
          )}
          {liquidateMutation.isPending ? 'Liquidando...' : `Liquidar Selecionadas (${selectedIds.length})`}
        </Button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-950 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
                    onChange={toggleSelectAll}
                    checked={
                      filteredOsList.filter(o => o.status === 'em_aberto').length > 0 && 
                      selectedIds.length === filteredOsList.filter(o => o.status === 'em_aberto').length
                    }
                  />
                </th>
                <th className="px-4 py-3 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 uppercase tracking-wider">Número OS</th>
                <th className="px-4 py-3 uppercase tracking-wider">Placa</th>
                <th className="px-4 py-3 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredOsList.map(os => {
                const isPaid = os.status === 'pago' || os.status === 'conciliado';
                return (
                  <tr key={os.id} className={`hover:bg-zinc-800/50 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        disabled={isPaid}
                        className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed"
                        checked={selectedIds.includes(os.id)}
                        onChange={() => toggleSelect(os.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-zinc-200">{os.os_number}</td>
                    <td className="px-4 py-3 text-zinc-400">{os.plate}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(os.total_value)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isPaid && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => liquidateMutation.mutate([os.id])}
                          disabled={liquidateMutation.isPending}
                          className="text-xs text-zinc-300 hover:text-white hover:bg-emerald-500/20"
                        >
                          Baixar Manual
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredOsList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
