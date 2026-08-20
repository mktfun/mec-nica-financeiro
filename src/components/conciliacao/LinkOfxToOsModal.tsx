import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Link2, Landmark, CheckCircle2, AlertCircle, Banknote, Clock } from 'lucide-react';
import { useManualMatch } from '@/hooks/useManualMatch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

interface LinkOfxToOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  osData: {
    id?: string;
    os_number: string;
    client_name?: string;
    plate?: string;
    amount: number;
    store_id: string;
    target_date: string;
  } | null;
}

export function LinkOfxToOsModal({
  isOpen,
  onClose,
  osData,
}: LinkOfxToOsModalProps) {
  const [search, setSearch] = useState('');
  const { linkTransactionToOs, loading: linking } = useManualMatch();

  // Busca lançamentos bancários de entrada daquela filial (atemporal / pool da loja)
  const { data: bankTransactions = [], isLoading } = useQuery({
    queryKey: ['unlinked_bank_transactions', osData?.store_id, osData?.target_date],
    queryFn: async () => {
      if (!osData?.store_id) return [];

      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('store_id', osData.store_id)
        .eq('source', 'ofx')
        .eq('type', 'in')
        .is('os_number', null);

      if (error) {
        console.warn('Erro ao carregar transações bancárias:', error);
        return [];
      }

      return (txs || []).map((t: any) => ({
        id: t.id,
        title: t.title || t.subtitle || 'Depósito Bancário / PIX',
        counterpart_name: t.counterpart_name || t.cnpj_cpf || '',
        amount: Math.abs(Number(t.amount || 0)),
        occurred_at: t.occurred_at || t.target_date,
        target_date: t.target_date,
        os_number: t.os_number,
        match_status: t.match_status,
      }));
    },
    enabled: isOpen && !!osData?.store_id,
  });

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return bankTransactions;
    const q = search.toLowerCase().trim();
    return bankTransactions.filter(
      (tx) =>
        tx.title.toLowerCase().includes(q) ||
        tx.counterpart_name.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
    );
  }, [bankTransactions, search]);

  if (!osData) return null;

  const handleLink = async (tx: any) => {
    try {
      const res = await linkTransactionToOs(tx.id, osData.os_number, osData.store_id);
      if (res.success) {
        toast.success(`PIX de R$ ${tx.amount.toFixed(2)} vinculado com sucesso à OS #${osData.os_number}!`);
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
      title={`Vincular Extrato Bancário à OS #${osData.os_number}`}
      size="2xl"
    >
      <div className="space-y-5">
        {/* Detalhes da OS Selecionada */}
        <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Ordem de Serviço (Aguardando PIX no Banco)
            </span>
            <Badge variant="outline" className="text-xs font-mono text-[var(--color-primary)]">
              OS #{osData.os_number}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                Cliente: {osData.client_name || 'Cliente'} {osData.plate ? `(${osData.plate})` : ''}
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                Data do Atendimento: {osData.target_date.split('-').reverse().join('/')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--text-tertiary)] block uppercase">Valor Declarado (PIX)</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                R$ {osData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Busca por Lançamentos do Banco */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar por descrição do extrato, nome do pagador ou valor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] font-sans"
          />
        </div>

        {/* Tabela de Lançamentos Bancários */}
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner text="Carregando lançamentos do extrato..." />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)] text-xs">
              <AlertCircle size={24} className="mx-auto mb-2 opacity-30" />
              Nenhum lançamento bancário disponível para vincular nesta data.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3 text-left">Lançamento Extrato (Itaú)</th>
                  <th className="py-2.5 px-3 text-left">Contraparte / Pagador</th>
                  <th className="py-2.5 px-3 text-right">Valor Depositado</th>
                  <th className="py-2.5 px-3 text-center">Diferença</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredTransactions.map((tx) => {
                  const diff = Math.abs(tx.amount - osData.amount);
                  const isExact = diff < 0.05;
                  const isAlreadyLinked = tx.os_number && String(tx.os_number) !== String(osData.os_number);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${
                        isExact ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-1.5">
                          <Landmark size={13} className="text-[var(--color-primary)] shrink-0" />
                          <span className="font-mono truncate max-w-[180px]">{tx.title}</span>
                          {tx.target_date && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-tertiary)] shrink-0">
                              {tx.target_date.split('-').reverse().slice(0, 2).join('/')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        {tx.counterpart_name || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          onClick={() => handleLink(tx)}
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

        {/* Nota explicativa */}
        <div className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
          <Banknote size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Ao vincular, o status da OS mudará para <strong>Entrou no Banco</strong> e o lançamento será confirmado sem duplicar o faturamento.
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
