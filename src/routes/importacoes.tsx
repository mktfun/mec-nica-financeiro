import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { useState } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Layers, 
  History,
  Sparkles
} from 'lucide-react';
import { useImportsHistory, useDeleteImport, useClearAllData, GroupedImportLog } from '@/hooks/useImportProcessor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { CentralImportWizard } from '@/components/importacoes/CentralImportWizard';
import { MarcoZeroWizard } from '@/components/importacoes/MarcoZeroWizard';

interface ImportacoesSearchParams {
  tab?: 'diario' | 'marco-zero' | 'historico';
  date?: string;
}

export const Route = createFileRoute('/importacoes')({
  validateSearch: (search: Record<string, unknown>): ImportacoesSearchParams => {
    return {
      tab: (search.tab as any) || 'diario',
      date: (search.date as string) || undefined,
    };
  },
  component: ImportacoesPage,
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ImportacoesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeTab = search.tab || 'diario';
  const selectedDate = search.date;

  const { data: imports = [], isLoading } = useImportsHistory();
  const deleteImport = useDeleteImport();
  const clearAllData = useClearAllData();
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(imports.length / itemsPerPage);
  const paginatedImports = imports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleTabChange = (tab: 'diario' | 'marco-zero' | 'historico') => {
    navigate({ search: (old) => ({ ...old, tab }) });
  };

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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* HEADER DA PÁGINA */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-zinc-100 flex items-center gap-3">
              <FileSpreadsheet size={30} className="text-emerald-500" />
              Central de Importações & Fechamento
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Processamento em tela cheia de extratos bancários, relatórios de pátio e conciliação de fechamento diário.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowClearAllModal(true)} 
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              title="Apagar todos os dados do banco de dados"
            >
              <Trash2 size={16} />
              Limpar Todos os Dados
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS (DARK UI SÓLIDO) */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
          <button
            onClick={() => handleTabChange('diario')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'diario'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Calendar size={16} />
            Fechamento Diário
          </button>

          <button
            onClick={() => handleTabChange('marco-zero')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'marco-zero'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Layers size={16} />
            Carga de Marco Zero
          </button>

          <button
            onClick={() => handleTabChange('historico')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'historico'
                ? 'bg-zinc-700 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <History size={16} />
            Histórico de Lotes ({imports.length})
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        {activeTab === 'diario' && (
          <div className="animate-in fade-in duration-300">
            <CentralImportWizard 
              initialDate={selectedDate}
              onCancel={() => handleTabChange('historico')}
            />
          </div>
        )}

        {activeTab === 'marco-zero' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="mb-6 pb-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Layers size={20} className="text-amber-400" />
                  Implantação e Saldo Inicial de Marco Zero
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Importe a planilha consolidada de implantação para carregar saldos de contas e OSs legadas pendentes.
                </p>
              </div>
              <MarcoZeroWizard 
                onComplete={() => handleTabChange('historico')} 
                onCancel={() => handleTabChange('diario')} 
              />
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            
            {/* Info Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div className="text-xs text-zinc-300">
                <strong className="block text-amber-400 mb-0.5 text-sm">Atenção ao Desfazer (Cascade Delete)</strong>
                Ao desfazer uma importação em lote, o sistema apagará automaticamente todas as entradas no Extrato, Recebíveis, Conciliação e OSs do Pátio referentes à Loja em todos os dias listados no período daquela planilha.
              </div>
            </div>

            {/* Timeline / List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex justify-between items-center">
                <h3 className="font-semibold text-sm text-zinc-200">Histórico de Lotes Processados</h3>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {imports.length} lotes registrados
                </span>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <LoadingSpinner size="sm" text="Carregando lotes..." />
                </div>
              ) : imports.length === 0 ? (
                <div className="text-center py-16">
                  <FileSpreadsheet size={40} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-400 text-xs font-medium">Nenhum lote importado.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-zinc-800/80 flex-1">
                    {paginatedImports.map((log: GroupedImportLog, i: number) => {
                      const isConfirming = confirmDeleteId === log.id;
                      const isDeleting = deleteImport.isPending && deleteImport.variables?.logIds?.includes(log.id);

                      const sortedDates = [...log.target_dates].sort();
                      const dateRange = sortedDates.length > 1 
                        ? `${sortedDates[0]} até ${sortedDates[sortedDates.length - 1]}`
                        : sortedDates[0] || 'Data única';

                      return (
                        <div key={log.id || i} className="p-4 hover:bg-zinc-800/30 transition-colors flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-zinc-100 truncate">
                                {log.store_name}
                              </span>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800">
                                {dateRange}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                              <span>Importado em: {formatDate(log.created_at)}</span>
                              {log.os_count > 0 && <span>• {log.os_count} OSs</span>}
                              {log.receivables_count > 0 && <span>• {log.receivables_count} Lançamentos Maquininha/Banco</span>}
                              {log.total_os > 0 && <span>• R$ {log.total_os.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirming ? (
                              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                <span className="text-xs text-red-400 font-medium">Confirmar exclusão?</span>
                                <button
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(log)}
                                  className="px-3 py-1 text-xs font-semibold bg-red-600 text-white hover:bg-red-500 rounded-lg flex items-center gap-1 cursor-pointer"
                                >
                                  {isDeleting ? <LoadingSpinner size="xs" /> : 'Sim, Excluir'}
                                </button>
                                <button
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={isDeleting}
                                onClick={() => handleDelete(log)}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
                    <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-between items-center text-xs text-zinc-400">
                      <span>Página {page} de {totalPages}</span>
                      <div className="flex gap-1">
                        <button
                          disabled={page === 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          disabled={page === totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}

        {/* Modal de Limpeza Geral */}
        <Modal
          isOpen={showClearAllModal}
          onClose={() => setShowClearAllModal(false)}
          title="⚠️ Limpar Todos os Dados do Sistema"
        >
          <div className="space-y-4 text-sm text-zinc-200">
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-xs">
              <strong className="block font-bold mb-1">Atenção: Esta ação é irreversível!</strong>
              Todos os lançamentos do Extrato Bancário, Ordens de Serviço, Vendas da Maquininha, Conciliações e Históricos de Importação serão zerados para todas as lojas.
            </div>

            <p className="text-zinc-300 text-xs">
              Deseja realmente limpar toda a base de dados e reiniciar as importações do zero?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                disabled={clearAllData.isPending}
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={clearAllData.isPending}
                onClick={handleClearAll}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl flex items-center gap-1.5 cursor-pointer"
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
