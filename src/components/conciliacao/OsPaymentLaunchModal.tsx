import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CreditCard, 
  QrCode, 
  Banknote, 
  FileText, 
  Trash2, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Car,
  User,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  OsPaymentEntry, 
  OsPaymentCategory, 
  extractEntriesFromOs, 
  saveOsPayments 
} from '@/lib/osPaymentPersistence';

export interface OsPaymentLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  os: {
    id: string;
    os_number: string;
    store_id?: string;
    store_name?: string;
    client_name?: string;
    plate?: string;
    total_value?: number;
    paid_value?: number;
    payment_method?: string;
    credit_value?: number;
    debit_value?: number;
    pix_transfer_value?: number;
    cash_value?: number;
    status?: string;
  } | null;
  targetDate?: string;
  onSuccess?: () => void;
}

const CATEGORY_CONFIG: Record<OsPaymentCategory, { label: string; icon: typeof CreditCard; colorClass: string; badgeVariant: 'success' | 'brand' | 'warning' | 'neutral' }> = {
  credito: {
    label: 'Cartão Crédito',
    icon: CreditCard,
    colorClass: 'text-blue-400',
    badgeVariant: 'success'
  },
  debito: {
    label: 'Cartão Débito',
    icon: CreditCard,
    colorClass: 'text-cyan-400',
    badgeVariant: 'brand'
  },
  pix: {
    label: 'PIX',
    icon: QrCode,
    colorClass: 'text-emerald-400',
    badgeVariant: 'success'
  },
  dinheiro: {
    label: 'Dinheiro',
    icon: Banknote,
    colorClass: 'text-amber-400',
    badgeVariant: 'warning'
  },
  transferencia: {
    label: 'Transferência',
    icon: QrCode,
    colorClass: 'text-indigo-400',
    badgeVariant: 'brand'
  },
  boleto: {
    label: 'Boleto / A Receber',
    icon: FileText,
    colorClass: 'text-purple-400',
    badgeVariant: 'neutral'
  },
  outro: {
    label: 'Outros',
    icon: FileText,
    colorClass: 'text-zinc-400',
    badgeVariant: 'neutral'
  }
};

