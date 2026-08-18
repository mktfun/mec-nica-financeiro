import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Info } from 'lucide-react';
import { ReconciliationObservation } from '@/hooks/useReconciliationInsights';

interface AuditTrailBarProps {
  observations?: ReconciliationObservation[];
  className?: string;
}

export function AuditTrailBar({ observations = [], className = '' }: AuditTrailBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!observations || observations.length === 0) {
    return null;
  }

  const count = observations.length;
  const label = count === 1 ? '1 observação de conferência' : `${count} observações de conferência`;

  return (
    <div className={`rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm overflow-hidden transition-all duration-300 ${className}`}>
      {/* Header Bar Colapsável */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-zinc-500" />
          <span className="font-medium">{label}</span>
          <span className="text-[10px] text-zinc-600 font-mono">· Auditoria Discreta</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300">
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Lista de Observações Expandida */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/60 space-y-2 text-xs">
          {observations.map((obs) => {
            const isWarning = obs.severity === 'warning';
            return (
              <div
                key={obs.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/40"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-amber-400/80 mt-0.5 shrink-0 text-xs">🔸</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        {obs.pillarLabel}
                      </span>
                      <span className="font-semibold text-zinc-200 text-xs">{obs.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">{obs.description}</p>
                  </div>
                </div>

                {obs.delta !== undefined && obs.delta > 0 && (
                  <div className="shrink-0 text-right sm:pl-4">
                    <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Impacto</span>
                    <span className="font-mono font-bold text-xs text-amber-400/90">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(obs.delta)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
