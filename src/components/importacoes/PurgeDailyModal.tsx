import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePurgeDailyData } from '@/hooks/usePurgeDailyData';
import { Trash2, AlertTriangle, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PurgeDailyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onSuccess?: () => void;
}

export function PurgeDailyModal({ isOpen, onClose, initialDate, onSuccess }: PurgeDailyModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [confirmed, setConfirmed] = useState(false);
  const { purgeDailyData, isPurging } = usePurgeDailyData();

  const handlePurge = async () => {
    if (!selectedDate) return;
    try {
      await purgeDailyData(selectedDate);
      setConfirmed(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Exclusão Cirúrgica por Data (Reset Diário)" size="md">
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Atenção: Limpeza Seletiva de Conciliação
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Esta ação apagará <strong>exclusivamente</strong> os dados do dia selecionado ({formattedDate || '...'}), permitindo reimportar e reprocessar a conciliação do zero.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="space-y-2 bg-[var(--bg-canvas)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
          <label className="block text-[11px] font-semibold uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
            <Calendar size={13} className="text-[var(--color-primary)]" />
            Selecione a Data a Ser Resetada:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Protection Checklist */}
        <div className="space-y-2 text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
          <div className="font-semibold text-zinc-300 mb-1">O que acontece durante o reset:</div>
          <div className="flex items-center gap-2 text-rose-400">
            <span>✕</span>
            <span>Apaga transações, snapshot, extratos e contas do dia {formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={13} />
            <span>Marco Zero e cadastros de lojas permanecem 100% intactos</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={13} />
            <span>Fechamentos de outros dias (ontem, amanhã) NÃO são alterados</span>
          </div>
        </div>

        {/* Checkbox de Confirmação */}
        <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
          />
          <span>Confirmar reset dos dados do dia <strong>{formattedDate}</strong></span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button onClick={onClose} variant="outline" className="text-xs py-2 px-4">
            Cancelar
          </Button>
          <Button
            onClick={handlePurge}
            disabled={isPurging || !confirmed || !selectedDate}
            className="text-xs py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPurging ? <LoadingSpinner size="xs" /> : <Trash2 size={13} />}
            {isPurging ? 'Resetando Dia...' : `Resetar Dia (${formattedDate})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
