import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import { useTriggerBotExtraction } from '@/hooks/useBotDownloadedFiles';
import { Bot, Calendar, Landmark, Server, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface TriggerBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function TriggerBotModal({
  isOpen,
  onClose,
  defaultDate = new Date().toISOString().split('T')[0],
}: TriggerBotModalProps) {
  const { data: stores = [] } = useStores();
  const triggerExtraction = useTriggerBotExtraction();

  const [selectedStore, setSelectedStore] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(defaultDate);
  const [botUrl, setBotUrl] = useState<string>('https://bot.tork.services');

  // Inicializa com a primeira loja quando as lojas carregarem
  React.useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id);
    }
  }, [stores, selectedStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStore) {
      toast.error('Selecione uma filial.');
      return;
    }
    if (!fromDate || !toDate) {
      toast.error('Informe o período completo da extração.');
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('A data inicial não pode ser superior à data final.');
      return;
    }

    try {
      await triggerExtraction.mutateAsync({
        store: selectedStore,
        from: fromDate,
        to: toDate,
        botUrl,
      });
      onClose();
    } catch {
      // Erro já exibido pelo onError do hook via toast
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disparar Extração de Extrato Bancário"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3">
          <Bot className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-zinc-300 space-y-1">
            <p className="font-semibold text-amber-300">Execução Autônoma no Servidor 24/7</p>
            <p className="text-zinc-400">
              O robô rodará em segundo plano no servidor VPS, validará o extrato e salvará o arquivo .ofx no buffer de 48h para download e conciliação.
            </p>
          </div>
        </div>

        {/* Seleção do Banco */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
            Instituição Financeira
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-medium text-zinc-200">
            <Landmark size={16} className="text-amber-400" />
            <span>Itaú Empresas PJ (Playwright Scraper)</span>
          </div>
        </div>

        {/* Seleção de Filial */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
            Filial / Loja
          </label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code || s.id})
              </option>
            ))}
          </select>
        </div>

        {/* Período de Extração */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
              Data Inicial (From)
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block mb-1">
              Data Final (To)
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Servidor VPS */}
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5 mb-1">
            <Server size={12} /> Servidor do Robô
          </label>
          <input
            type="text"
            value={botUrl}
            onChange={(e) => setBotUrl(e.target.value)}
            placeholder="https://bot.tork.services"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Ações */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={triggerExtraction.isPending}
            className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={triggerExtraction.isPending}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-950/40"
          >
            <Bot size={14} />
            {triggerExtraction.isPending ? 'Extraindo no Servidor...' : 'Iniciar Extração'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
