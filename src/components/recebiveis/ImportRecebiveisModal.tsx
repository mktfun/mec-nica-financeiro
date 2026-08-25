import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { parseRecebiveisExcel, ParsedReceivableRow } from '@/lib/parsers/recebiveisParser';
import { useBatchSaveReceivables } from '@/hooks/useRecebiveis';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ImportRecebiveisModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
}

export function ImportRecebiveisModal({ isOpen, onClose, targetDate }: ImportRecebiveisModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceivableRow[]>([]);
  const [totalParsed, setTotalParsed] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const batchSaveMutation = useBatchSaveReceivables();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const res = await parseRecebiveisExcel(selectedFile, targetDate);
      if (!res.success || res.data.length === 0) {
        toast.error(res.error || 'Nenhum recebível detectado na planilha.');
        setParsedData([]);
        setTotalParsed(0);
      } else {
        setParsedData(res.data);
        setTotalParsed(res.total);
        toast.success(`${res.data.length} recebíveis detectados em ${res.storesCount} filiais!`);
      }
    } catch (err: any) {
      toast.error('Erro ao processar planilha: ' + (err.message || err));
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveBatch = async () => {
    if (parsedData.length === 0) return;

    try {
      await batchSaveMutation.mutateAsync(
        parsedData.map(d => ({
          store_id: d.storeId,
          store_name: d.storeName,
          description: d.description,
          os_number: d.osNumber || null,
          installment: d.installment || null,
          type: d.type,
          value: d.value,
          status: 'pendente',
          date: d.date || targetDate,
          due_date: d.dueDate || targetDate
        }))
      );

      toast.success(`${parsedData.length} recebíveis gravados com sucesso!`);
      onClose();
    } catch (err: any) {
      toast.error('Erro ao gravar lote: ' + (err.message || err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar Recebíveis da Planilha de Conciliação"
      size="2xl"
    >
      <div className="space-y-5">
        {/* Dropzone */}
        <div className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50 rounded-2xl p-6 text-center bg-zinc-950/40 transition-colors">
          <input
            type="file"
            id="recebiveis-excel-input"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="recebiveis-excel-input" className="cursor-pointer flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="font-medium text-sm text-[var(--text-primary)]">
              {file ? file.name : 'Clique ou arraste a planilha CONCILIAÇÃO *.xlsx'}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              O motor lerá automaticamente a aba <span className="text-[var(--color-primary)] font-mono font-bold">RECEBIVEIS</span> e mapeará as filiais.
            </div>
          </label>
        </div>

        {/* Loading */}
        {isParsing && (
          <div className="text-center py-4 text-sm text-[var(--text-secondary)] animate-pulse">
            Processando aba de Recebíveis da planilha...
          </div>
        )}

        {/* Preview dos Itens Detectados */}
        {parsedData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {parsedData.length} títulos detectados
                </span>
              </div>
              <div className="font-mono font-bold text-sm text-[var(--color-primary)]">
                Total: {formatCurrency(totalParsed)}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {parsedData.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{item.storeName}</span>
                      <span className="text-zinc-400">—</span>
                      <span className="text-zinc-300">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] font-mono">
                      <span>Venc: {item.dueDate.split('-').reverse().join('/')}</span>
                      <span>•</span>
                      <span>Tipo: {item.type}</span>
                    </div>
                  </div>

                  <div className="font-mono font-bold text-sm text-[var(--text-primary)] shrink-0">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="outline" onClick={onClose} disabled={batchSaveMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveBatch}
            disabled={parsedData.length === 0 || batchSaveMutation.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium shadow-sm"
          >
            {batchSaveMutation.isPending ? 'Gravando...' : `Gravar ${parsedData.length} Recebíveis`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
