import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { PendingUnmatchedTransaction, LinkTransactionToOsPayload } from './types';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Search, Link2, CheckCircle2, Car, User, Filter, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Step1UnregisteredPaymentsProps {
  unmatchedTransactions: PendingUnmatchedTransaction[];
  onLinkToOs: (payload: LinkTransactionToOsPayload) => Promise<boolean>;
}

export function Step1UnregisteredPayments({
  unmatchedTransactions,
  onLinkToOs
}: Step1UnregisteredPaymentsProps) {
  const { data: stores = [] } = useStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [activeTx, setActiveTx] = useState<PendingUnmatchedTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [linking, setLinking] = useState(false);

  // Busca OSs da loja ativa quando o modal abre
  const { data: storeOsList = [], isLoading: isLoadingOs } = useQuery({
    queryKey: ['patio-os-for-linking', activeTx?.storeId],
    queryFn: async () => {
      if (!activeTx?.storeId) return [];
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .eq('store_id', activeTx.storeId)
        .in('status', ['em_aberto', 'pago_parcial'])
        .order('opened_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar OSs para vínculo:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!activeTx?.storeId
  });

  const filteredTransactions = unmatchedTransactions.filter(tx => {
    if (selectedStoreId !== 'all' && tx.storeId !== selectedStoreId) return false;
    return true;
  });

  const pendingCount = filteredTransactions.filter(t => t.status === 'pendente').length;
  const resolvedCount = filteredTransactions.filter(t => t.status === 'vinculada').length;

  const filteredOs = storeOsList.filter(os => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const osNum = String(os.os_number || '').toLowerCase();
    const client = String(os.client_name || '').toLowerCase();
    const plate = String(os.plate || '').toLowerCase();
    const model = String(os.model || '').toLowerCase();
    return osNum.includes(term) || client.includes(term) || plate.includes(term) || model.includes(term);
  });

  const handleSelectOs = async (os: any) => {
    if (!activeTx) return;
    setLinking(true);
    try {
      const success = await onLinkToOs({
        transactionId: activeTx.id,
        osId: os.id,
        osNumber: os.os_number,
        storeId: activeTx.storeId,
        amount: activeTx.amount,
        paymentMethod: activeTx.paymentMethod || 'Outros' // Herança direta da transação!
      });
      if (success) {
        setActiveTx(null);
        setSearchTerm('');
      }
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com instruções operacionais */}
      <Card className="p-5 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Link2 className="text-cyan-400" size={20} />
              Passo 1: Transações sem Lançamento de Pagamento na OS
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              O cliente realizou o pagamento via PIX ou Maquininha, o dinheiro entrou no extrato/Rede, mas o gerente da filial não lançou o pagamento dentro da OS. Localize a OS da loja no pátio e vincule em 1 clique — o sistema herdará compulsoriamente o valor e a forma de pagamento já detectados da transação.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="warning" dot className="font-mono text-xs">
              {pendingCount} Pendentes
            </Badge>
            {resolvedCount > 0 && (
              <Badge variant="success" dot className="font-mono text-xs">
                {resolvedCount} Vinculadas
              </Badge>
            )}
          </div>
        </div>

        {/* Filtro por Filial */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800/80 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0 flex items-center gap-1">
            <Filter size={12} /> Filial:
          </span>
          <button
            onClick={() => setSelectedStoreId('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              selectedStoreId === 'all' ? 'bg-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Todas as Lojas
          </button>
          {stores.map(st => (
            <button
              key={st.id}
              onClick={() => setSelectedStoreId(st.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                selectedStoreId === st.id ? 'bg-emerald-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {st.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Tabela de Transações Pendentes */}
      <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Origem</th>
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição / Comprovante</th>
                <th className="py-3 px-4">Forma de Pagamento</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500/50" />
                    Nenhuma transação com pagamento pendente de OS nesta filial!
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      {tx.source === 'rede' ? (
                        <Badge variant="brand" className="text-[10px] font-mono">REDE</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] font-mono">OFX PIX</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-200">{tx.storeName}</td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">{tx.date}</td>
                    <td className="py-3 px-4 text-zinc-300 max-w-xs truncate" title={tx.description}>
                      {tx.clientName && <span className="font-semibold text-white block">{tx.clientName}</span>}
                      <span className="text-[10px] text-zinc-500 font-mono">{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-400">{tx.paymentMethod}</td>
                    <td className="py-3 px-4 text-right">
                      <AmountCell value={tx.amount} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === 'vinculada' ? (
                        <Badge variant="success" dot className="text-[10px]">
                          OS #{tx.matchedOsNumber || 'Vinculada'}
                        </Badge>
                      ) : (
                        <Badge variant="warning" dot className="text-[10px]">Sem Lançamento</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setActiveTx(tx)}
                          className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold cursor-pointer"
                        >
                          <Link2 size={12} className="mr-1" />
                          Vincular a uma OS
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Seleção Direta de OS daquela Filial */}
      {activeTx && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTx(null)}
          title={`Vincular Pagamento: ${activeTx.paymentMethod} - R$ ${activeTx.amount.toFixed(2)}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Filial Selecionada</span>
                <p className="font-bold text-zinc-200">{activeTx.storeName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Valor a Vincular</span>
                <p className="font-bold font-mono text-emerald-400">R$ {activeTx.amount.toFixed(2)}</p>
              </div>
            </div>

            {/* Input de Busca Rápida de OS */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Buscar por placa, cliente, carro ou número da OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            {/* Lista de OSs em Aberto da Filial */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {isLoadingOs ? (
                <p className="text-center py-6 text-xs text-zinc-500">Carregando ordens de serviço do pátio...</p>
              ) : filteredOs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Nenhuma OS em aberto encontrada com esse critério nesta filial.</p>
                </div>
              ) : (
                filteredOs.map(os => {
                  const saldoEmAberto = Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0));
                  return (
                    <div
                      key={os.id}
                      className="p-3.5 bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-cyan-500/50 rounded-xl transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-cyan-400">OS #{os.os_number}</span>
                          {os.status === 'pago_parcial' && (
                            <Badge variant="warning" className="text-[9px]">Parcial</Badge>
                          )}
                          <span className="text-xs font-semibold text-white truncate max-w-xs">{os.client_name || 'Sem nome'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                          {os.plate && <span className="flex items-center gap-1"><Car size={10} /> {os.plate}</span>}
                          {os.model && <span>{os.model}</span>}
                          <span>Total: R$ {Number(os.total_value || 0).toFixed(2)}</span>
                          <span className="text-amber-400 font-bold">Em Aberto: R$ {saldoEmAberto.toFixed(2)}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={linking}
                        onClick={() => handleSelectOs(os)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Vincular (1 Clique)
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
