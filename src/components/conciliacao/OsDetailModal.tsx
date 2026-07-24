import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { FileText, User, Calendar, CreditCard, QrCode, Banknote, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface OsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  osData: {
    os_number: string;
    client_name?: string;
    vehicle?: string;
    entry_date?: string;
    total_value?: number;
    paid_value?: number;
    payment_method?: string;
    parsed_credit_debit?: number;
    parsed_pix_transfer?: number;
    status?: string;
  } | null;
}

export function OsDetailModal({ isOpen, onClose, osData }: OsDetailModalProps) {
  if (!osData) return null;

  const totalValue = osData.paid_value !== undefined && osData.paid_value !== null
    ? osData.paid_value
    : (osData.total_value || 0);
  const creditValue = osData.parsed_credit_debit || 0;
  const pixValue = osData.parsed_pix_transfer || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ordem de Serviço #${osData.os_number}`}>
      <div className="space-y-6 pt-2">
        {/* Header da OS */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">OS #{osData.os_number}</h3>
                <Badge variant="success" className="text-xs">
                  <ShieldCheck size={12} className="mr-1" /> No Sistema
                </Badge>
              </div>
              {osData.client_name && (
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                  <User size={13} className="text-[var(--text-tertiary)]" /> {osData.client_name}
                  {osData.vehicle && <span>• {osData.vehicle}</span>}
                </p>
              )}
            </div>
          </div>

          {osData.entry_date && (
            <div className="text-right font-mono text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar size={13} className="text-[var(--text-tertiary)]" />
              {osData.entry_date}
            </div>
          )}
        </div>

        {/* Resumo de Valores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Valor Total da OS</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1 font-mono">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">Valor Pago Registrado</span>
            <p className="text-xl font-bold text-[var(--color-accent-teal)] mt-1 font-mono">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Quebra de Formas de Pagamento */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Formas de Pagamento Declaradas</h4>

          <div className="space-y-2 font-mono text-xs">
            {creditValue > 0 && (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <CreditCard size={16} className="text-[var(--color-primary)]" />
                  <span>Cartão (Crédito / Débito)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--text-primary)]">R$ {creditValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <Badge variant="success" className="text-[10px]">
                    <CheckCircle2 size={10} className="mr-1" /> Pareado com Rede
                  </Badge>
                </div>
              </div>
            )}

            {pixValue > 0 && (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <QrCode size={16} className="text-[var(--color-accent-light-blue)]" />
                  <span>PIX / Transferência Direta</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--text-primary)]">R$ {pixValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <Badge variant="brand" className="text-[10px]">
                    <CheckCircle2 size={10} className="mr-1" /> Pareado com OFX
                  </Badge>
                </div>
              </div>
            )}

            {creditValue === 0 && pixValue === 0 && (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Banknote size={16} className="text-[var(--color-accent-warning)]" />
                  <span>{osData.payment_method || 'Outras Formas (Dinheiro / Cheque)'}</span>
                </div>
                <span className="font-bold text-[var(--text-primary)]">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {osData.payment_method && (
          <div className="p-3 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">String Bruta de Pagamento:</span>
            <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-1">{osData.payment_method}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
