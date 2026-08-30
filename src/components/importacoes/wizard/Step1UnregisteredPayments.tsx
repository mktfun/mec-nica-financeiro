import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Search, Link2, CheckCircle2, Car, Filter, AlertCircle, ArrowRight, ArrowLeft, Layers, Database, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { PendingUnmatchedTransaction } from '@/lib/matchers/autoMatchingEngine';

interface Store { id: string; name: string; }

export interface StoreOsCandidate {
  id: string;
  os_number: string;
  client_name: string;
  plate: string;
  model?: string;
  total_value: number;
  paid_value: number;
  open_balance: number;
  payment_method: string;
  parsed_credit?: number;
  parsed_debit?: number;
  parsed_pix?: number;
  parsed_cash?: number;
  source: 'memoria_lote' | 'banco_patio';
}

interface Step1Props {
  unmatchedTransactions: PendingUnmatchedTransaction[];
  results: UnifiedImportResult;
  mapping: Record<string, string>;
  targetDate: string;
  stores: Store[];
  resolvedMatches?: Array<{ osNumber: string; storeId: string; type: string; amount: number }>;
  onLinkToOs?: (transactionId: string, osNumber: string, amount: number, paymentMethod: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1UnregisteredPayments({
  unmatchedTransactions,
  results,
  mapping,
  targetDate,
  stores,
  resolvedMatches = [],
  onLinkToOs,
  onNext,
  onBack,
}: Step1Props) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [activeTx, setActiveTx] = useState<PendingUnmatchedTransaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkedTxs, setLinkedTxs] = useState<Map<string, string>>(new Map()); // txId -> osNumber

  const activeTxs = unmatchedTransactions.filter(tx => !linkedTxs.has(tx.id));
  const filteredTransactions = activeTxs.filter(tx => selectedStoreId === 'all' || tx.storeId === selectedStoreId);

  // Conjunto de OSs que JÁ foram casadas automaticamente ou vinculadas manualmente
  const alreadyMatchedOsNumbers = useMemo(() => {
    const set = new Set<string>();
    resolvedMatches.forEach(m => set.add(String(m.osNumber)));
    linkedTxs.forEach(osNum => set.add(String(osNum)));
    return set;
  }, [resolvedMatches, linkedTxs]);

  // Busca OSs ativas do banco patio_os estritamente para a filial da transação ativa
  const { data: dbOsList = [], isLoading: isLoadingDbOs } = useQuery({
    queryKey: ['patio-os-for-linking-db', activeTx?.storeId],
    queryFn: async () => {
      if (!activeTx?.storeId) return [];
      const { data } = await supabase
        .from('patio_os')
        .select('id, os_number, plate, client_name, model, total_value, paid_value, status, payment_method, credit_value, debit_value, pix_transfer_value, cash_value')
        .eq('store_id', activeTx.storeId)
        .neq('status', 'finalizada')
        .order('opened_at', { ascending: false })
        .limit(150);
      return data || [];
    },
    enabled: !!activeTx?.storeId
  });

