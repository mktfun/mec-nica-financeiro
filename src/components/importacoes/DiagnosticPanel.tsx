import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react';
import { DiagnosticResult, DiagnosticSource } from '../../types/diagnostic';
import { Badge } from '../ui/Badge';

interface DiagnosticPanelProps {
  diagnostic: DiagnosticResult | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatPercent = (val: number) => {
  if (!isFinite(val) || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(1)}%`;
};

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnostic,
  isLoading,
  onRefresh
}) => {
  if (!diagnostic) return null;

  const {
    sources,
    mainSuspect,
    isWithinThreshold,
    hasManualInputMissing,
    snapshotDaysUsed,
    projectedCaixaAtual,
    historicCaixaAvg,
    projectedDiff,
    threshold
  } = diagnostic;

  const renderStatusBadge = (source: DiagnosticSource) => {
    if (snapshotDaysUsed === 0) {
      return <span className="text-[11px] text-[var(--text-tertiary)] font-mono">—</span>;
    }

    if (source.status === 'ok') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span>Conforme</span>
        </span>
      );
    }

    if (source.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
          <AlertTriangle size={13} className="text-amber-400" />
          <span>Atenção</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
        <XCircle size={13} className="text-rose-400" />
        <span>Divergente</span>
      </span>
    );
  };

  return (
    <div className="p-6 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-2xl shadow-xl space-y-4">
      {/* Header do Painel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
              Auditoria Pré-Fechamento
              {isWithinThreshold ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Valores Alinhados
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/40">
                  Verificação Sugerida
                </Badge>
              )}
            </h4>
            <p className="text-xs text-[var(--text-tertiary)]">
              Conferência automática por componente versus histórico recente antes de gravar:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-[var(--text-tertiary)] block text-[10px] uppercase font-mono">Caixa Projetado</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {formatCurrency(projectedCaixaAtual)}
            </span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-white rounded-lg transition-colors"
              title="Recalcular diagnóstico"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Fontes */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase font-semibold">
              <th className="py-2.5 px-3">Componente / Fonte</th>
              <th className="py-2.5 px-3 text-right">Este Fechamento</th>
              <th className="py-2.5 px-3 text-right">Média Recente ({snapshotDaysUsed}d)</th>
              <th className="py-2.5 px-3 text-right">Variação (R$)</th>
              <th className="py-2.5 px-3 text-right">Variação (%)</th>
              <th className="py-2.5 px-3 text-center w-28">Auditoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {sources.map(source => {
              const isSuspect = mainSuspect?.key === source.key;
              const hasHistory = snapshotDaysUsed > 0 && source.historicAvg > 0;

              return (
                <tr
                  key={source.key}
                  className={`hover:bg-white/[0.02] transition-colors ${
                    isSuspect ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                    <span className="flex items-center gap-1.5">
                      {source.label}
                      {isSuspect && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                          Origem da Divergência
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--text-primary)]">
                    {formatCurrency(source.currentValue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[var(--text-secondary)]">
                    {hasHistory ? formatCurrency(source.historicAvg) : '—'}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-medium ${
                      source.deviation > 0
                        ? 'text-emerald-400'
                        : source.deviation < 0
                        ? 'text-rose-400'
                        : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {hasHistory ? `${source.deviation > 0 ? '+' : ''}${formatCurrency(source.deviation)}` : '—'}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-semibold ${
                      source.status === 'ok'
                        ? 'text-[var(--text-secondary)]'
                        : source.status === 'warning'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {hasHistory ? formatPercent(source.deviationPct) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">{renderStatusBadge(source)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Alerta de Suspeita Principal */}
      {mainSuspect && !isWithinThreshold && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">
              Observação de Auditoria no componente {mainSuspect.label}:
            </p>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              O valor projetado está com variação de{' '}
              <b>{formatCurrency(Math.abs(mainSuspect.deviation))}</b> ({formatPercent(mainSuspect.deviationPct)})
              em relação à média dos últimos {snapshotDaysUsed} dias ({formatCurrency(mainSuspect.historicAvg)}).
              Confira se todas as planilhas do dia foram incluídas ou se há ordens e despesas pendentes de conferência.
            </p>
          </div>
        </div>
      )}

      {/* Notas de Rodapé */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono">
        <div className="flex items-center gap-1.5">
          <Info size={12} />
          {hasManualInputMissing ? (
            <span>Dinheiro/MP e A Receber ainda estão zerados (diagnóstico preliminar).</span>
          ) : snapshotDaysUsed === 0 ? (
            <span>Sem histórico anterior disponível — exibindo valores do dia como referência.</span>
          ) : (
            <span>Baseado na média dos últimos {snapshotDaysUsed} fechamentos diários (tolerância: {formatCurrency(threshold)}).</span>
          )}
        </div>

        {snapshotDaysUsed > 0 && (
          <span>
            Desvio Global: {projectedDiff > 0 ? '+' : ''}{formatCurrency(projectedDiff)} vs Média ({formatCurrency(historicCaixaAvg)})
          </span>
        )}
      </div>
    </div>
  );
};
