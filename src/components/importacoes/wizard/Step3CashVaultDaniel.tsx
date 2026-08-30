import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AmountCell } from '@/components/finance/AmountCell';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Banknote,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface CashVaultEntry {
  id: string;
  store_id: string;
  store_name: string;
  amount: number;
  entry_date: string;
  status: string;
}

interface Props {
  targetDate: string;
  onNext: () => void;
  onBack: () => void;
}

export function Step3CashVaultDaniel({ targetDate, onNext, onBack }: Props) {
  const [hadPickup, setHadPickup] = useState<boolean | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Busca store_cash_vault WHERE status = 'em_transito' AND entry_date <= targetDate
  const { data: vaultEntries = [], isLoading } = useQuery<CashVaultEntry[]>({
    queryKey: ['store-cash-vault-em-transito', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cash_vault')
        .select('id, store_id, store_name, amount, entry_date, status')
        .eq('status', 'em_transito')
        .lte('entry_date', targetDate);

      if (error) {
        console.error('Erro ao buscar cofre em trânsito:', error);
        return [];
      }

      return (data || []) as CashVaultEntry[];
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(vaultEntries.map(e => e.id)));
  };

  const clearAll = () => setSelectedIds(new Set());

  const handleConfirmPickup = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione ao menos um registro para confirmar o recolhimento.');
      return;
    }

    setConfirming(true);
    try {
      const { error } = await supabase
        .from('store_cash_vault')
        .update({ status: 'depositado' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} registro(s) marcado(s) como depositado!`);
      setConfirmed(true);
    } catch (err: any) {
      toast.error(`Erro ao confirmar recolhimento: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const totalSelected = vaultEntries
    .filter(e => selectedIds.has(e.id))
    .reduce((acc, e) => acc + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header com pergunta central */}
      <Card className="p-6 bg-zinc-950 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2.5">
              <Banknote className="text-emerald-400" size={24} />
              Tela C: Cofre / Recolhimento Daniel
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Verifique se houve recolhimento de dinheiro do cofre das lojas. Se SIM, selecione os
              registros em trânsito que foram depositados.
            </p>
          </div>
        </div>

        {/* Radio SIM / NÃO */}
        <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
          <span className="text-xs font-semibold text-zinc-300">
            O Daniel recolheu dinheiro dos cofres hoje?
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHadPickup(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hadPickup === true
                  ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <CheckCircle2 size={14} />
              SIM, houve recolhimento
            </button>
            <button
              onClick={() => setHadPickup(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hadPickup === false
                  ? 'bg-zinc-700 text-white shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ShieldCheck size={14} />
              NÃO, dinheiro permaneceu
            </button>
          </div>
        </div>
      </Card>

      {/* SIM: Tabela de registros em_transito */}
      {hadPickup === true && (
        <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-950">
          <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-semibold text-zinc-200">
                Registros em trânsito — selecione os que foram recolhidos:
              </span>
              {isLoading && (
                <Loader2 size={12} className="inline ml-2 animate-spin text-zinc-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Selecionar todos
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={clearAll}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Limpar
              </button>

              {!confirmed && (
                <Button
                  size="sm"
                  disabled={confirming || selectedIds.size === 0}
                  onClick={handleConfirmPickup}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md ml-2"
                >
                  {confirming ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1" />
                      Gravando...
                    </>
                  ) : (
                    `Confirmar Recolhimento (${selectedIds.size})`
                  )}
                </Button>
              )}

              {confirmed && (
                <span className="text-xs text-emerald-400 font-semibold">✓ Registrado!</span>
              )}
            </div>
          </div>

          {vaultEntries.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-zinc-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
              <p className="text-sm font-semibold text-zinc-400">
                Nenhum registro em trânsito encontrado para {targetDate}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === vaultEntries.length && vaultEntries.length > 0}
                        onChange={e => (e.target.checked ? selectAll() : clearAll())}
                        className="accent-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Loja</th>
                    <th className="py-3 px-4">Data Entrada</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {vaultEntries.map(entry => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-zinc-800/20 transition-colors cursor-pointer ${
                        selectedIds.has(entry.id) ? 'bg-emerald-500/5' : ''
                      }`}
                      onClick={() => toggleSelect(entry.id)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          className="accent-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        {entry.store_name || entry.store_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{entry.entry_date}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        <AmountCell value={entry.amount} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedIds.size > 0 && (
                <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {selectedIds.size} registro(s) selecionado(s)
                  </span>
                  <span className="font-bold font-mono text-emerald-400">
                    Total: R$ {totalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* NÃO: confirmação */}
      {hadPickup === false && (
        <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 text-center">
          <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">
            Cofres mantidos com os saldos físicos intactos!
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg mx-auto">
            Nenhuma baixa de recolhimento será registrada. O montante de dinheiro em espécie
            continuará contabilizado.
          </p>
        </Card>
      )}

      {/* Navegação */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          onClick={onBack}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Voltar
        </Button>

        <Button
          onClick={onNext}
          className="text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer flex items-center gap-2"
        >
          Próximo: Auditoria Final
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