  // FONTE DUPLA FILTRADA: Apenas OSs da MESMA LOJA que NÃO foram vinculadas
  const candidateOsList = useMemo<StoreOsCandidate[]>(() => {
    if (!activeTx?.storeId) return [];
    const map = new Map<string, StoreOsCandidate>();

    // 1. Fonte Memória (Lote importado atual) — Estritamente da mesma loja
    results.osFiles
      .filter(r => r.success && mapping[r.storeAlias] === activeTx.storeId)
      .forEach(file => {
        file.osArray.forEach(os => {
          const num = String(os.os_number || '').trim();
          if (!num) return;

          // Se já foi casada ou vinculada, não exibir
          if (alreadyMatchedOsNumbers.has(num)) return;

          const total = Number(os.total_value || 0);
          const paid = Number(os.paid_value || 0);
          const open = Math.max(0, total - paid);

          // Se está 100% quitada no arquivo e sem saldo em aberto, não poluir a lista
          if (open === 0 && paid >= total && total > 0) return;

          map.set(num, {
            id: `mem-${num}`,
            os_number: num,
            client_name: os.client_name || 'Cliente (Lote)',
            plate: os.plate || '',
            model: os.model || '',
            total_value: total,
            paid_value: paid,
            open_balance: open,
            payment_method: os.payment_method || 'Aberto',
            parsed_credit: Number(os.parsed_credit || 0),
            parsed_debit: Number(os.parsed_debit || 0),
            parsed_pix: Number(os.parsed_pix_transfer || 0),
            parsed_cash: Number(os.parsed_cash || os.cash_value || 0),
            source: 'memoria_lote'
          });
        });
      });

    // 2. Fonte Banco de Dados (patio_os) — Estritamente da mesma loja
    dbOsList.forEach((row: any) => {
      const num = String(row.os_number || '').trim();
      if (!num || map.has(num)) return;
      if (alreadyMatchedOsNumbers.has(num)) return;

      const total = Number(row.total_value || 0);
      const paid = Number(row.paid_value || 0);
      const open = Math.max(0, total - paid);

      if (open === 0 && paid >= total && total > 0) return;

      map.set(num, {
        id: row.id,
        os_number: num,
        client_name: row.client_name || 'Cliente (Banco)',
        plate: row.plate || '',
        model: row.model || '',
        total_value: total,
        paid_value: paid,
        open_balance: open,
        payment_method: row.payment_method || 'Aberto',
        parsed_credit: Number(row.credit_value || 0),
        parsed_debit: Number(row.debit_value || 0),
        parsed_pix: Number(row.pix_transfer_value || 0),
        parsed_cash: Number(row.cash_value || 0),
        source: 'banco_patio'
      });
    });

    // Ordenar: primeiro as que têm valor compatível com a transação ativa
    const list = Array.from(map.values());
    if (activeTx) {
      const txAmt = activeTx.amount;
      list.sort((a, b) => {
        const matchA = Math.abs(a.open_balance - txAmt) <= 0.10 || Math.abs(a.total_value - txAmt) <= 0.10 ? 1 : 0;
        const matchB = Math.abs(b.open_balance - txAmt) <= 0.10 || Math.abs(b.total_value - txAmt) <= 0.10 ? 1 : 0;
        return matchB - matchA;
      });
    }

    return list;
  }, [activeTx, results.osFiles, mapping, dbOsList, alreadyMatchedOsNumbers]);

