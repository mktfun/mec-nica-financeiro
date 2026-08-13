import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CheckCircle2, AlertTriangle, HelpCircle, Link2Off, FileEdit } from 'lucide-react';
import { useRedeVsExtrato } from '@/hooks/useConciliacao';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { useState } from 'react';

interface RedeVsExtratoTableProps {
  storeId: string;
  date: string;
}

export function RedeVsExtratoTable({ storeId, date }: RedeVsExtratoTableProps) {
  const { data, isLoading, refetch } = useRedeVsExtrato(storeId, date) as any;
  const { categorize } = useCategorizeOrphan();
  const [categorizingTx, setCategorizingTx] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner size="sm" text="Cruzando dados Rede × Extrato..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-[var(--text-tertiary)]">
        <Link2Off size={40} className="mx-auto mb-3 opacity-20" />
        <p className="font-medium">Nenhum dado disponível para cruzamento.</p>
        <p className="text-sm mt-1 opacity-60">
          Importe o relatório da Rede e o extrato OFX para ver o cruzamento.
        </p>
      </div>
    );
  }

  const { matched, unmatchedRede, unmatchedExtrato } = data;
  const allRows = [
    ...matched.map((r: any) => ({ ...r, matchType: 'matched' })),
    ...unmatchedRede.map((r: any) => ({ ...r, matchType: 'unmatched_rede' })),
    ...unmatchedExtrato.map((r: any) => ({ ...r, matchType: 'unmatched_extrato' })),
  ];

  const summary = {
    matched: matched.length,
    divergentes: matched.filter((r: any) => Math.abs(r.delta) >= 0.01).length,
    semParRede: unmatchedRede.length,
    semParExtrato: unmatchedExtrato.length,
  };

  return (
    <div className="space-y-4">
      {/* Resumo do cruzamento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <div className="bg-[var(--color-accent-teal)]/10 border border-[var(--color-accent-teal)]/20 rounded-lg p-3 text-center">
          <p className="text-xl font-display font-bold text-[var(--color-accent-teal)]">
            {summary.matched}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Pareados
          </p>
        </div>
        <div className="bg-[var(--color-accent-warning)]/10 border border-[var(--color-accent-warning)]/20 rounded-lg p-3 text-center">
          <p className="text-xl font-display font-bold text-[var(--color-accent-warning)]">
            {summary.divergentes}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Com Delta
          </p>
        </div>
        <div className="bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/20 rounded-lg p-3 text-center">
          <p className="text-xl font-display font-bold text-[var(--color-accent-danger)]">
            {summary.semParRede}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Só na Rede
          </p>
        </div>
        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg p-3 text-center">
          <p className="text-xl font-display font-bold text-[var(--color-primary)]">
            {summary.semParExtrato}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Só no Extrato
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
              <th className="text-left py-3 px-4 font-medium">Nº OS / Ref.</th>
              <th className="text-right py-3 px-4 font-medium">Rede (Bruto)</th>
              <th className="text-right py-3 px-4 font-medium">Rede (Líquido)</th>
              <th className="text-right py-3 px-4 font-medium">Extrato (OFX)</th>
              <th className="text-right py-3 px-4 font-medium">Delta</th>
              <th className="text-right py-3 px-4 font-medium">Modalidade</th>
              <th className="text-center py-3 px-4 font-medium">Status</th>
              <th className="text-center py-3 px-4 font-medium w-32">Ações</th>
            </tr>
          </thead>
          <tbody>
            {allRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--text-tertiary)]">
                  Nenhum lançamento encontrado neste dia.
                </td>
              </tr>
            ) : (
              allRows.map((row: any, i: number) => {
                const delta =
                  row.matchType === 'matched' ? row.delta : null;
                const hasDelta = delta !== null && Math.abs(delta) >= 0.01;

                return (
                  <motion.tr
                    key={`${row.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors ${
                      row.matchType === 'unmatched_rede'
                        ? 'bg-[var(--color-accent-danger)]/5'
                        : row.matchType === 'unmatched_extrato'
                        ? 'bg-[var(--color-primary)]/5'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {row.matchType === 'matched' ? (
                          hasDelta ? (
                            <AlertTriangle
                              size={14}
                              className="text-[var(--color-accent-warning)] shrink-0"
                            />
                          ) : (
                            <CheckCircle2
                              size={14}
                              className="text-[var(--color-accent-teal)] shrink-0"
                            />
                          )
                        ) : (
                          <HelpCircle
                            size={14}
                            className="text-[var(--color-accent-danger)] shrink-0"
                          />
                        )}
                        <span className="font-mono text-xs">
                          {row.os_number ||
                            row.rede_ref ||
                            row.extrato_ref ||
                            '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--text-primary)]">
                      {row.rede_amount != null ? (
                        <AnimatedNumber value={row.rede_amount} format="currency" />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--text-primary)] opacity-80">
                      {row.rede_liquido != null ? (
                        <AnimatedNumber value={row.rede_liquido} format="currency" />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[var(--color-primary)]">
                      {row.extrato_amount != null ? (
                        <AnimatedNumber
                          value={row.extrato_amount}
                          format="currency"
                        />
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {delta !== null ? (
                        <span
                          className={
                            hasDelta
                              ? 'text-[var(--color-accent-warning)] font-semibold'
                              : 'text-[var(--color-accent-teal)]'
                          }
                        >
                          {hasDelta ? (delta > 0 ? '+' : '') : ''}
                          {hasDelta ? (
                            <AnimatedNumber value={delta} format="currency" />
                          ) : (
                            'R$ 0,00'
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded-full">
                        {row.payment_method || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.matchType === 'matched' ? (
                        hasDelta ? (
                          <Badge variant="warning">Delta</Badge>
                        ) : (
                          <Badge variant="success">Bateu ✓</Badge>
                        )
                      ) : row.matchType === 'unmatched_rede' ? (
                         row.manual_category ? (
                           <Badge variant="neutral">{row.manual_category.replace('_', ' ').toUpperCase()}</Badge>
                         ) : (
                           <Badge variant="danger">Só na Rede</Badge>
                         )
                      ) : (
                         row.manual_category ? (
                           <Badge variant="neutral">{row.manual_category.replace('_', ' ').toUpperCase()}</Badge>
                         ) : (
                           <Badge variant="neutral">Só no Extrato</Badge>
                         )
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {(row.matchType === 'unmatched_extrato' || row.matchType === 'unmatched_rede') && !row.manual_category && (
                        <button
                          onClick={() => setCategorizingTx(row)}
                          className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated)] hover:bg-[var(--color-primary)]/20 text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1 text-xs"
                          title="Justificar / Categorizar"
                        >
                          <FileEdit size={14} /> Justificar
                        </button>
                      )}
                      {row.manual_category && (
                         <span className="text-[10px] text-[var(--text-tertiary)] max-w-[100px] truncate block" title={row.manual_justification}>
                           {row.manual_justification}
                         </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {categorizingTx && (
        <OrphanCategorizationModal
          transactionId={categorizingTx.id}
          transactionTitle={categorizingTx.extrato_ref || categorizingTx.rede_ref || 'Transação'}
          transactionAmount={categorizingTx.extrato_amount || categorizingTx.rede_amount || categorizingTx.rede_liquido || 0}
          transactionType={categorizingTx.extrato_amount > 0 ? 'in' : 'out'}
          onClose={() => setCategorizingTx(null)}
          categorizeOrphan={categorize}
          onSuccess={(cat, just) => {
            setCategorizingTx(null);
            if (refetch) refetch();
          }}
        />
      )}
    </div>
  );
}