export const OsPaymentLaunchModal: React.FC<OsPaymentLaunchModalProps> = ({
  isOpen,
  onClose,
  os,
  targetDate,
  onSuccess
}) => {
  const queryClient = useQueryClient();

  const [totalValue, setTotalValue] = useState<number>(0);
  const [entries, setEntries] = useState<OsPaymentEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<OsPaymentCategory>('credito');
  const [newAmount, setNewAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializa o formulário com dados da OS ao abrir
  useEffect(() => {
    if (isOpen && os) {
      const initialTotal = Math.max(0, Number(os.total_value || 0));
      setTotalValue(initialTotal);

      const extracted = extractEntriesFromOs(os);
      setEntries(extracted);
      setSelectedCategory('credito');
      setNewAmount('');
    }
  }, [isOpen, os]);

  // Cálculos dinâmicos
  const totalPaid = useMemo(() => {
    const sum = entries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    return Number(sum.toFixed(2));
  }, [entries]);

  const openBalance = useMemo(() => {
    return Math.max(0, Number((totalValue - totalPaid).toFixed(2)));
  }, [totalValue, totalPaid]);

  const isExceeded = totalPaid > totalValue + 0.05 && totalValue > 0;

  const projectedStatus = useMemo(() => {
    if (totalPaid >= totalValue - 0.05 && totalValue > 0) return 'finalizado';
    if (totalPaid > 0) return 'pago_parcial';
    return 'em_aberto';
  }, [totalPaid, totalValue]);

  if (!isOpen || !os) return null;

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor de pagamento maior que zero.');
      return;
    }

    const newEntry: OsPaymentEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: selectedCategory,
      label: CATEGORY_CONFIG[selectedCategory].label,
      value: Number(val.toFixed(2))
    };

    setEntries(prev => [...prev, newEntry]);
    setNewAmount('');
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleFillRemaining = () => {
    if (openBalance > 0) {
      setNewAmount(openBalance.toFixed(2));
    }
  };

  const handleSyncTotalToPaid = () => {
    setTotalValue(totalPaid);
  };

  const handleClearAllPayments = () => {
    setEntries([]);
  };

  const handleSave = async () => {
    if (!os.id) {
      toast.error('Identificador da OS inválido.');
      return;
    }

    if (totalValue <= 0) {
      toast.error('O valor total da OS deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveOsPayments({
        osId: os.id,
        totalValue,
        entries,
        targetDate
      });

      if (!res.success) {
        throw new Error(res.error || 'Erro ao persistir pagamentos.');
      }

      toast.success(`Pagamentos da OS #${os.os_number} salvos com sucesso!`);
      
      // Invalidação abrangente para atualizar tabelas de conciliação, pátio e relatórios
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patio-os'] }),
        queryClient.invalidateQueries({ queryKey: ['patio_os'] }),
        queryClient.invalidateQueries({ queryKey: ['patio-os-list'] }),
        queryClient.invalidateQueries({ queryKey: ['patio-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['store-os-list'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_reconciliation_summary'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['daily_snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
        queryClient.invalidateQueries({ queryKey: ['backend-conciliacao'] })
      ]);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      toast.error(`Falha ao salvar pagamentos: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lançar / Editar Pagamentos — OS #${os.os_number}`}
      size="lg"
    >
      <div className="space-y-5 text-zinc-100 p-1">
        {/* Header Resumo da OS */}
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold font-mono">
              #{os.os_number}
            </div>
            <div>
              <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                {os.client_name ? (
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-[var(--text-tertiary)]" />
                    {os.client_name}
                  </span>
                ) : (
                  <span>Cliente Manual</span>
                )}
                {os.plate && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] font-mono text-[10px]">
                    {os.plate}
                  </span>
                )}
              </div>
              {os.store_name && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                  <Building2 size={11} className="text-[var(--text-tertiary)]" />
                  {os.store_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-secondary)]">Status Atual:</span>
            <Badge variant="neutral" className="text-[10px] uppercase font-mono">
              {(os.status || 'em_aberto').replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Campo do Valor Total da OS */}
        <div className="p-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Valor Total da OS
            </label>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Altere se o total faturado precisar de retificação
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-[var(--text-tertiary)]">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={totalValue || ''}
              onChange={(e) => setTotalValue(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg font-mono font-bold text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Pagamentos Lançados */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <span>Pagamentos Lançados</span>
              <span className="text-[10px] font-normal text-[var(--text-tertiary)]">
                ({entries.length} {entries.length === 1 ? 'item' : 'itens'})
              </span>
            </h4>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllPayments}
                className="text-[11px] text-[var(--color-accent-danger)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={11} />
                Zerar Todos
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {entries.length === 0 ? (
              <div className="p-4 bg-[var(--bg-surface)] border border-dashed border-[var(--border-subtle)] rounded-xl text-center text-xs text-[var(--text-tertiary)] italic">
                Nenhum pagamento lançado ainda. Selecione uma forma abaixo para registrar.
              </div>
            ) : (
              entries.map((entry) => {
                const cfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.outro;
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-[var(--bg-surface-elevated)] ${cfg.colorClass}`}>
                        <IconComponent size={14} />
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
                        R$ {Number(entry.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/10 transition-colors cursor-pointer"
                        title="Remover este lançamento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Adicionar Novo Pagamento */}
        <form onSubmit={handleAddPayment} className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
            Adicionar Pagamento
          </label>

          {/* Seletor de Categoria */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {(Object.keys(CATEGORY_CONFIG) as OsPaymentCategory[])
              .filter(cat => cat !== 'outro')
              .map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                const isSelected = selectedCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                        : 'bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Icon size={14} className={`mb-1 ${isSelected ? 'text-[var(--color-primary)]' : cfg.colorClass}`} />
                    {cfg.label.replace('Cartão ', '')}
                  </button>
                );
              })}
          </div>

          {/* Input de Valor & Botão Rápido */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--text-tertiary)]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-lg font-mono font-bold text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {openBalance > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillRemaining}
                className="text-xs h-9 gap-1 text-[var(--color-primary)] border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10"
              >
                <Sparkles size={12} />
                Restante: R$ {openBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Button>
            )}

            <Button
              type="submit"
              variant="teal"
              size="sm"
              className="text-xs h-9 gap-1 font-bold"
            >
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
        </form>

        {/* Resumo Financeiro em Tempo Real */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-center">
          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
              Total da OS
            </span>
            <span className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5 block">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
              Total Pago
            </span>
            <span className="text-base font-bold font-mono text-[var(--color-primary-bright)] mt-0.5 block">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] block">
              Saldo em Aberto
            </span>
            <span className={`text-base font-bold font-mono mt-0.5 block ${
              openBalance > 0 ? 'text-[var(--color-accent-warning)]' : 'text-[var(--color-success)]'
            }`}>
              R$ {openBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Alerta de Excesso de Pagamento */}
        {isExceeded && (
          <div className="p-3 bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/30 rounded-xl flex items-center justify-between text-xs text-[var(--color-accent-warning)]">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>O total pago (R$ {totalPaid.toFixed(2)}) é maior que o total da OS (R$ {totalValue.toFixed(2)}).</span>
            </div>
            <button
              type="button"
              onClick={handleSyncTotalToPaid}
              className="px-2 py-1 rounded bg-[var(--color-accent-warning)]/20 hover:bg-[var(--color-accent-warning)]/30 font-semibold cursor-pointer whitespace-nowrap ml-2"
            >
              Ajustar Total
            </button>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>Status Resultante:</span>
            <Badge
              variant={
                projectedStatus === 'finalizado' ? 'success' :
                projectedStatus === 'pago_parcial' ? 'warning' : 'danger'
              }
              className="text-[10px] uppercase font-mono"
            >
              {projectedStatus.replace('_', ' ')}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="teal"
              onClick={handleSave}
              disabled={isSubmitting || totalValue <= 0}
              className="text-xs font-bold gap-1.5"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Salvar Pagamentos
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
