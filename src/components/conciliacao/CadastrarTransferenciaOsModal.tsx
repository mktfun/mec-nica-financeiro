import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { useCreateBatchReceivables, OsTransferParcelaInput } from '@/hooks/useRecebiveis';
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Building2,
  FileText,
  User
} from 'lucide-react';
import { toast } from 'sonner';

export interface CadastrarTransferenciaOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  osNumber: string;
  clientName?: string;
  totalAmount: number;
  targetDate: string;
  onSuccess?: () => void;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().substring(0, 10);
  } catch {
    return dateStr;
  }
}

export function CadastrarTransferenciaOsModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  osNumber,
  clientName,
  totalAmount,
  targetDate,
  onSuccess
}: CadastrarTransferenciaOsModalProps) {
  const [numInstallments, setNumInstallments] = useState<number>(1);
  const [installments, setInstallments] = useState<OsTransferParcelaInput[]>([]);
  const createBatch = useCreateBatchReceivables();

  // Inicializa as parcelas quando o modal abre ou os dados mudam
  useEffect(() => {
    if (isOpen) {
      generateInstallments(numInstallments > 0 ? numInstallments : 1);
    }
  }, [isOpen, totalAmount, targetDate]);

  const generateInstallments = (count: number) => {
    const n = Math.max(1, Math.min(12, count));
    setNumInstallments(n);

    const baseVal = Math.floor((totalAmount / n) * 100) / 100;
    const remainder = Math.round((totalAmount - (baseVal * n)) * 100) / 100;

    const newInst: OsTransferParcelaInput[] = [];
    for (let i = 1; i <= n; i++) {
      // Ajusta o centavo na última parcela
      const itemVal = (i === n) ? Math.round((baseVal + remainder) * 100) / 100 : baseVal;
      // Intervalos: 1x = data alvo (ou D+1); 2x = D+15, D+30; 3x = D+10, D+20, D+30 etc.
      const daysOffset = n === 1 ? 1 : Math.round((i * 30) / n);
      newInst.push({
        installmentNumber: i,
        totalInstallments: n,
        installmentLabel: `${i}/${n}`,
        value: itemVal,
        dueDate: addDaysToDateStr(targetDate, daysOffset)
      });
    }
    setInstallments(newInst);
  };

  const handleInstallmentCountChange = (count: number) => {
    generateInstallments(count);
  };

  const handleValueChange = (index: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setInstallments(prev => {
      const next = [...prev];
      next[index] = { ...next[index], value: Math.max(0, val) };
      return next;
    });
  };

  const handleDueDateChange = (index: number, dateStr: string) => {
    setInstallments(prev => {
      const next = [...prev];
      next[index] = { ...next[index], dueDate: dateStr };
      return next;
    });
  };

  const currentTotal = installments.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const diff = Math.round((totalAmount - currentTotal) * 100) / 100;
  const isBalanced = Math.abs(diff) < 0.01;

  const handleAutoBalance = () => {
    if (installments.length === 0) return;
    setInstallments(prev => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      next[lastIdx] = {
        ...next[lastIdx],
        value: Math.max(0, Math.round((next[lastIdx].value + diff) * 100) / 100)
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      toast.error(`A soma das parcelas (${formatCurrency(currentTotal)}) difere do total da OS (${formatCurrency(totalAmount)}). Ajuste os valores.`);
      return;
    }

    if (!storeId || !osNumber) {
      toast.error('Dados incompletos da OS ou Filial.');
      return;
    }

    try {
      await createBatch.mutateAsync({
        storeId,
        storeName,
        osNumber,
        clientName,
        date: targetDate,
        installments
      });

      toast.success(`${installments.length} parcela(s) de transferência cadastrada(s) para OS #${osNumber}! Baixa automática vinculada ao extrato.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao cadastrar parcelas: ${err.message || err}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Desdobrar Transferência em Conta (Recebíveis)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-1">
        {/* Banner Informativo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-zinc-100 text-sm">OS #{osNumber}</span>
                <Badge variant="brand" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                  Transferência Bancária
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <Building2 size={12} className="text-zinc-500" />
                <span className="font-medium text-zinc-300">{storeName}</span>
                {clientName && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <User size={12} className="text-zinc-500" />
                    <span className="text-zinc-400 truncate max-w-[150px]">{clientName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono block">Valor Total OS</span>
            <span className="font-mono font-bold text-base text-emerald-400">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Seletor de Parcelas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Quantidade de Parcelas
            </label>
            <span className="text-[11px] text-zinc-400">
              Dividir em até 6x ou selecione o atalho:
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleInstallmentCountChange(num)}
                className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                  numInstallments === num
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {num}x
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Parcelas e Vencimentos Inline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
            <span>Parcelas e Datas de Vencimento</span>
            <span>Subtotal: {formatCurrency(currentTotal)}</span>
          </div>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 divide-y divide-zinc-800/80">
            {installments.map((inst, idx) => (
              <div key={idx} className="p-2.5 flex items-center gap-3 hover:bg-zinc-900/30 transition-colors">
                <div className="w-12 text-center">
                  <span className="font-mono font-bold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {inst.installmentLabel}
                  </span>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-0.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inst.value}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="w-40">
                  <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-0.5">
                    Vencimento
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => handleDueDateChange(idx, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validação de Saldo e Auto-Balance */}
        <div className="flex items-center justify-between p-3 rounded-xl border bg-zinc-900/70 border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="text-emerald-300 font-medium">Soma das parcelas confere com a OS.</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-amber-300 font-medium">
                  Diferença de {formatCurrency(Math.abs(diff))} {diff > 0 ? 'faltando' : 'excedente'}.
                </span>
              </>
            )}
          </div>

          {!isBalanced && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoBalance}
              className="text-xs h-7 gap-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              <RotateCcw size={12} />
              Ajustar Centavos
            </Button>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={createBatch.isPending}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={createBatch.isPending || !isBalanced || installments.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 shadow-sm"
          >
            {createBatch.isPending ? 'Cadastrando...' : 'Confirmar e Cadastrar Parcelas'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
