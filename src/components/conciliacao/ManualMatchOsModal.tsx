import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Link2, FileText, CheckCircle2, AlertCircle, User, Car, Banknote, Sparkles } from 'lucide-react';
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

function checkNameMatch(txCounterpart: string = '', txTitle: string = '', clientName: string = ''): { isNameMatch: boolean; matchedWords: string[] } {
  if (!clientName || clientName.toLowerCase().trim() === 'cliente') return { isNameMatch: false, matchedWords: [] };
  
  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
  const txCombined = normalize(`${txCounterpart} ${txTitle}`);
  const txWords = txCombined.split(/\s+/).filter(w => w.length >= 3 && !['pix', 'ted', 'doc', 'transf', 'transferencia', 'deposito', 'entrada', 'saida', 'banco', 'ltda', 'eireli', 'me'].includes(w));
  const clientWords = normalize(clientName).split(/\s+/).filter(w => w.length >= 3 && !['ltda', 'eireli', 'me', 'cliente'].includes(w));
  
  const matched = clientWords.filter(cw => txWords.some(tw => tw === cw || (cw.length >= 4 && (tw.includes(cw) || cw.includes(tw)))));
  const isNameMatch = matched.length >= 2 || (matched.length === 1 && matched[0].length >= 5);
  return { isNameMatch, matchedWords: matched };
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

  // Desduplica por os_number e ordena com matches inteligentes no topo
  const sortedAndDeduplicatedCandidates = useMemo(() => {
    if (!transaction) return [];

    const txAmount = Math.abs(transaction.amount);
    const uniqueMap = new Map<string, StoreOsCandidate>();

    // Desduplica por os_number
    osCandidates.forEach((os) => {
      const num = String(os.os_number || '').trim();
      if (num && !uniqueMap.has(num)) {
        uniqueMap.set(num, os);
      }
    });

    let list = Array.from(uniqueMap.values());

    // Filtro de busca
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (os) =>
          os.os_number.toLowerCase().includes(q) ||
          os.client_name.toLowerCase().includes(q) ||
          os.plate.toLowerCase().includes(q) ||
          os.payment_method.toLowerCase().includes(q)
      );
    }

    // Ordenação Inteligente: 1. Nome + Valor (100) -> 2. Nome (80) -> 3. Valor (60) -> 4. Menor Diferença
    return list.sort((a, b) => {
      const matchA = checkNameMatch(transaction.counterpart_name, transaction.title, a.client_name);
      const matchB = checkNameMatch(transaction.counterpart_name, transaction.title, b.client_name);

      const valA = a.pix_transfer_value > 0 ? a.pix_transfer_value : Math.max(0, a.total_value - a.paid_value);
      const valB = b.pix_transfer_value > 0 ? b.pix_transfer_value : Math.max(0, b.total_value - b.paid_value);
      const diffA = Math.abs(valA - txAmount);
      const diffB = Math.abs(valB - txAmount);
      const exactA = diffA < 0.05;
      const exactB = diffB < 0.05;

      const scoreA = (matchA.isNameMatch && exactA) ? 100 : (matchA.isNameMatch ? 80 : (exactA ? 60 : 0));
      const scoreB = (matchB.isNameMatch && exactB) ? 100 : (matchB.isNameMatch ? 80 : (exactB ? 60 : 0));

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return diffA - diffB;
    });
  }, [osCandidates, search, transaction]);

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

  const txAmount = Math.abs(transaction.amount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Transação Bancária à Ordem de Serviço (OS)"
      size="2xl"
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
                R$ {txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Busca por OS */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar por Nº da OS, Nome do Cliente, Placa ou Forma de Pagamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg pl-10 pr-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* Lista de Candidatas da Loja */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner text="Carregando OSs da filial..." />
            </div>
          ) : sortedAndDeduplicatedCandidates.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)] text-xs">
              <AlertCircle size={24} className="mx-auto mb-2 opacity-30" />
              Nenhuma Ordem de Serviço pendente com PIX encontrada para esta filial.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3 text-left">OS #</th>
                  <th className="py-2.5 px-3 text-left">Cliente / Placa</th>
                  <th className="py-2.5 px-3 text-left">Pagamento Declarado</th>
                  <th className="py-2.5 px-3 text-right">Valor PIX / Saldo</th>
                  <th className="py-2.5 px-3 text-center">Diferença / Match</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedAndDeduplicatedCandidates.map((os) => {
                  const osVal = os.pix_transfer_value > 0 ? os.pix_transfer_value : Math.max(0, os.total_value - os.paid_value);
                  const diff = Math.abs(osVal - txAmount);
                  const isExact = diff < 0.05;
                  const nameMatch = checkNameMatch(transaction.counterpart_name, transaction.title, os.client_name);

                  const isHighPriority = (nameMatch.isNameMatch && isExact) || nameMatch.isNameMatch;

                  return (
                    <tr
                      key={os.os_number}
                      className={`transition-colors ${
                        isHighPriority
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-emerald-400'
                          : isExact
                          ? 'bg-blue-500/10 hover:bg-blue-500/15 border-l-2 border-blue-400'
                          : 'hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      {/* OS # */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary)]">
                        <div className="flex items-center gap-1.5">
                          <FileText size={13} className="shrink-0 text-[var(--color-primary)]" />
                          <span>OS #{os.os_number}</span>
                        </div>
                      </td>

                      {/* Cliente / Placa */}
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        <div className="flex flex-col">
                          <span className={`font-semibold truncate max-w-[200px] ${nameMatch.isNameMatch ? 'text-emerald-300' : 'text-[var(--text-primary)]'}`}>
                            {os.client_name || 'Cliente'}
                          </span>
                          {os.plate && (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                              Placa: {os.plate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pagamento Declarado */}
                      <td className="py-2.5 px-3 text-[var(--text-tertiary)] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[10px]">
                          {os.payment_method || 'PIX'}
                        </span>
                      </td>

                      {/* Valor OS */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {osVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Diferença / Match */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {nameMatch.isNameMatch && isExact ? (
                          <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                            <Sparkles size={10} className="mr-1 text-emerald-400" /> Match Nome + Valor
                          </Badge>
                        ) : nameMatch.isNameMatch ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                            <Sparkles size={10} className="mr-1 text-emerald-400" /> Match por Nome
                          </Badge>
                        ) : isExact ? (
                          <Badge variant="success" className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold">
                            <CheckCircle2 size={10} className="mr-1" /> Match por Valor
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-medium">
                            ± R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Botão Vincular */}
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant={isHighPriority || isExact ? 'primary' : 'teal'}
                          disabled={linking}
                          onClick={() => handleLink(os)}
                          className={`h-7 px-3 text-xs font-semibold gap-1 shrink-0 ${
                            isHighPriority
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 font-bold'
                              : isExact
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                              : 'border-[var(--color-primary)]/40 text-[var(--text-primary)] hover:bg-[var(--color-primary)]/10'
                          }`}
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

        {/* Nota explicativa contábil */}
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
