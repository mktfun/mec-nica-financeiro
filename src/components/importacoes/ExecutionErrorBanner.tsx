import React, { useState } from 'react';
import { AlertOctagon, RotateCw, Copy, Check, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export interface ExecutionErrorBannerProps {
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
    stack?: string;
    source?: string;
  } | string | null;
  isRetrying?: boolean;
  onRetry: () => void;
  title?: string;
}

export const ExecutionErrorBanner: React.FC<ExecutionErrorBannerProps> = ({
  error,
  isRetrying = false,
  onRetry,
  title = 'Falha no Processamento da Conciliação',
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = typeof error === 'object' && error?.code ? error.code : null;
  const errorDetails = typeof error === 'object' ? error?.details : null;
  const errorHint = typeof error === 'object' ? error?.hint : null;

  // Tradução / Diagnóstico Amigável
  let friendlyDiagnosis = 'Ocorreu um erro ao comunicar com a base de dados durante o fechamento.';
  if (errorMessage.includes('daily_manual_bills_amount_check')) {
    friendlyDiagnosis = 'Uma ou mais contas a pagar possuem valor zerado ou negativo (violação da regra de valor positivo).';
  } else if (errorMessage.includes('violates foreign key constraint') || errorMessage.includes('daily_manual_bills_store_id_fkey')) {
    friendlyDiagnosis = 'Uma das contas a pagar faz referência a uma filial não cadastrada no sistema.';
  } else if (errorMessage.includes('23505') || errorMessage.includes('duplicate key')) {
    friendlyDiagnosis = 'Tentativa de inserção de chave duplicada. O sistema tentará a reconciliação automática.';
  } else if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
    friendlyDiagnosis = 'Sessão de autenticação expirada. Por favor, recarregue a página ou faça login novamente.';
  }

  const handleCopy = () => {
    const textToCopy = typeof error === 'object' 
      ? JSON.stringify(error, null, 2)
      : errorMessage;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Detalhes do erro copiados!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-rose-950/20 border-2 border-rose-500/40 rounded-2xl p-5 shadow-xl shadow-rose-950/20 space-y-4 font-sans animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            <AlertOctagon size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-rose-200">{title}</h4>
              {errorCode && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold">
                  Código: {errorCode}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 font-medium leading-relaxed">
              {friendlyDiagnosis}
            </p>
            <p className="text-xs font-mono text-rose-300/90 break-words bg-black/40 p-2 rounded-lg border border-rose-900/40 mt-1">
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:self-center">
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-5 py-2.5 bg-rose-500 text-zinc-950 hover:bg-rose-400 font-bold text-xs rounded-xl shadow-md shadow-rose-950/50 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            {isRetrying ? <LoadingSpinner size="xs" text="" /> : <RotateCw size={14} />}
            Tentar Novamente
          </Button>
        </div>
      </div>

      {/* Detalhes Técnicos Colapsáveis */}
      {(errorDetails || errorHint || typeof error === 'object') && (
        <div className="pt-2 border-t border-rose-900/40">
          <div className="flex items-center justify-between text-xs text-rose-400/80 font-mono">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-1.5 hover:text-rose-300 transition-colors cursor-pointer"
            >
              {showTechnicalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showTechnicalDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos do Banco'}
            </button>

            {showTechnicalDetails && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-rose-200 transition-colors cursor-pointer px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
              >
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>

          {showTechnicalDetails && (
            <div className="mt-2.5 p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1.5 overflow-x-auto">
              {errorDetails && <div><strong className="text-rose-400">Details:</strong> {errorDetails}</div>}
              {errorHint && <div><strong className="text-rose-400">Hint:</strong> {errorHint}</div>}
              <div>
                <strong className="text-rose-400">Raw Error:</strong>
                <pre className="mt-1 p-2 bg-black/60 rounded text-rose-300/80 text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {typeof error === 'object' ? JSON.stringify(error, null, 2) : errorMessage}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
