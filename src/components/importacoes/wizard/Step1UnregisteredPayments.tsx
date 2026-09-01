import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Link2, CheckCircle2, Filter, ArrowRight, ArrowLeft, CreditCard, 
  Banknote, Car 
} from 'lucide-react';
import { UnifiedImportResult } from '@/hooks/useCentralImport';
import { PendingUnmatchedTransaction } from '@/lib/matchers/autoMatchingEngine';
import { ManualMatchOsModal, ManualMatchTransaction } from '@/components/conciliacao/ManualMatchOsModal';
import { MissingPatioOsEditor, MissingPatioOsEdit } from '../MissingPatioOsEditor';

interface Store { id: string; name: string; }

interface Step1Props {
  unmatchedTransactions: PendingUnmatchedTransaction[];
  results: UnifiedImportResult;
  mapping: Record<string, string>;
  targetDate: string;
  stores: Store[];
  resolvedMatches?: Array<{ osNumber: string; storeId: string; type: string; amount: number }>;
  missingOsList?: MissingPatioOsEdit[];
  onChangeMissingOsList?: (updatedList: MissingPatioOsEdit[]) => void;
  isSaving?: boolean;
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
  missingOsList = [],
  onChangeMissingOsList,
  isSaving = false,
  onLinkToOs,
  onNext,
  onBack,
}: Step1Props) {
  const [activeTab, setActiveTab] = useState<'unmatched' | 'patio'>('unmatched');
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
    <div className="space-y-6">
      {/* Header com Instruções e Contadores */}
      <Card className="p-5 bg-zinc-900 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Link2 className="text-emerald-400" size={20} />
              Passo 4: Conciliação de OSs & Pagamentos Órfãos
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Vincule recebimentos bancários/cartões a ordens de serviço pendentes e audite veículos que continuam em atendimento no pátio.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {linkedTxs.size > 0 && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                {linkedTxs.size} vinculadas nesta sessão
              </span>
            )}
            {activeTxs.length === 0 ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1 font-mono">
                <CheckCircle2 size={12} /> Pagamentos Conciliados
              </Badge>
            ) : (
              <Badge variant="warning" dot className="font-mono text-xs">
                {activeTxs.length} Pagamentos Pendentes
              </Badge>
            )}
          </div>
        </div>

        {/* Segmented Control / Navegação de Abas do Step 4 */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('unmatched')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'unmatched'
                ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-950/40'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <CreditCard size={14} />
            <span>1. Pagamentos Órfãos (PIX / Cartão)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'unmatched' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {activeTxs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patio')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'patio'
                ? 'bg-sky-500 text-zinc-950 font-bold shadow-md shadow-sky-950/40'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Car size={14} />
            <span>2. OSs do Pátio Pendentes de Baixa (Carryover)</span>
            {missingOsList.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'patio' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}>
                {missingOsList.length}
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* CONTEÚDO DA ABA 1: PAGAMENTOS ÓRFÃOS */}
      {activeTab === 'unmatched' && (
        <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-900/40">
          {/* Filtro por Filial */}
          <div className="flex items-center gap-2 p-3 bg-zinc-950/40 border-b border-zinc-800 overflow-x-auto">
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

          {/* Tabela de Transações */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição / Detalhes</th>
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
                          <Badge variant="brand" className="text-[10px] font-mono flex items-center gap-1 w-fit">
                            <CreditCard size={10} /> REDE
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] font-mono flex items-center gap-1 w-fit">
                            <Banknote size={10} /> PIX / OFX
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-200">{tx.storeName}</td>
                      <td className="py-3 px-4 text-zinc-400 font-mono">{tx.date}</td>
                      <td className="py-3 px-4 text-zinc-300 max-w-xs truncate" title={tx.description}>
                        {tx.description}
                        {tx.nsu && <span className="text-[10px] text-zinc-500 font-mono block">NSU: {tx.nsu}</span>}
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
      )}

      {/* CONTEÚDO DA ABA 2: OSS DO PÁTIO / CARRYOVER */}
      {activeTab === 'patio' && (
        <div className="space-y-4">
          {missingOsList.length === 0 ? (
            <Card className="p-12 text-center border-zinc-800 bg-zinc-900/40">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-sky-500/50" />
              <p className="font-semibold text-zinc-300">Nenhum veículo de dias anteriores pendente de baixa.</p>
              <p className="text-xs text-zinc-500 mt-1">Todas as ordens de serviço do pátio foram conciliadas nos arquivos importados.</p>
            </Card>
          ) : (
            <MissingPatioOsEditor
              missingList={missingOsList}
              onChangeList={onChangeMissingOsList || (() => {})}
              isSaving={isSaving}
            />
          )}
        </div>
      )}

      {/* Modal de Vínculo */}
      {activeTx && (
        <ManualMatchOsModal
          isOpen={!!activeTx}
          onClose={() => setActiveTx(null)}
          transaction={matchTx}
          storeId={activeTx.storeId}
          targetDate={targetDate}
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
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBack}
          className="py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Voltar para Parâmetros (Passo 3)
        </Button>

        <Button
          onClick={onNext}
          className="py-2.5 px-6 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/40 flex items-center gap-2 cursor-pointer"
        >
          Avançar para Justificativas (Passo 5)
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
