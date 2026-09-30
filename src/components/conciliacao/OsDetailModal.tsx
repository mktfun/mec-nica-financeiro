import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileText, User, Calendar, CreditCard, QrCode, Banknote, CheckCircle2, ShieldCheck, Check, RotateCcw, DollarSign } from 'lucide-react';
import { useUpdateOsStatus } from '@/hooks/useConciliacao';
import { parsePaymentBreakdown } from '@/lib/osPaymentUtils';
import { OsPaymentLaunchModal } from './OsPaymentLaunchModal';

export interface OsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  osData: {
    id?: string;
    os_number: string;
    store_id?: string;
    target_date?: string;
    client_name?: string;
    vehicle?: string;
    entry_date?: string;
    total_value?: number;
    paid_value?: number;
    payment_method?: string;
    credit_value?: number;
    debit_value?: number;
    pix_transfer_value?: number;
    cash_value?: number;
    parsed_credit_debit?: number;
    parsed_pix_transfer?: number;
    status?: string;
  } | null;
  os?: any;
  storeId?: string;
}

export function OsDetailModal({ isOpen, onClose, osData: propOsData, ...props }: OsDetailModalProps) {
  const updateOsStatus = useUpdateOsStatus();
  const osData = propOsData || props.os;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  if (!osData) return null;

  const isEntrou = osData.status === 'ENTROU';

  const handleToggleEntrou = () => {
    if (!osData.id) return;
    const newStatus = isEntrou ? 'finalizado' : 'ENTROU';
    updateOsStatus.mutate({
      osId: osData.id,
      osNumber: osData.os_number,
      storeId: osData.store_id || '',
      targetDate: osData.target_date || new Date().toISOString().split('T')[0],
      newStatus
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const breakdown = parsePaymentBreakdown(osData);
  const sumBreakdown = breakdown.reduce((acc, b) => acc + b.value, 0);

  const rawTotal = Number(osData.total_value || 0);
  const rawPaid = Number(osData.paid_value || 0);

  const totalValue = Math.max(rawTotal, rawPaid, sumBreakdown);
  const paidValue = rawPaid > 0 
    ? rawPaid 
    : (isEntrou || osData.status === 'finalizado' ? totalValue : (sumBreakdown > 0 ? sumBreakdown : 0));
  const openValue = Math.max(0, totalValue - paidValue);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ordem de Serviço #${osData.os_number}`} size="xl">
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
                {isEntrou ? (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 size={12} className="mr-1" /> ENTROU (Manual/Baixado)
                  </Badge>
                ) : (
                  <Badge variant="brand" className="text-xs">
                    <ShieldCheck size={12} className="mr-1" /> No Sistema
                  </Badge>
                )}
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
              R$ {paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

        </div>

        {/* Quebra de Formas de Pagamento */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Formas de Pagamento Declaradas</h4>

          <div className="space-y-2 font-mono text-xs">
            {breakdown.length === 0 ? (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-center text-xs text-[var(--text-tertiary)] italic">
                Nenhum pagamento registrado nesta Ordem de Serviço.
              </div>
            ) : (
              breakdown.map((item, i) => {
                let Icon = CreditCard;
                let badgeVariant: 'success' | 'brand' | 'warning' | 'neutral' = 'success';
                let iconColor = 'text-[var(--color-primary)]';
                let statusLabel = 'Registrado';

                if (item.category === 'credito') {
                  Icon = CreditCard;
                  badgeVariant = 'success';
                  iconColor = 'text-blue-400';
                  statusLabel = 'Pareado com Rede';
                } else if (item.category === 'debito') {
                  Icon = CreditCard;
                  badgeVariant = 'brand';
                  iconColor = 'text-cyan-400';
                  statusLabel = 'Cartão Débito';
                } else if (item.category === 'pix') {
                  Icon = QrCode;
                  badgeVariant = 'brand';
                  iconColor = 'text-[var(--color-accent-light-blue)]';
                  statusLabel = 'Pareado com OFX';
                } else if (item.category === 'dinheiro') {
                  Icon = Banknote;
                  badgeVariant = 'warning';
                  iconColor = 'text-[var(--color-accent-warning)]';
                  statusLabel = 'Cofre da Filial';
                } else if (item.category === 'boleto') {
                  Icon = FileText;
                  badgeVariant = 'neutral';
                  iconColor = 'text-purple-400';
                  statusLabel = 'A Receber';
                }

                return (
                  <div key={i} className="p-3 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      <Icon size={16} className={iconColor} />
                      <span>{item.method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--text-primary)]">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant={badgeVariant} className="text-[10px]">
                        <CheckCircle2 size={10} className="mr-1" /> {statusLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {osData.payment_method && (
          <div className="p-3 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">String Bruta de Pagamento:</span>
            <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-1">{osData.payment_method}</p>
          </div>
        )}

        {/* Ações da OS */}
        {osData.id && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <Button
              variant="teal"
              onClick={() => setIsPaymentModalOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <DollarSign size={14} />
              Lançar / Editar Pagamento
            </Button>

            <Button
              variant={isEntrou ? "outline" : "secondary"}
              onClick={handleToggleEntrou}
              disabled={updateOsStatus.isPending}
              className="gap-2 text-xs font-bold"
            >
              {isEntrou ? (
                <>
                  <RotateCcw size={14} />
                  Reverter para Pendente
                </>
              ) : (
                <>
                  <Check size={14} />
                  Marcar como ENTROU (Baixa Manual)
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {isPaymentModalOpen && (
        <OsPaymentLaunchModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          os={osData}
          targetDate={osData.target_date}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
