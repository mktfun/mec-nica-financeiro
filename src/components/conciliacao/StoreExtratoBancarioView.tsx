import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Landmark, 
  CheckCircle2, 
  HelpCircle, 
  Link2, 
  FileEdit, 
  Unlink, 
  CreditCard, 
  QrCode, 
  DollarSign, 
  Info,
  Clock
} from 'lucide-react';
import { useTransactionsPorDataELoja } from '@/hooks/useTransactions';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { useManualMatch } from '@/hooks/useManualMatch';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { ManualMatchOsModal } from './ManualMatchOsModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface StoreExtratoBancarioViewProps {
  storeId: string;
  date: string;
}

export function StoreExtratoBancarioView({ storeId, date }: StoreExtratoBancarioViewProps) {
  const { data: allTransactions = [], isLoading } = useTransactionsPorDataELoja(date, storeId);
  const { categorize } = useCategorizeOrphan();
  const { unlinkTransaction } = useManualMatch();
  const queryClient = useQueryClient();

  const [categorizingTx, setCategorizingTx] = useState<any | null>(null);
  const [matchingTx, setMatchingTx] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato bancário..." /></div>;
  }

  // Filtra apenas as entradas bancárias do extrato OFX
  const ofxDeposits = allTransactions.filter(t => t.source === 'ofx' && t.type === 'in');

  const totalEntradas = ofxDeposits.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const isRedeTx = (t: any) => {
    const title = `${t.title || ''} ${t.subtitle || ''} ${t.counterpart_name || ''}`.toUpperCase();
    return title.includes('REDE') || title.includes('CIELO') || title.includes('GETNET') || title.includes('PAGSEGURO') || title.includes('STONE') || title.includes('ADQ') || title.includes('CART');
  };

  const totalRede = ofxDeposits.filter(t => isRedeTx(t)).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalOsPix = ofxDeposits.filter(t => !isRedeTx(t) && (t.os_number || (t as any).matched_os_number)).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalJustificado = ofxDeposits.filter(t => !isRedeTx(t) && !(t.os_number || (t as any).matched_os_number) && t.manual_category).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalPendente = totalEntradas - (totalRede + totalOsPix + totalJustificado);

  const handleUnlink = async (txId: string, osNumber: string) => {
    try {
      const res = await unlinkTransaction(txId, osNumber);
      if (res.success) {
        toast.success(`Vínculo com a OS #${osNumber} desfeito com sucesso!`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
          queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['justified_transactions'] })
        ]);
      } else {
        toast.error(`Falha ao desvincular: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao desvincular: ${err.message || err}`);
    }
  };

  const handleCategorizationSuccess = async () => {
    toast.success('Justificativa aplicada com sucesso!');
    setCategorizingTx(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
      queryClient.invalidateQueries({ queryKey: ['justified_transactions'] })
    ]);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes('T')) {
        const timePart = dateStr.split('T')[1]?.substring(0, 5);
        if (timePart && timePart !== '00:00') return timePart;
      }
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards de Resumo do Extrato Bancário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Entradas */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Entradas OFX</span>
            <Landmark size={16} className="text-zinc-400" />
          </div>
          <p className="text-xl font-bold text-zinc-100 font-mono">
            {formatCurrency(totalEntradas)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{ofxDeposits.length} lançamento(s) creditados</span>
        </Card>

        {/* Card 2: Lote de Cartão */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-blue-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cartão / Adquirente</span>
            <CreditCard size={16} className="text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-400">
            {formatCurrency(totalRede)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Liquidação de maquininha</span>
        </Card>

        {/* Card 3: PIX / OS Vinculados */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">PIX Vinculados a OS</span>
            <QrCode size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalOsPix)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Pagamentos de clientes</span>
        </Card>

        {/* Card 4: Pendente / Avulso */}
        <Card variant="elevated" className={`p-4 bg-zinc-900 border-zinc-800 ${totalPendente > 0 ? 'border-l-2 border-l-amber-500' : ''}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avulso / Justificado</span>
            <DollarSign size={16} className={totalPendente > 0 ? 'text-amber-400' : 'text-zinc-400'} />
          </div>
          <p className={`text-xl font-bold font-mono ${totalPendente > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
            {formatCurrency(totalJustificado)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {totalPendente > 0 ? `Pendente de ação: ${formatCurrency(totalPendente)}` : 'Todas entradas classificadas'}
          </span>
        </Card>
      </div>

      {/* Tabela no Estilo Extrato Bancário Real */}
      <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-zinc-100">
              <Landmark size={18} className="text-emerald-400" />
              2. Extrato Bancário da Filial (OFX & PIX / Entradas)
            </h3>
            <p className="text-xs text-zinc-400">
              Visão cronológica dos depósitos bancários: identifique quais créditos pertencem a OSs, maquininha ou receitas avulsas.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-zinc-700 text-zinc-300">
            {ofxDeposits.length} Lançamentos
          </Badge>
        </div>

        {ofxDeposits.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma entrada registrada no extrato bancário desta loja para a data selecionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono">
                  <th className="text-left py-3 px-4 font-medium">Data / Hora</th>
                  <th className="text-left py-3 px-4 font-medium">Descrição Bancária</th>
                  <th className="text-left py-3 px-4 font-medium">Contraparte / Documento</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Creditado</th>
                  <th className="text-center py-3 px-4 font-medium">Identificação / Vínculo</th>
                  <th className="text-center py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {ofxDeposits.map((tx: any) => {
                  const isRede = isRedeTx(tx);
                  const osNum = tx.os_number || (tx as any).matched_os_number;
                  const hasCategory = !!tx.manual_category;
                  const time = formatTime(tx.occurred_at || tx.date);

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Data / Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-zinc-500" />
                          <span>{time || '12:00'}</span>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 font-medium text-zinc-200 max-w-[240px]">
                        <div className="flex flex-col">
                          <span className="truncate" title={tx.title || tx.subtitle}>
                            {tx.title || tx.subtitle || 'Depósito Bancário'}
                          </span>
                          {tx.manual_justification && (
                            <span className="text-[11px] text-emerald-400 italic truncate">
                              "{tx.manual_justification}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contraparte / Documento */}
                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                        {tx.counterpart_name || tx.cnpj_cpf || tx.fitid || '—'}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        + {formatCurrency(tx.amount)}
                      </td>

                      {/* Identificação / Vínculo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isRede ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-semibold">
                            <CreditCard size={11} className="mr-1" />
                            Rede Liquidada
                          </Badge>
                        ) : osNum ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                            <QrCode size={11} className="mr-1" />
                            OS #{osNum}
                          </Badge>
                        ) : hasCategory ? (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] font-semibold">
                            <CheckCircle2 size={11} className="mr-1" />
                            {String(tx.manual_category).replace('_', ' ')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                            <HelpCircle size={11} className="mr-1" />
                            Não Identificado
                          </Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isRede && !osNum && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMatchingTx(tx)}
                                className="text-[11px] h-7 px-2.5 bg-zinc-900 border-zinc-700 text-blue-400 hover:bg-zinc-800 hover:text-blue-300 gap-1 font-medium"
                                title="Vincular a uma Ordem de Serviço"
                              >
                                <Link2 size={12} />
                                Vincular OS
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCategorizingTx(tx)}
                                className="text-[11px] h-7 px-2 text-zinc-400 hover:text-zinc-200 gap-1"
                                title="Justificar lançamento (Sucata, Aporte, etc.)"
                              >
                                <FileEdit size={12} />
                                Justificar
                              </Button>
                            </>
                          )}

                          {osNum && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnlink(tx.id, osNum)}
                              className="text-[10px] h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 font-mono"
                              title="Desvincular OS"
                            >
                              <Unlink size={11} />
                              Desvincular
                            </Button>
                          )}

                          {hasCategory && !osNum && !isRede && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCategorizingTx(tx)}
                              className="text-[10px] h-6 px-2 text-zinc-400 hover:text-zinc-200"
                              title="Editar justificativa"
                            >
                              Editar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Justificativa */}
      {categorizingTx && (
        <OrphanCategorizationModal
          transactionId={categorizingTx.id}
          transactionTitle={categorizingTx.title || categorizingTx.subtitle || categorizingTx.counterpart_name || 'Transação OFX'}
          transactionAmount={Number(categorizingTx.amount || 0)}
          transactionType="in"
          onClose={() => setCategorizingTx(null)}
          onSuccess={handleCategorizationSuccess}
          categorizeOrphan={(id, cat, just, impacts) => categorize(id, cat, just, impacts, Number(categorizingTx.amount || 0), date)}
        />
      )}

      {/* Modal de Vínculo com OS */}
      {matchingTx && (
        <ManualMatchOsModal
          isOpen={!!matchingTx}
          onClose={() => setMatchingTx(null)}
          transaction={matchingTx}
          storeId={storeId}
        />
      )}
    </div>
  );
}
