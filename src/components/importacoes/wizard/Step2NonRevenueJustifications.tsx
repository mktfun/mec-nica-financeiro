import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { PendingUnmatchedTransaction, NonRevenueJustificationItem, NonRevenueCategory } from './types';
import { useStores } from '@/hooks/useStores';
import { FileQuestion, CheckCircle2, Edit2, Trash2, ArrowRightLeft, Landmark, Undo2 } from 'lucide-react';

interface Step2NonRevenueJustificationsProps {
  unmatchedTransactions: PendingUnmatchedTransaction[];
  justifications: Record<string, NonRevenueJustificationItem>;
  onSaveJustification: (item: NonRevenueJustificationItem) => void;
  onRemoveJustification: (transactionId: string) => void;
}

export function Step2NonRevenueJustifications({
  unmatchedTransactions,
  justifications,
  onSaveJustification,
  onRemoveJustification
}: Step2NonRevenueJustificationsProps) {
  const { data: stores = [] } = useStores();
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [category, setCategory] = useState<NonRevenueCategory>('transferencia_filiais');
  const [destStoreId, setDestStoreId] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');

  const handleStartEdit = (tx: PendingUnmatchedTransaction) => {
    const existing = justifications[tx.id];
    setActiveTxId(tx.id);
    if (existing) {
      setCategory(existing.category);
      setDestStoreId(existing.destinationStoreId || '');
      setReasonText(existing.reasonText);
    } else {
      setCategory('transferencia_filiais');
      setDestStoreId(stores.find(s => s.id !== tx.storeId)?.id || '');
      setReasonText('');
    }
  };

  const handleSave = (tx: PendingUnmatchedTransaction) => {
    if (!reasonText.trim()) {
      alert('Por favor, informe a justificativa contábil.');
      return;
    }

    onSaveJustification({
      transactionId: tx.id,
      storeId: tx.storeId,
      amount: tx.amount,
      category,
      destinationStoreId: category === 'transferencia_filiais' ? destStoreId : undefined,
      reasonText: reasonText.trim(),
      createdAt: new Date().toISOString()
    });

    setActiveTxId(null);
    setReasonText('');
  };

  const categoryLabels: Record<NonRevenueCategory, { label: string; color: string }> = {
    transferencia_filiais: { label: 'Transferência Entre Filiais', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    aporte_capital: { label: 'Aporte de Sócios / Capital', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    devolucao_estorno: { label: 'Estorno / Cancelamento Cartão', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
    tarifa_bancaria: { label: 'Tarifa / Custo Bancário', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    receita_avulsa: { label: 'Receita Avulsa / Outros', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' }
  };

  const justifiedCount = Object.keys(justifications).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <FileQuestion className="text-amber-400" size={20} />
              Passo 2: Justificativas de Não-Faturamento (Por Filial)
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Classifique transações bancárias e de cartões que não possuem caminho no faturamento da oficina (Transferências entre lojas, Aportes, Devoluções ou Tarifas). Você possui liberdade total para editar ou cancelar a justificativa antes da gravação final.
            </p>
          </div>

          <Badge variant="brand" className="font-mono text-xs shrink-0">
            {justifiedCount} Justificadas
          </Badge>
        </div>
      </Card>

      {/* Lista de Transações para Justificar */}
      <div className="space-y-3">
        {unmatchedTransactions.length === 0 ? (
          <Card className="p-8 text-center text-zinc-500 bg-zinc-900/30 border-zinc-800">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-zinc-300">Nenhuma transação pendente de justificativa!</p>
          </Card>
        ) : (
          unmatchedTransactions.map(tx => {
            const isEditing = activeTxId === tx.id;
            const existing = justifications[tx.id];

            return (
              <Card key={tx.id} className="p-4 bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Dados da Transação */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{tx.storeName}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">• {tx.date}</span>
                      <Badge variant="neutral" className="text-[10px] font-mono">{tx.paymentMethod}</Badge>
                      {existing && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryLabels[existing.category].color}`}>
                          {categoryLabels[existing.category].label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 font-mono truncate max-w-xl">{tx.description}</p>
                    {existing && (
                      <p className="text-xs text-emerald-400/90 font-sans italic mt-1">
                        Motivo: "{existing.reasonText}"
                        {existing.destinationStoreId && (
                          <span className="font-semibold text-zinc-300 ml-1">
                            (Destino: {stores.find(s => s.id === existing.destinationStoreId)?.name})
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Valor e Ações */}
                  <div className="flex items-center gap-4 justify-between lg:justify-end shrink-0">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-zinc-500 uppercase block">Valor</span>
                      <AmountCell value={tx.amount} />
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {existing ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStartEdit(tx)}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                            >
                              <Edit2 size={12} className="mr-1" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onRemoveJustification(tx.id)}
                              className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer"
                            >
                              <Undo2 size={12} className="mr-1" /> Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStartEdit(tx)}
                            className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold cursor-pointer"
                          >
                            Justificar Movimento
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulário Inline de Justificativa / Edição */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 bg-zinc-950/60 p-4 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Categoria Contábil</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as NonRevenueCategory)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="transferencia_filiais">Transferência Entre Filiais</option>
                          <option value="aporte_capital">Aporte de Sócios / Capital</option>
                          <option value="devolucao_estorno">Estorno / Devolução Maquininha</option>
                          <option value="tarifa_bancaria">Tarifa / Custo Bancário</option>
                          <option value="receita_avulsa">Receita Avulsa / Outros</option>
                        </select>
                      </div>

                      {category === 'transferencia_filiais' && (
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Filial de Destino</label>
                          <select
                            value={destStoreId}
                            onChange={(e) => setDestStoreId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            {stores.filter(s => s.id !== tx.storeId).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Justificativa / Motivo Contábil</label>
                      <input
                        type="text"
                        placeholder="Ex: Transferência de saldo para cobrir despesas de peças da Matriz..."
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveTxId(null)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(tx)}
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer"
                      >
                        Salvar Justificativa
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