  // Filtro de busca na lista de OSs candidatas
  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidateOsList;
    const t = searchTerm.toLowerCase().trim();
    return candidateOsList.filter(os =>
      os.os_number.toLowerCase().includes(t) ||
      os.client_name.toLowerCase().includes(t) ||
      os.plate.toLowerCase().includes(t) ||
      (os.model && os.model.toLowerCase().includes(t))
    );
  }, [candidateOsList, searchTerm]);

  // Renderizador de Badges de Pagamento
  const renderPaymentBadges = (os: StoreOsCandidate) => {
    const badges = [];
    if (os.parsed_credit && os.parsed_credit > 0) {
      badges.push(
        <span key="cred" className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
          💳 Crédito: R$ {os.parsed_credit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    if (os.parsed_debit && os.parsed_debit > 0) {
      badges.push(
        <span key="deb" className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          💳 Débito: R$ {os.parsed_debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    if (os.parsed_pix && os.parsed_pix > 0) {
      badges.push(
        <span key="pix" className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ⚡ PIX: R$ {os.parsed_pix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    if (os.parsed_cash && os.parsed_cash > 0) {
      badges.push(
        <span key="cash" className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          💵 Dinheiro: R$ {os.parsed_cash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    if (badges.length === 0) {
      if (os.payment_method && os.payment_method !== 'Aberto') {
        badges.push(
          <span key="raw" className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
            📋 {os.payment_method}
          </span>
        );
      } else {
        badges.push(
          <span key="open" className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
            ⏳ Sem Pagamento Lançado
          </span>
        );
      }
    }
    return <div className="flex items-center gap-1.5 flex-wrap mt-1">{badges}</div>;
  };

  // Ação de Vínculo de 1 Clique
  const handleSelectOs = async (os: StoreOsCandidate) => {
    if (!activeTx) return;
    setLinking(true);
    try {
      if (os.source === 'banco_patio') {
        const newPaid = Number(os.paid_value || 0) + activeTx.amount;
        const newStatus = newPaid >= os.total_value ? 'finalizada' : 'pago_parcial';
        await supabase
          .from('patio_os')
          .update({
            paid_value: newPaid,
            payment_method: activeTx.paymentMethod,
            status: newStatus
          })
          .eq('id', os.id);
      }

      await supabase.from('conciliation_matches').insert({
        store_id: activeTx.storeId,
        os_id: os.id,
        os_number: os.os_number,
        match_type: 'MANUAL_1CLICK',
        amount: activeTx.amount,
        target_date: targetDate,
        payment_method: activeTx.paymentMethod,
        source: activeTx.source
      });

      if (onLinkToOs) {
        onLinkToOs(activeTx.id, os.os_number, activeTx.amount, activeTx.paymentMethod);
      }

      setLinkedTxs(prev => new Map(prev).set(activeTx.id, os.os_number));
      setActiveTx(null);
      setSearchTerm('');
      toast.success(`OS #${os.os_number} vinculada com sucesso! R$ ${activeTx.amount.toFixed(2)} (${activeTx.paymentMethod}).`);
    } catch (err: any) {
      toast.error(`Erro ao vincular OS: ${err.message || 'Falha na gravação'}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Instruções e Contadores */}
      <Card className="p-5 bg-zinc-900 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Link2 className="text-emerald-400" size={20} />
              Passo 4: Vínculo de Pagamentos sem Lançamento na OS
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Transações de Cartão (Rede) ou PIX que entraram no caixa/banco mas o gerente não lançou o pagamento na OS. Selecione a OS correspondente — o sistema herda compulsoriamente o valor e a forma de pagamento em 1 clique.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {linkedTxs.size > 0 && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                {linkedTxs.size} vinculadas
              </span>
            )}
            <Badge variant="warning" dot className="font-mono text-xs">
              {activeTxs.length} Pendentes
            </Badge>
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
            Todas ({activeTxs.length})
          </button>
          {stores.map(st => {
            const count = activeTxs.filter(tx => tx.storeId === st.id).length;
            if (count === 0) return null;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStoreId(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedStoreId === st.id ? 'bg-emerald-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {st.name} ({count})
              </button>
            );
          })}
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
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Forma de Pag.</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500/50" />
                    <p className="font-semibold text-zinc-300">Nenhum pagamento órfão pendente nesta filial!</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Todas as transações casaram automaticamente com as Ordens de Serviço.</p>
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
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-400">{tx.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveTx(tx)}
                        className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold cursor-pointer"
                      >
                        <Link2 size={12} className="mr-1" />
                        Vincular à OS
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Navegação de Rodapé */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2 text-sm border-zinc-700 text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft size={16} />
          ← Voltar ao Preview
        </Button>
        <Button
          onClick={onNext}
          className="flex items-center gap-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 cursor-pointer shadow-md shadow-emerald-950/30"
        >
          Próximo: Justificativas por Loja
          <ArrowRight size={16} />
        </Button>
      </div>

      {/* Modal de Vínculo com Fonte Dupla de OSs — Amplo (max-w-4xl) */}
      {activeTx && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTx(null)}
          title="Vincular Pagamento à Ordem de Serviço (OS)"
          size="xl"
        >
          <div className="space-y-5">
            {/* Card de Contexto da Transação Selecionada em 3 Colunas */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Filial & Origem</span>
                <div className="flex items-center gap-2 mt-1">
                  {activeTx.source === 'rede' ? (
                    <Badge variant="brand" className="text-[10px] font-mono">REDE</Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px] font-mono">OFX PIX</Badge>
                  )}
                  <p className="font-semibold text-sm text-zinc-200">{activeTx.storeName}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Descrição / Data</span>
                <p className="text-xs text-zinc-300 font-mono mt-1 truncate" title={activeTx.description}>
                  {activeTx.date} • {activeTx.description}
                </p>
              </div>

              <div className="md:text-right">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Valor a Vincular</span>
                <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  R$ {activeTx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-xs font-sans text-zinc-400 font-normal ml-1.5">({activeTx.paymentMethod})</span>
                </p>
              </div>
            </div>

            {/* Barra de Busca Rápida */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por placa (ex: ABC1234), modelo do carro, nome do cliente ou número da OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-mono">
                <span>OSs pendentes nesta filial ({activeTx.storeName}): {candidateOsList.length}</span>
                <span>Resultados da busca: {filteredCandidates.length}</span>
              </div>
            </div>

            {/* Lista de OSs Candidatas (Apenas da mesma filial e sem vínculo) */}
            <div className="max-h-[440px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
              {isLoadingDbOs && candidateOsList.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Carregando ordens de serviço da filial...
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-40 text-amber-500" />
                  <p className="text-sm font-medium text-zinc-300">Nenhuma OS em aberto encontrada para {activeTx.storeName}</p>
                  <p className="text-xs text-zinc-500 mt-1">Todas as OSs desta filial já foram conciliadas ou não correspondem à busca.</p>
                </div>
              ) : (
                filteredCandidates.map(os => {
                  const isSuggested =
                    Math.abs(os.open_balance - activeTx.amount) <= 0.10 ||
                    Math.abs(os.total_value - activeTx.amount) <= 0.10;

                  return (
                    <div
                      key={os.id}
                      className={`p-4 bg-zinc-950 hover:bg-zinc-900/90 border rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                        isSuggested ? 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Lado Esquerdo: Identificação OS, Cliente, Placa, Modelo e Badges de Pagamento */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            OS #{os.os_number}
                          </span>
                          <span className="text-sm font-semibold text-zinc-100 truncate max-w-md">
                            {os.client_name}
                          </span>
                          {isSuggested && (
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 font-bold">
                              <Sparkles size={10} /> Sugestão (Valor Compatível)
                            </span>
                          )}
                          {os.source === 'memoria_lote' ? (
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                              <Layers size={10} /> Lote do Dia
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded flex items-center gap-1 border border-zinc-700/50">
                              <Database size={10} /> Banco Pátio
                            </span>
                          )}
                        </div>

                        {/* Placa e Modelo */}
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          {os.plate ? (
                            <span className="flex items-center gap-1.5 font-mono font-bold text-zinc-100 bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 rounded shadow-sm">
                              <Car size={13} className="text-emerald-400" />
                              {os.plate}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic text-[11px]">Sem placa</span>
                          )}
                          {os.model && (
                            <span className="text-zinc-300 font-medium">
                              {os.model}
                            </span>
                          )}
                        </div>

                        {/* Formas de Pagamento Estruturadas em Badges Claros */}
                        {renderPaymentBadges(os)}
                      </div>

                      {/* Lado Direito: Valores Contábeis + Botão de Vínculo Blindado */}
                      <div className="shrink-0 flex items-center justify-between md:justify-end gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                        <div className="text-left md:text-right font-mono">
                          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total da OS</span>
                          <span className="text-xs text-zinc-300 font-medium">
                            R$ {os.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-amber-400 font-bold block mt-0.5">
                            {os.open_balance > 0 ? (
                              `Saldo em Aberto: R$ ${os.open_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-emerald-400">✓ Saldo Zerado</span>
                            )}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          disabled={linking}
                          onClick={() => handleSelectOs(os)}
                          className="min-w-[155px] h-9 px-4 shrink-0 whitespace-nowrap bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg shadow-sm shadow-emerald-950/40 cursor-pointer transition-all"
                        >
                          <Link2 size={13} className="mr-1.5" />
                          Vincular (1 Clique)
                        </Button>
                      </div>
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
