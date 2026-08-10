import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRawOs, useRawRede, useRawOfx } from '@/hooks/useRawImportData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Landmark, CreditCard, ShoppingBag, Loader2 } from 'lucide-react';

interface ExtratosImportacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  targetDate: string;
}

type Tab = 'ofx' | 'rede' | 'os';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso.substring(0, 16);
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

const Td = ({ children, className = '', right = false }: { children: React.ReactNode, className?: string, right?: boolean }) => (
  <td className={`px-2 py-1.5 border border-[var(--border-subtle)] whitespace-nowrap ${right ? 'text-right tabular-nums' : ''} ${className}`}>
    {children}
  </td>
);

const Th = ({ children, right = false }: { children: React.ReactNode, right?: boolean }) => (
  <th className={`px-2 py-1.5 border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] font-semibold text-[var(--text-secondary)] whitespace-nowrap sticky top-0 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

export function ExtratosImportacaoModal({ isOpen, onClose, storeId, storeName, targetDate }: ExtratosImportacaoModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ofx');

  const { data: osData, isLoading: loadingOs } = useRawOs(storeId, targetDate, isOpen && activeTab === 'os');
  const { data: redeData, isLoading: loadingRede } = useRawRede(storeId, targetDate, isOpen && activeTab === 'rede');
  const { data: ofxResp, isLoading: loadingOfx } = useRawOfx(storeId, targetDate, isOpen && activeTab === 'ofx');

  const dateLabel = format(new Date(targetDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });

  const renderLoader = () => (
    <div className="flex justify-center items-center py-20 text-[var(--text-tertiary)]">
      <Loader2 size={24} className="animate-spin" />
    </div>
  );

  const renderOfx = () => {
    if (loadingOfx) return renderLoader();
    const txs = ofxResp?.transactions || [];
    if (!txs.length) return <div className="p-4 text-sm text-[var(--text-tertiary)]">Nenhum registro bancário OFX importado para esta data.</div>;

    return (
      <div className="overflow-x-auto border border-[var(--border-subtle)]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr>
              <Th>Data/Hora</Th>
              <Th>Descrição (Memo)</Th>
              <Th>ID / FITID</Th>
              <Th>Tipo</Th>
              <Th right>Valor (R$)</Th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => {
              const isCredit = tx.amount >= 0;
              return (
                <tr key={tx.id} className="even:bg-[var(--bg-canvas)] odd:bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)]">
                  <Td>{formatDateTime(tx.occurred_at)}</Td>
                  <Td className="max-w-[250px] truncate" title={tx.description}>{tx.description}</Td>
                  <Td className="font-mono text-[10px] text-[var(--text-tertiary)]">{tx.fitid || '—'}</Td>
                  <Td>{tx.type}</Td>
                  <Td right className={`font-medium ${isCredit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(tx.amount)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRede = () => {
    if (loadingRede) return renderLoader();
    if (!redeData?.length) return <div className="p-4 text-sm text-[var(--text-tertiary)]">Nenhum registro de maquininha para esta data.</div>;

    return (
      <div className="overflow-x-auto border border-[var(--border-subtle)]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr>
              <Th>Data/Hora</Th>
              <Th>NSU</Th>
              <Th>Bandeira/Maq.</Th>
              <Th>Pgto.</Th>
              <Th right>Bruto (R$)</Th>
              <Th right>Taxa (R$)</Th>
              <Th right>Líquido (R$)</Th>
            </tr>
          </thead>
          <tbody>
            {redeData.map((tx) => (
              <tr key={tx.id} className="even:bg-[var(--bg-canvas)] odd:bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)]">
                <Td>{formatDateTime(tx.occurred_at)}</Td>
                <Td className="font-mono">{tx.id}</Td>
                <Td>{tx.machine_name || '—'}</Td>
                <Td>{tx.payment_method || '—'}</Td>
                <Td right className="text-[var(--text-secondary)]">{formatCurrency(tx.gross_amount)}</Td>
                <Td right className="text-amber-500 text-[10px]">
                  -{formatCurrency(tx.fee_amount)} ({tx.fee_percentage}%)
                </Td>
                <Td right className="font-medium text-[var(--color-accent-teal)]">{formatCurrency(tx.net_amount)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOs = () => {
    if (loadingOs) return renderLoader();
    if (!osData?.length) return <div className="p-4 text-sm text-[var(--text-tertiary)]">Nenhuma O.S. extraída para esta data.</div>;

    return (
      <div className="overflow-x-auto border border-[var(--border-subtle)]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr>
              <Th>Data Fechamento</Th>
              <Th>O.S.</Th>
              <Th>Status</Th>
              <Th>Pgto (Principal)</Th>
              <Th right>Total O.S.</Th>
              <Th right>Pago (Fechado)</Th>
              <Th right>Restante</Th>
            </tr>
          </thead>
          <tbody>
            {osData.map((os) => {
              const isPendente = os.remaining_value > 0;
              return (
                <tr key={os.os_number} className="even:bg-[var(--bg-canvas)] odd:bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-hover)]">
                  <Td>{formatDateTime(os.closed_at || os.opened_at)}</Td>
                  <Td className="font-mono font-bold text-[var(--color-accent-light-blue)]">{os.os_number}</Td>
                  <Td>{os.status}</Td>
                  <Td>{os.payment_method || '—'}</Td>
                  <Td right className="text-[var(--text-tertiary)]">{formatCurrency(os.total_value)}</Td>
                  <Td right className="font-medium text-[var(--text-primary)]">{formatCurrency(os.paid_value)}</Td>
                  <Td right className={isPendente ? 'text-[var(--color-accent-warning)] font-bold' : 'text-emerald-500'}>
                    {formatCurrency(os.remaining_value)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📊 Extratos Originais — ${storeName} (${dateLabel})`}
      size="xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('ofx')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ofx' ? 'border-[var(--color-accent-light-blue)] text-[var(--color-accent-light-blue)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Landmark size={16} /> Banco OFX
          </button>
          
          <button
            onClick={() => setActiveTab('rede')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rede' ? 'border-amber-400 text-amber-400' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <CreditCard size={16} /> Maquininha (Rede)
          </button>
          
          <button
            onClick={() => setActiveTab('os')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'os' ? 'border-[var(--color-accent-warning)] text-[var(--color-accent-warning)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <ShoppingBag size={16} /> Pátio OS
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
          {activeTab === 'ofx' && renderOfx()}
          {activeTab === 'rede' && renderRede()}
          {activeTab === 'os' && renderOs()}
        </div>
      </div>
    </Modal>
  );
}
