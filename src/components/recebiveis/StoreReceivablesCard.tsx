import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { StoreReceivablesGroup, ReceivableItem, useMarkReceived, useDeleteReceivable } from '@/hooks/useRecebiveis';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface StoreReceivablesCardProps {
  group: StoreReceivablesGroup;
  targetDate: string;
  onAddClick: (storeId: string) => void;
  onEditClick: (item: ReceivableItem) => void;
}

export function StoreReceivablesCard({ group, targetDate, onAddClick, onEditClick }: StoreReceivablesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const markReceived = useMarkReceived();
  const deleteReceivable = useDeleteReceivable();

  const handleQuickReceive = async (item: ReceivableItem) => {
    try {
      await markReceived.mutateAsync({
        id: item.id,
        paidValue: item.value
      });
      toast.success(`Título de ${formatCurrency(item.value)} marcado como recebido!`);
    } catch (err: any) {
      toast.error('Erro ao baixar título: ' + (err.message || err));
    }
  };

  const handleDelete = async (item: ReceivableItem) => {
    if (!window.confirm(`Deseja realmente excluir "${item.description}"?`)) return;
    try {
      await deleteReceivable.mutateAsync(item.id);
      toast.success('Título excluído com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || err));
    }
  };

  const hasItems = group.items.length > 0;

  return (
    <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden transition-all duration-200 hover:border-zinc-700/80">
      {/* Header da Loja */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r from-zinc-900/60 to-transparent border-b border-[var(--border-subtle)]/50"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            hasItems && group.totalPending > 0
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50'
          }`}>
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
              {group.storeName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--text-tertiary)] font-mono">
                {group.items.filter(i => i.status === 'pendente').length} pendente(s)
              </span>
              {group.totalOverdue > 0 && (
                <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-bold">
                  {formatCurrency(group.totalOverdue)} Vencido
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[var(--text-secondary)] font-medium">A Receber</div>
            <div className={`font-mono font-bold text-base sm:text-lg ${
              group.totalPending > 0 ? 'text-amber-400' : 'text-zinc-400'
            }`}>
              {formatCurrency(group.totalPending)}
            </div>
          </div>

          <div className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-3">
          {!hasItems ? (
            <div className="text-center py-6 text-xs text-[var(--text-tertiary)] bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
              Nenhum recebível registrado para esta filial nesta data.
              <div className="mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick(group.storeId);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Título
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {group.items.map((item) => {
                const isOverdue = item.temporal_status === 'vencido';
                const isDueToday = item.temporal_status === 'vence_hoje';
                const isReceived = item.status === 'recebido';

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isReceived 
                        ? 'bg-emerald-950/10 border-emerald-900/30 opacity-75'
                        : isOverdue
                        ? 'bg-rose-950/10 border-rose-900/40'
                        : isDueToday
                        ? 'bg-amber-950/15 border-amber-500/30 ring-1 ring-amber-500/20'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Descrição e Metadados */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {item.description}
                        </span>
                        
                        {item.os_number && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            OS #{item.os_number}
                          </span>
                        )}

                        {item.installment && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400">
                            {item.installment}
                          </span>
                        )}

                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/40 text-zinc-400">
                          {item.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          Venc: {item.due_date.split('-').reverse().join('/')}
                        </span>

                        {isReceived ? (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Liquidado
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="danger" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Vencido
                          </Badge>
                        ) : isDueToday ? (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3" /> Vence Hoje
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                            A Vencer
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Valor e Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                      <div className="font-mono font-bold text-base text-[var(--text-primary)]">
                        {formatCurrency(item.value)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isReceived && (
                          <button
                            type="button"
                            onClick={() => handleQuickReceive(item)}
                            disabled={markReceived.isPending}
                            title="Marcar como Recebido (Baixar)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Baixar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditClick(item)}
                          title="Editar Título"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deleteReceivable.isPending}
                          title="Excluir Título"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onAddClick(group.storeId)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Título em {group.storeName}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
