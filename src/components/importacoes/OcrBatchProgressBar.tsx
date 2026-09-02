import React from 'react';
import { Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { OcrBatchProgress } from '@/hooks/useOcrOsProcessor';

interface OcrBatchProgressBarProps {
  progress: OcrBatchProgress;
  isProcessing: boolean;
}

export const OcrBatchProgressBar: React.FC<OcrBatchProgressBarProps> = ({
  progress,
  isProcessing,
}) => {
  if (!isProcessing && progress.processed === 0) return null;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 my-3 space-y-2.5 animate-in fade-in">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-medium text-zinc-200">
            {isProcessing
              ? `Processando lote ${progress.batch} de ${progress.totalBatches} (Anti-Rate-Limit: 2 por vez)...`
              : 'Processamento concluído com sucesso!'}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-zinc-400">
            {progress.processed} de {progress.total} prints extraídos
          </span>
          <span className="text-emerald-400 font-bold">{progress.percentage}%</span>
        </div>
      </div>

      {/* Bar container */}
      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
          style={{ width: `${Math.max(5, progress.percentage)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>Motor: Mistral AI Vision (Pixtral-12B / JSON Mode)</span>
        {progress.currentStoreName && (
          <span className="text-zinc-400">
            Filial detectada: <strong className="text-zinc-200">{progress.currentStoreName}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
