import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FileSpreadsheet, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useImportsHistory, useDeleteImport } from '@/hooks/useImportProcessor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (log: any) => {
    if (confirmDeleteId === log.id) {
      await deleteImport.mutateAsync({
        id: log.id,
        storeId: log.store_id,
        targetDate: log.target_date,
      });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(log.id);
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
              Histórico de planilhas importadas. Você pode desfazer uma importação em caso de erro.
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/20 p-4 rounded-[var(--radius-lg)] flex items-start gap-3">
          <AlertTriangle className="text-[var(--color-accent-warning)] shrink-0 mt-0.5" size={20} />
          <div className="text-sm">
            <strong className="block text-[var(--color-accent-warning)] mb-1">Atenção ao Desfazer (Cascade Delete)</strong>
            <p className="text-[var(--text-secondary)]">
              Ao desfazer uma importação, o sistema apagará automaticamente todas as entradas no Extrato, Recebíveis futuros, a Conciliação e as OSs Fechadas e Em Aberto do Pátio referentes à Loja e Data selecionadas.
            </p>
          </div>
        </div>

        {/* Timeline / List */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
            <h3 className="font-semibold text-[var(--text-primary)]">Histórico de Importações</h3>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="sm" text="Carregando histórico..." />
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet size={40} className="mx-auto mb-4 text-[var(--text-tertiary)] opacity-40" />
              <p className="text-[var(--text-tertiary)] font-medium">Nenhuma importação encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {imports.map((log: any, i: number) => {
                const isConfirming = confirmDeleteId === log.id;
                const isDeleting = deleteImport.isPending && deleteImport.variables?.id === log.id;

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
                            <strong className="text-[var(--text-secondary)]">Referência:</strong> 
                            {log.target_date?.split('-').reverse().join('/')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <strong className="text-[var(--text-secondary)]">Importado em:</strong> 
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
                        <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Total OS</div>
                        <div className="font-mono font-semibold text-lg text-[var(--text-primary)]">
                          <AnimatedNumber value={Number(log.total_os || 0)} format="currency" />
                        </div>
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
                            {isDeleting ? <LoadingSpinner size="sm" text="" /> : "Sim, Excluir"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(log)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)] hover:bg-[var(--color-accent-danger)]/10 transition-colors"
                          title="Desfazer Importação"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
