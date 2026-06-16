import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FileSpreadsheet, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useImportsHistory, useDeleteImport, GroupedImportLog } from '@/hooks/useImportProcessor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Link, useNavigate } from '@tanstack/react-router';
import { CategorySelector } from '@/components/importacoes/CategorySelector';
import { CentralImportWizard } from '@/components/importacoes/CentralImportWizard';
import { UploadCloud } from 'lucide-react';

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
  const navigate = useNavigate();
  
  const [showWizard, setShowWizard] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(imports.length / itemsPerPage);
  const paginatedImports = imports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleDelete = async (log: GroupedImportLog) => {
    try {
      if (confirmDeleteId === log.id) {
        console.log('Sending delete mutation for log:', log);
        await deleteImport.mutateAsync({
          storeId: log.store_id,
          targetDates: log.target_dates,
          logIds: log.raw_logs.map(r => r.id),
          rawLogs: log.raw_logs
        });
        console.log('Delete successful');
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(log.id);
      }
    } catch (err) {
      console.error('Failed to delete import log:', err);
      alert('Erro ao excluir importação: ' + ((err as any).message || JSON.stringify(err)));
    }
  };

  const handleSelectCategory = (id: string) => {
    if (id === 'DESPESAS' || id === 'JUROS') {
      navigate({ to: '/importacoes-despesas' });
    } else if (id === 'PATIO') {
      navigate({ to: '/importar-os' });
    } else {
      setShowWizard(true);
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
            <button onClick={() => setShowWizard(true)} className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
              <UploadCloud size={18} />
              Central de Importação
            </button>
            <Link to="/importacoes-despesas" className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-sm font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
              <Database size={18} className="text-[var(--color-primary)]" />
              Importar Despesas
            </Link>
          </div>
        </div>

        {showWizard ? (
          <CentralImportWizard 
            onCancel={() => setShowWizard(false)} 
          />
        ) : (
          <div className="space-y-10">
            {/* Category Selector */}
            <div>
              <h2 className="text-xl font-bold mb-4">Selecione uma Categoria</h2>
              <CategorySelector onSelect={handleSelectCategory} />
            </div>

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
                        ? `${sortedDates[0].split('-').reverse().join('/')} a ${sortedDates[sortedDates.length - 1].split('-').reverse().join('/')}`
                        : sortedDates[0]?.split('-').reverse().join('/') || 'Sem Data';

                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 hover:bg-[var(--bg-surface-elevated)] transition-colors group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="mt-1 md:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-success)]/10 text-[var(--color-success)]">
                              <CheckCircle2 size={20} />
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-[var(--text-primary)]">
                                {log.store_name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-tertiary)]">
                                <span className="flex items-center gap-1">
                                  <strong className="text-[var(--text-secondary)]">Período Afetado:</strong> 
                                  {dateRange} <span className="opacity-70">({log.target_dates.length} dias)</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <strong className="text-[var(--text-secondary)]">Enviado em:</strong> 
                                  {formatDate(log.created_at)}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                                <span className="bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                                  {log.os_count} OS Processadas
                                </span>
                                <span className="bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-subtle)]">
                                  {log.receivables_count} Recebíveis
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 md:mt-0 ml-14 md:ml-0 flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              {log.os_count === 0 && Number(log.total_os || 0) > 0 ? (
                                <>
                                  <div className="text-xs text-[var(--color-accent-danger)] uppercase tracking-wider mb-0.5 font-bold">Lote Despesas</div>
                                  <div className="font-mono font-semibold text-lg text-[var(--color-accent-danger)]">
                                    -<AnimatedNumber value={Number(log.total_os || 0)} format="currency" />
                                  </div>
                                </>
                              ) : log.store_name?.includes('[OFX]') ? (
                                <>
                                  <div className="text-xs text-[var(--color-primary)] uppercase tracking-wider mb-0.5 font-bold">Extrato Bancário</div>
                                  <div className="font-mono font-semibold text-lg text-[var(--color-primary)]">
                                    <AnimatedNumber value={Number(log.total_paid_all || 0)} format="currency" />
                                  </div>
                                </>
                              ) : log.store_name?.includes('[Maquininha]') ? (
                                <>
                                  <div className="text-xs text-[var(--color-accent-teal)] uppercase tracking-wider mb-0.5 font-bold">Lote Maquininha</div>
                                  <div className="font-mono font-semibold text-lg text-[var(--color-accent-teal)]">
                                    <AnimatedNumber value={Number(log.total_paid_all || 0)} format="currency" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Lote OS</div>
                                  <div className="font-mono font-semibold text-lg text-[var(--text-primary)]">
                                    <AnimatedNumber value={Number(log.total_os || 0)} format="currency" />
                                  </div>
                                </>
                              )}
                            </div>

                            {isConfirming ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  disabled={isDeleting}
                                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleDelete(log)}
                                  disabled={isDeleting}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent-danger)] text-white text-xs font-medium rounded-md hover:bg-[var(--color-accent-danger)]/90 transition-colors disabled:opacity-50"
                                >
                                  {isDeleting ? <LoadingSpinner size="sm" text="" /> : "Confirmar Limpeza"}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDelete(log)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/10 transition-colors"
                                title="Desfazer Lote de Importação"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
                      <div className="text-xs text-[var(--text-tertiary)]">
                        Página <span className="font-medium text-[var(--text-primary)]">{page}</span> de {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-2 rounded-md hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)]"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="p-2 rounded-md hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--text-secondary)]"
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
      </div>
    </AppShell>
  );
}
