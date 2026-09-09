import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Bot, 
  Download, 
  Sparkles, 
  Clock, 
  Calendar, 
  Landmark, 
  Trash2, 
  FileText, 
  Filter, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  useBotDownloadedFiles, 
  downloadOfxFile, 
  createOfxFileObject, 
  formatExpiresIn, 
  useDeleteBotDownloadedFile,
  BotDownloadedFile 
} from '@/hooks/useBotDownloadedFiles';
import { useStores } from '@/hooks/useStores';
import { TriggerBotModal } from './TriggerBotModal';

export interface BotDownloadedFilesCardProps {
  selectedDate?: string;
  onSelectOfxFile?: (file: File) => void;
  className?: string;
}

export function BotDownloadedFilesCard({
  selectedDate,
  onSelectOfxFile,
  className = '',
}: BotDownloadedFilesCardProps) {
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterBySelectedDate, setFilterBySelectedDate] = useState<boolean>(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: stores = [] } = useStores();
  const { data: files = [], isLoading, refetch, isFetching } = useBotDownloadedFiles({
    date: filterBySelectedDate ? selectedDate : undefined,
    storeId: filterStore,
  });

  const deleteFile = useDeleteBotDownloadedFile();

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este extrato do buffer?')) {
      setDeletingId(id);
      try {
        await deleteFile.mutateAsync(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleOpenInWizard = (fileRecord: BotDownloadedFile) => {
    const fileObj = createOfxFileObject(fileRecord.content, fileRecord.file_name);
    if (onSelectOfxFile) {
      onSelectOfxFile(fileObj);
    }
  };

  return (
    <>
      <Card className={`p-5 bg-zinc-900 border-zinc-800 space-y-4 ${className}`}>
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Extratos Coletados pelo Robô (Últimas 48h)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Clock size={10} /> Retenção de 48h ativa
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Arquivos .OFX extraídos autonomamente pelo servidor VPS. Baixe no seu PC ou envie diretamente para a conciliação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer border border-zinc-700/60"
              title="Atualizar lista de arquivos"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin text-amber-400' : ''} />
            </button>

            <Button
              type="button"
              onClick={() => setIsTriggerModalOpen(true)}
              className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-950/40"
            >
              <Bot size={14} /> Disparar Coleta Agora
            </Button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-zinc-400 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider">
              <Filter size={12} /> Filial:
            </label>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
            >
              <option value="all">Todas as Filiais ({stores.length})</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterBySelectedDate((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                filterBySelectedDate
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Calendar size={13} />
              {filterBySelectedDate && selectedDate
                ? `Filtrando pela Data: ${selectedDate.split('-').reverse().join('/')}`
                : 'Ver Todas as Datas Recentes'}
            </button>
          </div>
        </div>

        {/* Conteúdo: Loading, Empty ou Lista */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <LoadingSpinner size="md" text="Verificando arquivos no servidor..." />
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950/60 border border-dashed border-zinc-800 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-500">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300">
                Nenhum extrato OFX encontrado no buffer das últimas 48 horas
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                Assim que os robôs executarem no servidor VPS, os arquivos aparecerão aqui prontos para download imediato ou envio direto para a conciliação.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTriggerModalOpen(true)}
              className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
            >
              <Bot size={14} className="mr-1.5 text-amber-400" /> Disparar Coleta Manual no Servidor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {files.map((file) => {
              const storeName = file.stores?.name || file.store_id;
              const storeCode = file.stores?.code || file.store_id;
              const sizeKb = (file.file_size_bytes / 1024).toFixed(1);
              const createdAtDate = new Date(file.created_at);
              const formattedTime = createdAtDate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const formattedDate = createdAtDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              });
              const expiresInText = formatExpiresIn(file.expires_at);

              return (
                <div
                  key={file.id}
                  className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    {/* Topo do card: Banco + Loja + Expiração */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Landmark size={15} />
                        </div>
                        <span className="text-xs font-bold text-zinc-200">
                          {file.bank_name || 'Itaú Empresas'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 border border-zinc-750 text-zinc-200">
                          {storeName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                          {expiresInText}
                        </span>
                      </div>
                    </div>

                    {/* Nome do arquivo e metadados */}
                    <div className="pt-1">
                      <p className="text-xs font-mono font-medium text-zinc-300 truncate" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono mt-1">
                        <span>📅 {file.from_date.split('-').reverse().join('/')} a {file.to_date.split('-').reverse().join('/')}</span>
                        <span>•</span>
                        <span>{sizeKb} KB</span>
                        <span>•</span>
                        <span>{formattedDate} às {formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações do arquivo */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-850">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => downloadOfxFile(file.content, file.file_name)}
                        className="text-[11px] h-7 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition-all"
                        title="Baixar arquivo .ofx diretamente no seu computador"
                      >
                        <Download size={13} className="text-emerald-400" />
                        Baixar OFX
                      </Button>

                      {onSelectOfxFile && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenInWizard(file)}
                          className="text-[11px] h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                          title="Carregar este extrato diretamente na esteira de conciliação"
                        >
                          <Sparkles size={12} />
                          Abrir na Conciliação
                        </Button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Remover este arquivo do buffer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <TriggerBotModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        defaultDate={selectedDate}
      />
    </>
  );
}
