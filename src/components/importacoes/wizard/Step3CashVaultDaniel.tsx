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
        .select('id, store_id, amount, entry_date, status, stores(name)')
        .eq('status', 'em_transito')
        .lte('entry_date', targetDate);

      if (error) {
        console.error('Erro ao buscar cofre em trânsito:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        store_id: row.store_id,
        store_name: row.stores?.name || row.store_id,
        amount: Number(row.amount || 0),
        entry_date: row.entry_date,
        status: row.status,
      })) as CashVaultEntry[];
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
      <Card className="p-6 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5">
              <Banknote className="text-emerald-400" size={22} />
              Conferência de Cofre / Recolhimento Daniel
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Verifique se houve recolhimento de dinheiro do cofre das lojas. Se SIM, selecione os
              registros em trânsito que foram depositados.
            </p>
          </div>
        </div>

        {/* Radio SIM / NÃO */}
        <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
          <span className="text-xs font-bold text-zinc-200">
            O Daniel recolheu dinheiro dos cofres hoje?
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHadPickup(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                hadPickup === true
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50'
                  : 'bg-zinc-950/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <CheckCircle2 size={14} />
              SIM, houve recolhimento
            </button>
            <button
              onClick={() => setHadPickup(false)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                hadPickup === false
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950/60 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/50'
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
        <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-900/60">
          <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-bold text-zinc-200">
                Registros em trânsito — selecione os que foram recolhidos:
              </span>
              {isLoading && (
                <Loader2 size={12} className="inline ml-2 animate-spin text-zinc-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                Selecionar todos
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Limpar
              </button>

              {!confirmed && (
                <Button
                  size="sm"
                  disabled={confirming || selectedIds.size === 0}
                  onClick={handleConfirmPickup}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md ml-2 rounded-xl px-4 py-1.5"
                >
                  {confirming ? (
                    <>
                      <Loader2 size={12} className="animate-spin mr-1.5" />
                      Gravando...
                    </>
                  ) : (
                    `Confirmar Recolhimento (${selectedIds.size})`
                  )}
                </Button>
              )}

              {confirmed && (
                <span className="text-xs text-emerald-400 font-bold font-mono bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  ✓ Registrado no Banco!
                </span>
              )}
            </div>
          </div>

          {vaultEntries.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-zinc-500">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400/60" />
              <p className="text-sm font-bold text-zinc-300">
                Nenhum registro em trânsito encontrado para {targetDate}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
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
                      className={`hover:bg-zinc-800/30 transition-colors cursor-pointer ${
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
                      <td className="py-3 px-4 font-bold text-zinc-100">
                        {entry.store_name || entry.store_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">{entry.entry_date}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-100 tabular-nums text-sm">
                        <AmountCell value={entry.amount} />
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedIds.size > 0 && (
                <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs bg-zinc-950/40">
                  <span className="text-zinc-400 font-sans">
                    {selectedIds.size} registro(s) selecionado(s)
                  </span>
                  <span className="font-bold font-mono text-emerald-400 text-sm tabular-nums">
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
        <Card className="p-8 bg-zinc-900/60 border border-zinc-800 text-center">
          <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-bold text-emerald-400">
            Cofres mantidos com os saldos físicos intactos!
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg mx-auto">
            Nenhuma baixa de recolhimento será registrada. O montante de dinheiro em espécie
            continuará contabilizado na filial.
          </p>
        </Card>
      )}

      {/* Navegação */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBack}
          className="py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>

        <Button
          onClick={onNext}
          className="py-2.5 px-6 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all"
        >
          Próximo: Auditoria dos 5 Pilares
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
