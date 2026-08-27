import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { DanielVaultPickup } from './types';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Banknote, CheckCircle2, AlertTriangle, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Step3CashVaultDanielProps {
  targetDate: string;
  hadPickup: boolean | null;
  pickups: Record<string, DanielVaultPickup>;
  onSetHadPickup: (hadPickup: boolean) => void;
  onUpdatePickup: (storeId: string, storeName: string, balance: number, collected: number) => void;
  onSubmitPickups: () => Promise<boolean>;
}

export function Step3CashVaultDaniel({
  targetDate,
  hadPickup,
  pickups,
  onSetHadPickup,
  onUpdatePickup,
  onSubmitPickups
}: Step3CashVaultDanielProps) {
  const { data: stores = [] } = useStores();
  const [submitting, setSubmitting] = useState(false);

  // Busca o saldo atual em cofre por filial
  const { data: vaultBalances = {}, isLoading } = useQuery({
    queryKey: ['store-vault-balances-step3', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_cash_vault')
        .select('store_id, amount, status');

      if (error) {
        console.error('Erro ao buscar saldos de cofre:', error);
        return {};
      }

      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        const sId = row.store_id;
        const amt = Number(row.amount || 0);
        // Apenas valores não depositados compõem o cofre ativo
        if (row.status !== 'depositado') {
          map[sId] = (map[sId] || 0) + amt;
        }
      });
      return map;
    }
  });

  const handleValueChange = (storeId: string, storeName: string, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    const currentBal = vaultBalances[storeId] || 0;
    onUpdatePickup(storeId, storeName, currentBal, num);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onSubmitPickups();
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollected = Object.values(pickups).reduce((acc, p) => acc + (p.amountCollected || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header com a Pergunta Operacional Central */}
      <Card className="p-6 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2.5">
              <Banknote className="text-emerald-400" size={24} />
              Passo 3: Conferência de Cofre & Recolhimento do Daniel
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Verifique o dinheiro em espécie físico nas lojas. Informe se houve recolhimento para depósito em conta corrente ou se o montante permaneceu nos cofres das filiais.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Recolhido Daniel</span>
            <p className="text-xl font-bold font-mono text-emerald-400">
              R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Botoes de Decisao SIM / NAO */}
        <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
          <span className="text-xs font-semibold text-zinc-300">
            O Daniel recolheu dinheiro no cofre de alguma filial hoje?
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSetHadPickup(true)}
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
              onClick={() => onSetHadPickup(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hadPickup === false
                  ? 'bg-zinc-700 text-white shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ShieldCheck size={14} />
              NÃO, dinheiro permaneceu nos cofres
            </button>
          </div>
        </div>
      </Card>

      {/* Se SIM: Tabela das 10 Filiais para Lançar o Recolhimento */}
      {hadPickup === true && (
        <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-900/40">
          <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">
              Informe o valor recolhido por filial para baixar do cofre (`store_cash_vault`):
            </span>
            <Button
              size="sm"
              disabled={submitting || totalCollected === 0}
              onClick={handleConfirm}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
            >
              {submitting ? 'Gravando Baixa...' : 'Confirmar e Baixar Cofres'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Filial</th>
                  <th className="py-3 px-4 text-right">Saldo Atual no Cofre</th>
                  <th className="py-3 px-4 text-center">Valor Recolhido Daniel (R$)</th>
                  <th className="py-3 px-4 text-right">Saldo Remanescente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {stores.map(store => {
                  const currentBal = vaultBalances[store.id] || 0;
                  const pickupVal = pickups[store.id]?.amountCollected || 0;
                  const remaining = currentBal - pickupVal;

                  return (
                    <tr key={store.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-200">{store.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-300">
                        <AmountCell value={currentBal} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1">
                          <span className="text-zinc-500 font-mono text-xs">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={pickups[store.id]?.amountCollected || ''}
                            onChange={(e) => handleValueChange(store.id, store.name, e.target.value)}
                            className="w-24 bg-transparent text-xs font-mono font-bold text-right text-emerald-400 focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={`font-bold ${remaining < 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
                          R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Se NÃO: Confirmação de Cofre Físico Intacto */}
      {hadPickup === false && (
        <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 text-center">
          <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">
            Cofres mantidos com os saldos físicos intactos!
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg mx-auto">
            Nenhuma baixa de recolhimento foi registrada. O montante de dinheiro em espécie das 10 filiais continuará contabilizado no ativo de dinheiro em lojas.
          </p>
        </Card>
      )}
    </div>
  );
}
