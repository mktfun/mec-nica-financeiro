import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link2, CheckCircle2, Filter, ArrowRight, ArrowLeft, CreditCard, Banknote } from 'lucide-react';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { PendingUnmatchedTransaction } from '@/lib/matchers/autoMatchingEngine';
import { ManualMatchOsModal, ManualMatchTransaction } from '@/components/conciliacao/ManualMatchOsModal';

interface Store { id: string; name: string; }

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
  const [linkedTxs, setLinkedTxs] = useState<Map<string, string>>(new Map());

  const activeTxs = unmatchedTransactions.filter(tx => !linkedTxs.has(tx.id));
  const filteredTransactions = activeTxs.filter(tx => selectedStoreId === 'all' || tx.storeId === selectedStoreId);

  const matchTx: ManualMatchTransaction | null = useMemo(() => {
    if (!activeTx) return null;
    return {
      id: activeTx.id,
      title: activeTx.description || (activeTx.source === 'rede' ? 'Venda de Cartão REDE' : 'Depósito Bancário PIX'),
      counterpart_name: activeTx.description,
      amount: activeTx.amount,
      occurred_at: activeTx.date || targetDate,
      store_id: activeTx.storeId,
      source: activeTx.source === 'rede' ? 'rede' : 'ofx',
      payment_method: activeTx.paymentMethod,
      nsu: activeTx.nsu,
      authorization: activeTx.authorizationCode,
    };
  }, [activeTx, targetDate]);

  return (
    <div className='space-y-6'>
      {/* Header com Instruções e Contadores */}
      <Card className='p-6 bg-zinc-900/60 border-zinc-800'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-bold text-zinc-100 flex items-center gap-2'>
              <Link2 className='text-emerald-400' size={20} />
              Vínculo de Pagamentos sem Lançamento na OS
            </h2>
            <p className='text-xs text-zinc-400 mt-1 max-w-3xl'>
              Transações de Cartão (Rede) ou PIX que entraram no caixa/banco mas ainda não foram associadas a uma OS pelo sistema. Selecione a OS correspondente da loja — o sistema abate o saldo e concilia compulsoriamente com isolamento por filial.
            </p>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {linkedTxs.size > 0 && (
              <span className='text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30'>
                {linkedTxs.size} vinculadas nesta sessão
              </span>
            )}
            {activeTxs.length === 0 ? (
              <Badge className='bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs flex items-center gap-1.5 font-mono py-1 px-3'>
                <CheckCircle2 size={13} /> 100% Conciliado
              </Badge>
            ) : (
              <Badge variant='outline' className='bg-amber-500/15 text-amber-300 border-amber-500/40 font-mono text-xs py-1 px-3'>
                {activeTxs.length} Pendentes
              </Badge>
            )}
          </div>
        </div>

        {/* Filtro por Filial */}
        <div className='flex items-center gap-2 mt-5 pt-4 border-t border-zinc-800/80 overflow-x-auto pb-1'>
          <span className='text-[10px] font-bold text-zinc-500 uppercase shrink-0 flex items-center gap-1'>
            <Filter size={12} /> Filial:
          </span>
          <button
            onClick={() => setSelectedStoreId('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStoreId === 'all' 
                ? 'bg-zinc-100 text-zinc-950 shadow-sm' 
                : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white'
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
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedStoreId === st.id 
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-950/50' 
                    : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {st.name} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tabela de Transações Pendentes */}
      <Card className='p-0 overflow-hidden border-zinc-800 bg-zinc-900/60'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead>
              <tr className='border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider'>
                <th className='py-3.5 px-4'>Origem</th>
                <th className='py-3.5 px-4'>Filial</th>
                <th className='py-3.5 px-4'>Data</th>
                <th className='py-3.5 px-4'>Descrição / Detalhes</th>
                <th className='py-3.5 px-4'>Forma de Pag.</th>
                <th className='py-3.5 px-4 text-right'>Valor</th>
                <th className='py-3.5 px-4 text-right'>Ação</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-800/60 font-sans'>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-14 text-center text-zinc-500'>
                    <CheckCircle2 size={36} className='mx-auto mb-3 text-emerald-400/60' />
                    <p className='font-bold text-zinc-200 text-sm'>Nenhum pagamento órfão pendente nesta filial!</p>
                    <p className='text-xs text-zinc-500 mt-1'>Todas as transações casaram perfeitamente com as Ordens de Serviço.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className='hover:bg-zinc-800/40 transition-colors'>
                    <td className='py-3.5 px-4'>
                      {tx.source === 'rede' ? (
                        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30 text-[11px] font-mono font-bold text-teal-300'>
                          <CreditCard size={11} /> REDE
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-[11px] font-mono font-bold text-sky-300'>
                          <Banknote size={11} /> PIX / OFX
                        </span>
                      )}
                    </td>
                    <td className='py-3.5 px-4 font-bold text-zinc-100'>{tx.storeName}</td>
                    <td className='py-3.5 px-4 text-zinc-400 font-mono'>{tx.date}</td>
                    <td className='py-3.5 px-4 text-zinc-300 max-w-xs truncate' title={tx.description}>
                      <span className="font-medium text-zinc-200">{tx.description}</span>
                      {tx.nsu && <span className='text-[10px] text-zinc-500 font-mono block mt-0.5'>NSU: {tx.nsu}</span>}
                    </td>
                    <td className='py-3.5 px-4 font-mono font-semibold text-teal-400'>{tx.paymentMethod}</td>
                    <td className='py-3.5 px-4 text-right font-mono font-bold text-zinc-100 tabular-nums text-sm'>
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className='py-3.5 px-4 text-right'>
                      <Button
                        size='sm'
                        onClick={() => setActiveTx(tx)}
                        className='text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 font-bold cursor-pointer rounded-xl px-3 py-1.5 shadow-sm'
                      >
                        <Link2 size={13} className='mr-1.5' />
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

      {/* Modal Unificado de Vínculo com Inteligência e Isolamento por Filial */}
      {activeTx && (
        <ManualMatchOsModal
          isOpen={!!activeTx}
          onClose={() => setActiveTx(null)}
          transaction={matchTx}
          storeId={activeTx.storeId}
          targetDate={targetDate}
          stores={stores}
          onSuccess={() => {
            setLinkedTxs(prev => new Map(prev).set(activeTx.id, 'MATCHED'));
            if (onLinkToOs) {
              onLinkToOs(activeTx.id, 'MATCHED', activeTx.amount, activeTx.paymentMethod);
            }
            setActiveTx(null);
          }}
        />
      )}

      {/* Navegação de Rodapé */}
      <div className='flex items-center justify-between pt-4 border-t border-zinc-800'>
        <Button
          variant='outline'
          onClick={onBack}
          className='py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2'
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>

        <div className='flex items-center gap-3'>
          <Button
            onClick={onNext}
            className='py-2.5 px-6 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all'
          >
            Avançar para Justificativas
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
