import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Car, 
  DollarSign, 
  Search, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

export interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  opened_at?: string;
  days_open?: number;
}

interface MissingPatioOsEditorProps {
  missingList: MissingPatioOsEdit[];
  onChangeList: (updatedList: MissingPatioOsEdit[]) => void;
  onApplyDirectly?: () => void;
  isSaving?: boolean;
}

export const MissingPatioOsEditor: React.FC<MissingPatioOsEditorProps> = ({
  missingList,
  onChangeList,
  onApplyDirectly,
  isSaving = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState(true);

  // Lojas únicas presentes na lista
  const stores = useMemo(() => {
    const map = new Map<string, string>();
    missingList.forEach(item => map.set(item.store_id, item.store_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [missingList]);

  // Cálculos financeiros de impacto
  const { originalTotalSaldo, novoTotalSaldo, deltaSaldo, countBaixadas, countMantidas } = useMemo(() => {
    let orig = 0;
    let novo = 0;
    let baixadas = 0;
    let mantidas = 0;

    missingList.forEach(item => {
      const origSaldo = Math.max(0, item.original_total_value - item.original_paid_value);
      orig += origSaldo;

      if (item.status === 'finalizada' || item.status === 'cancelada') {
        baixadas++;
      } else {
        mantidas++;
        const novoSaldo = Math.max(0, item.total_value - item.paid_value);
        novo += novoSaldo;
      }
    });

    return {
      originalTotalSaldo: orig,
      novoTotalSaldo: novo,
      deltaSaldo: novo - orig,
      countBaixadas: baixadas,
      countMantidas: mantidas
    };
  }, [missingList]);

  // Filtros de busca e loja
  const filteredItems = useMemo(() => {
    return missingList.filter(item => {
      const matchStore = selectedStore === 'ALL' || item.store_id === selectedStore;
      const matchText = 
        item.os_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.store_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStore && matchText;
    });
  }, [missingList, selectedStore, searchTerm]);

  // Manipuladores de edição
  const handleUpdateItem = (id: string, updates: Partial<MissingPatioOsEdit>) => {
    const updated = missingList.map(item => {
      if (item.id !== id) return item;
      const next = { ...item, ...updates };
      // Ajuste automático de status conforme valores
      if (updates.status === undefined) {
        const saldo = next.total_value - next.paid_value;
        if (saldo <= 0) {
          next.status = 'finalizada';
        } else if (next.paid_value > 0) {
          next.status = 'pago_parcial';
        } else {
          next.status = 'em_aberto';
        }
      }
      return next;
    });
    onChangeList(updated);
  };

  const handleBatchStatus = (status: 'finalizada' | 'em_aberto') => {
    const updated = missingList.map(item => {
      // Se houver filtro ativo, afeta apenas os filtrados
      if (selectedStore !== 'ALL' && item.store_id !== selectedStore) return item;
      return {
        ...item,
        status: status,
        paid_value: status === 'finalizada' ? item.total_value : item.paid_value
      };
    });
    onChangeList(updated);
  };

  if (missingList.length === 0) {
    return null;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-zinc-900/90 border border-amber-500/40 rounded-xl overflow-hidden shadow-2xl transition-all">
      {/* Header com Resumo e Ações Rápidas */}
      <div 
        className="p-4 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border-b border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                OSs do Pátio Ausentes nos Arquivos de Hoje
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/30">
                  {missingList.length} OSs pendentes
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Estes veículos constavam no pátio até ontem e não vieram nos relatórios .xls de hoje. Ajuste o valor ou dê baixa antes de fechar.
            </p>
          </div>
        </div>

        {/* Resumo Financeiro no Header */}
        <div className="flex items-center gap-4 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800" onClick={e => e.stopPropagation()}>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Saldo em Pátio</span>
            <div className="flex items-center gap-2">
              <span className="text-xs line-through text-zinc-500 font-mono">{formatCurrency(originalTotalSaldo)}</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{formatCurrency(novoTotalSaldo)}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-left">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Impacto Líquido</span>
            <span className={`text-xs font-bold font-mono ${deltaSaldo < 0 ? 'text-emerald-400' : deltaSaldo > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
              {deltaSaldo > 0 ? `+${formatCurrency(deltaSaldo)}` : deltaSaldo < 0 ? formatCurrency(deltaSaldo) : 'Sem alteração'}
            </span>
          </div>
        </div>
      </div>

      {/* Corpo Expansível */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Barra de Ferramentas / Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/80">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por OS, Placa ou Loja..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="ALL">Todas as Lojas ({missingList.length})</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Ações em Lote */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleBatchStatus('finalizada')}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Dar Baixa em Todas (Quitadas)
              </button>
              <button
                type="button"
                onClick={() => handleBatchStatus('em_aberto')}
                className="px-3 py-1.5 text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Manter Todas no Pátio
              </button>
            </div>
          </div>

          {/* Tabela de OSs Ausentes com Edição Inline */}
          <div className="overflow-x-auto rounded-lg border border-zinc-800 max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider sticky top-0 z-10 border-b border-zinc-800 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">OS / Placa</th>
                  <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                  <th className="py-2.5 px-3 text-right">Valor Pago (R$)</th>
                  <th className="py-2.5 px-3 text-right">Saldo Restante</th>
                  <th className="py-2.5 px-3 text-center">Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-500 text-xs">
                      Nenhuma OS encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const saldoRestante = Math.max(0, item.total_value - item.paid_value);
                    const isBaixada = item.status === 'finalizada' || item.status === 'cancelada';

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-zinc-800/40 transition-colors ${isBaixada ? 'opacity-60 bg-zinc-950/30' : ''}`}
                      >
                        <td className="py-2 px-3 font-medium text-zinc-200">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700">
                            {item.store_name}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <div className="font-bold text-zinc-100">OS #{item.os_number}</div>
                          <div className="text-[10px] text-zinc-500">{item.plate !== '-' ? item.plate : 'Sem Placa'}</div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isBaixada}
                            value={item.total_value}
                            onChange={(e) => handleUpdateItem(item.id, { total_value: Number(e.target.value) || 0 })}
                            className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-xs text-zinc-100 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isBaixada}
                            value={item.paid_value}
                            onChange={(e) => handleUpdateItem(item.id, { paid_value: Number(e.target.value) || 0 })}
                            className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={saldoRestante > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                            {formatCurrency(saldoRestante)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isBaixada ? (
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(item.id, { status: 'em_aberto', paid_value: item.original_paid_value })}
                                className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[11px] font-semibold flex items-center gap-1 border border-zinc-700"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-400" />
                                Reabrir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateItem(item.id, { status: 'finalizada', paid_value: item.total_value })}
                                className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30"
                              >
                                <Check className="w-3 h-3" />
                                Dar Baixa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <div className="flex items-center gap-4">
              <span>Mantidas em Pátio: <strong className="text-zinc-200">{countMantidas}</strong></span>
              <span>Baixadas/Quitadas: <strong className="text-emerald-400">{countBaixadas}</strong></span>
            </div>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              As alterações serão salvas automaticamente ao avançar para a conciliação.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
