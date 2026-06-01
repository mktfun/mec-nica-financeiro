import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  FileSpreadsheet, ChevronDown, ChevronUp, Building2,
  Calendar, Package, DollarSign, Banknote, Filter
} from 'lucide-react';
import { useImportLogs, useImportLogDetail, ImportLogFilters } from '@/hooks/useImportLogs';
import { useStores } from '@/hooks/useStores';

export const Route = createFileRoute('/historico')({
  component: HistoricoPage,
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function ImportLogDetail({ storeId, targetDate }: { storeId: string; targetDate: string }) {
  const { data: os = [], isLoading } = useImportLogDetail(storeId, targetDate);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <svg className="animate-spin w-5 h-5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!os.length) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
        Nenhuma OS finalizada encontrada para este período.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
            <th className="text-left pb-2 pr-4">OS</th>
            <th className="text-left pb-2 pr-4">Placa</th>
            <th className="text-right pb-2 pr-4">Total OS</th>
            <th className="text-right pb-2 pr-4">Pago</th>
            <th className="text-left pb-2">Pagamento</th>
          </tr>
        </thead>
        <tbody>
          {os.map((o: any) => (
            <tr key={o.id} className="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td className="py-2 pr-4 font-mono font-medium">{o.os_number}</td>
              <td className="py-2 pr-4 text-[var(--text-secondary)]">{o.plate || '—'}</td>
              <td className="py-2 pr-4 text-right">
                <AnimatedNumber value={Number(o.total_value || 0)} format="currency" />
              </td>
              <td className="py-2 pr-4 text-right text-[var(--color-accent-teal)]">
                <AnimatedNumber value={Number(o.paid_value || 0)} format="currency" />
              </td>
              <td className="py-2 text-[var(--text-tertiary)] text-xs">
                {o.payment_method || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoricoPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ImportLogFilters>({});
  const [storeFilter, setStoreFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: stores = [] } = useStores();
  const { data: logs = [], isLoading } = useImportLogs(
    storeFilter ? { storeId: storeFilter } : {}
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl flex items-center gap-3">
              <FileSpreadsheet size={28} className="text-[var(--color-primary)]" />
              Histórico de Importações
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Registro de todas as planilhas importadas por loja e data.
            </p>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)] transition-colors"
          >
            <Filter size={14} />
            Filtros
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Loja</label>
                  <select
                    value={storeFilter}
                    onChange={e => setStoreFilter(e.target.value)}
                    className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  >
                    <option value="">Todas as lojas</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {storeFilter && (
                  <button
                    onClick={() => setStoreFilter('')}
                    className="text-xs text-[var(--color-accent-danger)] hover:underline"
                  >
                    Limpar filtro
                  </button>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center p-12">
            <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <Card className="text-center py-16">
            <FileSpreadsheet size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
            <p className="text-[var(--text-tertiary)] font-medium">Nenhuma importação registrada.</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1 opacity-70">
              Importe a planilha de uma loja pelo Dashboard para começar.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => {
              const isExpanded = expandedId === log.id;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="overflow-hidden">
                    {/* Header Row */}
                    <div
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                          <FileSpreadsheet size={18} className="text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[var(--text-primary)] truncate">
                              {log.store_name}
                            </h3>
                            <Badge variant="neutral" className="shrink-0">
                              {formatDate(log.target_date)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)] flex-wrap">
                            <span className="flex items-center gap-1">
                              <Package size={11} />
                              {log.os_count} OSs
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign size={11} />
                              Fat.: <AnimatedNumber value={Number(log.total_os || 0)} format="currency" />
                            </span>
                            {Number(log.total_dinheiro) > 0 && (
                              <span className="flex items-center gap-1 text-[var(--color-accent-teal)]">
                                <Banknote size={11} />
                                Dinheiro: <AnimatedNumber value={Number(log.total_dinheiro || 0)} format="currency" />
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[var(--text-tertiary)]/60">
                              <Calendar size={11} />
                              {timeAgo(log.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <span className="text-xs text-[var(--text-tertiary)] hidden sm:block">
                          {isExpanded ? 'Fechar OSs' : 'Ver OSs'}
                        </span>
                        {isExpanded
                          ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
                          : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
                        }
                      </div>
                    </div>

                    {/* Expanded OS detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-[var(--border-subtle)] mt-4 pt-4"
                        >
                          <ImportLogDetail storeId={log.store_id} targetDate={log.target_date} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
