import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FileSpreadsheet, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, UploadCloud, RefreshCw } from 'lucide-react';
import { useImportsHistory, useDeleteImport, useClearAllData, GroupedImportLog } from '@/hooks/useImportProcessor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CentralImportWizard } from '@/components/importacoes/CentralImportWizard';
import { Modal } from '@/components/ui/Modal';

export const Route = createFileRoute('/importacoes')({
  component: ImportacoesPage,
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ImportacoesPage() {
  const { data: imports = [], isLoading } = useImportsHistory();
  const deleteImport = useDeleteImport();
  const clearAllData = useClearAllData();
  
  const [showWizard, setShowWizard] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(imports.length / itemsPerPage);
  const paginatedImports = imports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleDelete = async (log: GroupedImportLog) => {
    try {
      if (confirmDeleteId === log.id) {
        await deleteImport.mutateAsync({
          storeId: log.store_id,
          targetDates: log.target_dates,
          logIds: log.raw_logs.map(r => r.id),
          rawLogs: log.raw_logs
        });
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(log.id);
      }
    } catch (err) {
      console.error('Failed to delete import log:', err);
      alert('Erro ao excluir importação: ' + ((err as any).message || JSON.stringify(err)));
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllData.mutateAsync();
      setShowClearAllModal(false);
    } catch (err: any) {
      alert('Erro ao zerar dados: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl flex items-center gap-3">
              <FileSpreadsheet size={28} className="text-[var(--color-primary)]" />
              Importações
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Histórico de planilhas importadas agrupadas por lote de envio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowClearAllModal(true)} 
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium px-3.5 py-2.5 rounded-lg flex items-center gap-2 transition-all"
              title="Apagar todos os dados do banco de dados"
            >
              <Trash2 size={16} />
              Limpar Todos os Dados
            </button>

            <button onClick={() => setShowWizard(true)} className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-[0_4px_15px_rgba(var(--color-primary-rgb),0.3)] transition-all transform hover:scale-105">
              <UploadCloud size={18} />
              Central de Importação
            </button>
          </div>
        </div>

        {showWizard ? (
          <CentralImportWizard 
            onCancel={() => setShowWizard(false)} 
          />
        ) : (
          <div className="space-y-10">
            {/* Info Banner */}
            <div className="bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/20 p-4 rounded-[var(--radius-lg)] flex items-start gap-3">
              <AlertTriangle className="text-[var(--color-accent-warning)] shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <strong className="block text-[var(--color-accent-warning)] mb-1">Atenção ao Desfazer (Cascade Delete)</strong>
                <p className="text-[var(--text-secondary)]">
                  Ao desfazer uma importação em lote, o sistema apagará automaticamente todas as entradas no Extrato, Recebíveis futuros, a Conciliação e as OSs do Pátio referentes à Loja <strong>em todos os dias listados no período daquela planilha</strong>.
                </p>
              </div>
            </div>

            {/* Timeline / List */}
            <Card className="overflow-hidden p-0 flex flex-col">
              <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--text-primary)]">Histórico de Lotes</h3>
                <div className="text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-surface)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                  {imports.length} lotes processados
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <LoadingSpinner size="sm" text="Carregando lotes..." />
                </div>
              ) : imports.length === 0 ? (
                <div className="text-center py-16">
                  <FileSpreadsheet size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
                  <p className="text-[var(--text-tertiary)] font-medium">Nenhum lote importado.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[var(--border-subtle)] flex-1">
                    {paginatedImports.map((log: GroupedImportLog, i: number) => {
                      const isConfirming = confirmDeleteId === log.id;
                      const isDeleting = deleteImport.isPending && deleteImport.variables?.logIds?.includes(log.id);

                      const sortedDates = [...log.target_dates].sort();
                      const dateRange = sortedDates.length > 1 
                        ? `${sortedDates[0]} até ${sortedDates[sortedDates.length - 1]}`
                        : sortedDates[0] || 'Data única';

                      return (
                        <div key={log.id || i} className="p-4 hover:bg-[var(--bg-panel)]/50 transition-colors flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                                {log.store_name}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                {dateRange}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] flex-wrap">
                              <span>Importado em: {formatDate(log.created_at)}</span>
                              {log.os_count > 0 && <span>• {log.os_count} OSs</span>}
                              {log.receivables_count > 0 && <span>• {log.receivables_count} Lançamentos Maquininha/Banco</span>}
                              {log.total_os > 0 && <span>• R$ {log.total_os.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirming ? (
                              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                <span className="text-xs text-[var(--color-accent-danger)] font-medium">Confirmar exclusão?</span>
                                <button
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(log)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-[var(--color-accent-danger)] text-white hover:opacity-90 rounded flex items-center gap-1"
                                >
                                  {isDeleting ? <LoadingSpinner size="xs" /> : 'Sim, Excluir'}
                                </button>
                                <button
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1 text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded border border-[var(--border-subtle)]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={isDeleting}
                                onClick={() => handleDelete(log)}
                                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/10 rounded-lg transition-colors"
                                title="Desfazer/Excluir esta importação"
                              >
                                {isDeleting ? <LoadingSpinner size="xs" /> : <Trash2 size={16} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex justify-between items-center text-xs text-[var(--text-tertiary)]">
                      <span>Página {page} de {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={page === 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30 border border-[var(--border-subtle)]"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          disabled={page === totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30 border border-[var(--border-subtle)]"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}

        {/* Modal de Limpeza Geral */}
        <Modal
          isOpen={showClearAllModal}
          onClose={() => setShowClearAllModal(false)}
          title="⚠️ Limpar Todos os Dados do Sistema"
        >
          <div className="space-y-4 text-sm">
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-400">
              <strong>Atenção: Esta ação é irreversível!</strong>
              <p className="mt-1 text-xs">
                Todos os lançamentos do Extrato Bancário, Ordens de Serviço, Vendas da Maquininha, Conciliações e Históricos de Importação serão zerados para todas as lojas.
              </p>
            </div>

            <p className="text-[var(--text-secondary)]">
              Deseja realmente limpar toda a base de dados e reiniciar as importações do zero?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                disabled={clearAllData.isPending}
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-subtle)]"
              >
                Cancelar
              </button>
              <button
                disabled={clearAllData.isPending}
                onClick={handleClearAll}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5"
              >
                {clearAllData.isPending ? (
                  <>
                    <LoadingSpinner size="xs" />
                    Apagando dados...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Confirmar Exclusão Total
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
