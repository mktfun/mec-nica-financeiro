import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Link2, FileText, CheckCircle2, AlertCircle, User, Car, Banknote } from 'lucide-react';
import { useAvailableStoreOs, useManualMatch, StoreOsCandidate } from '@/hooks/useManualMatch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

interface ManualMatchOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    title?: string;
    counterpart_name?: string;
    amount: number;
    occurred_at?: string;
    store_id?: string;
  } | null;
  storeId: string;
  targetDate: string;
}

export function ManualMatchOsModal({
  isOpen,
  onClose,
  transaction,
  storeId,
  targetDate,
}: ManualMatchOsModalProps) {
  const [search, setSearch] = useState('');
  const { data: osCandidates = [], isLoading } = useAvailableStoreOs(storeId, targetDate);
  const { linkTransactionToOs, loading: linking } = useManualMatch();

  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return osCandidates;
    const q = search.toLowerCase().trim();
    return osCandidates.filter(
      (os) =>
        os.os_number.toLowerCase().includes(q) ||
        os.client_name.toLowerCase().includes(q) ||
        os.plate.toLowerCase().includes(q) ||
        os.payment_method.toLowerCase().includes(q)
    );
  }, [osCandidates, search]);

  if (!transaction) return null;

  const handleLink = async (os: StoreOsCandidate) => {
    try {
      const res = await linkTransactionToOs(transaction.id, os.os_number, storeId);
      if (res.success) {
        toast.success(`Transação vinculada com sucesso à OS #${os.os_number}!`);
        onClose();
      } else {
        toast.error(`Falha ao vincular: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao vincular: ${err.message || err}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Transação Bancária à Ordem de Serviço (OS)"
      className="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Card do Lançamento Bancário */}
        <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Transação Bancária Selecionada (OFX / PIX)
            </span>
            <Badge variant="outline" className="text-xs font-mono text-[var(--color-primary)]">
              {transaction.occurred_at ? new Date(transaction.occurred_at).toLocaleDateString('pt-BR') : targetDate}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                {transaction.title || 'Depósito Bancário / PIX'}
              </p>
              {transaction.counterpart_name && (
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Contraparte: {transaction.counterpart_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--text-tertiary)] block uppercase">Valor Depositado</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                R$ {Math.abs(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Busca por OS */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar por Nº da OS, Nome do Cliente, Placa ou Forma de Pagamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] font-sans"
          />
        </div>

        {/* Lista de OSs da Loja */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner text="Carregando OSs da filial..." />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)] text-xs">
              <AlertCircle size={24} className="mx-auto mb-2 opacity-30" />
              Nenhuma Ordem de Serviço pendente encontrada para esta filial nesta data.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3 text-left">OS #</th>
                  <th className="py-2.5 px-3 text-left">Cliente / Placa</th>
                  <th className="py-2.5 px-3 text-left">Pagamento Declarado</th>
                  <th className="py-2.5 px-3 text-right">Valor OS</th>
                  <th className="py-2.5 px-3 text-center">Diferença</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredCandidates.map((os) => {
                  const osVal = os.pix_transfer_value > 0 ? os.pix_transfer_value : (os.paid_value || os.total_value);
                  const diff = Math.abs(osVal - Math.abs(transaction.amount));
                  const isExact = diff < 0.05;

                  return (
                    <tr
                      key={os.id || os.os_number}
                      className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${
                        isExact ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary)]">
                        <div className="flex items-center gap-1">
                          <FileText size={13} />
                          OS #{os.os_number}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)] flex items-center gap-1">
                            <User size={11} className="opacity-50" /> {os.client_name}
                          </span>
                          {os.plate && (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono flex items-center gap-1">
                              <Car size={10} className="opacity-50" /> {os.plate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {os.payment_method || 'PIX'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {osVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {isExact ? (
                          <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            <CheckCircle2 size={10} className="mr-1" /> Exato
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-semibold">
                            ± R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={linking}
                          onClick={() => handleLink(os)}
                          className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                        >
                          <Link2 size={12} />
                          Vincular
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Nota explicativa de proteção contábil */}
        <div className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
          <Banknote size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Aviso Contábil:</strong> Ao vincular este lançamento a uma OS, a pendência é baixada em ambas as pontas. O valor <strong>não será somado ao Faturamento Atual</strong>, pois a OS já compõe o Mapa de Metas da loja.
          </span>
        </div>

        {/* Botão Fechar */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
