import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, Info, ExternalLink, CreditCard, Percent, Landmark, ArrowRight } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { usePosTripleReconciliation } from '@/hooks/useBackendConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';
import { formatCurrency } from '@/lib/utils';
import { AmountCell } from '@/components/finance/AmountCell';

interface StoreCartaoMaquininhaViewProps {
  storeId: string;
  date: string;
}

export function StoreCartaoMaquininhaView({ storeId, date }: StoreCartaoMaquininhaViewProps) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const { data: tripleReconData } = usePosTripleReconciliation(date);
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando conciliação de cartões..." /></div>;
  }

  const rows = data?.osVsRede || [];
  const storePos = tripleReconData?.stores?.find(s => s.store_id === storeId);

  const totalRedeBruto = rows.reduce((acc: number, r: any) => acc + Number(r.rede_bruto || 0), 0);
  const totalTaxas = rows.reduce((acc: number, r: any) => acc + Number(r.taxa_brl || 0), 0);
  const totalRedeLiquido = rows.reduce((acc: number, r: any) => acc + Number(r.rede_liquido || 0), 0);
  const totalCreditadoBanco = storePos?.ofx_maquininhas || (data?.redeVsOfx?.totalAdquirenteOfx ?? 0);
  const valorACompensar = storePos?.nao_entrou_valor || 0;
  const isSettled = storePos?.status_compensacao === 'entrou' || totalCreditadoBanco >= totalRedeLiquido;

  const getBrandBadgeColor = (brand: string) => {
    const b = (brand || '').toLowerCase();
    if (b.includes('visa')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (b.includes('master')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (b.includes('elo')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (b.includes('hiper')) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (b.includes('pix')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards Canônicos (border-l-4) — Padrão Pátio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bruto */}
        <Card className="border-l-4 border-l-[var(--color-primary)]">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Cartão (Bruto)</p>
          <p className="font-display font-bold text-2xl text-[var(--text-primary)] font-mono">
            <AmountCell value={totalRedeBruto} tone="neutral" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">Vendas passadas na maquininha</span>
        </Card>

        {/* Card 2: Taxas MDR */}
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Taxas MDR Retidas</p>
          <p className="font-display font-bold text-2xl font-mono text-amber-400">
            - <AmountCell value={totalTaxas} tone="warning" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">
            Média efetiva: {totalRedeBruto > 0 ? ((totalTaxas / totalRedeBruto) * 100).toFixed(2) : '0,00'}%
          </span>
        </Card>

        {/* Card 3: Líquido Apurado */}
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Líquido das Vendas</p>
          <p className="font-display font-bold text-2xl font-mono text-emerald-400">
            <AmountCell value={totalRedeLiquido} tone="success" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">Crédito calculado das vendas</span>
        </Card>

        {/* Card 4: Creditado no Banco */}
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Creditado no Extrato</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display font-bold text-2xl font-mono text-blue-400">
              <AmountCell value={totalCreditadoBanco} tone="brand" />
            </p>
            {isSettled ? (
              <Badge variant="success" dot className="text-[10px]">
                ENTROU
              </Badge>
            ) : (
              <Badge variant="warning" dot className="text-[10px]">
                A COMPENSAR
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">
            {valorACompensar > 0 ? `+ ${formatCurrency(valorACompensar)} a compensar` : 'Lote liquidado no banco'}
          </span>
        </Card>
      </div>

      {/* Tabela Unificada de Vendas por Cartão — Padrão Pátio */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-surface-elevated)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-white">
              <CreditCard size={18} className="text-emerald-400" />
              1. Vendas em Cartão (Maquininha → Extrato Bancário)
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Conferência individual das vendas: bandeira, valor bruto, taxa MDR retida, OS vinculada e status no extrato bancário.
            </p>
          </div>
          <Badge variant="neutral" className="text-xs font-mono">
            {rows.length} transações
          </Badge>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação de cartão encontrada para esta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Bandeira / Modalidade</th>
                  <th className="text-right py-3 px-4 font-semibold">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-semibold">Taxa MDR Retida</th>
                  <th className="text-right py-3 px-4 font-semibold">Valor Líquido</th>
                  <th className="text-left py-3 px-4 font-semibold">Referência / OS</th>
                  <th className="text-center py-3 px-4 font-semibold">Status no Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasOs = !!row.os_data || (row.os_number && row.os_number !== 'Lote REDE Consolidado');

                  return (
                    <tr key={i} className="hover:bg-[var(--bg-surface-elevated)] transition-colors">
                      {/* Bandeira / Modalidade */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getBrandBadgeColor(row.bandeira)}`}>
                            {row.bandeira}
                          </span>
                          <span className="text-[var(--text-primary)] font-medium">{row.payment_method || 'Cartão'}</span>
                        </div>
                      </td>

                      {/* Bruto */}
                      <td className="py-3 px-4 text-right">
                        <AmountCell value={row.rede_bruto} tone="neutral" />
                      </td>

                      {/* Taxa MDR */}
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        - <AmountCell value={row.taxa_brl} tone="warning" />
                        <span className="text-[10px] text-[var(--text-tertiary)] block">
                          ({row.taxa_percent?.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Líquido */}
                      <td className="py-3 px-4 text-right">
                        <AmountCell value={row.rede_liquido} tone="success" className="font-bold" />
                      </td>

                      {/* OS Vinculada */}
                      <td className="py-3 px-4">
                        {hasOs ? (
                          <div className="flex flex-col">
                            <button
                              onClick={() => setSelectedOsData(row.os_data || { os_number: row.os_number.replace('OS #', ''), total_value: row.rede_bruto, paid_value: row.rede_liquido, status: 'paga' })}
                              className="font-semibold text-blue-400 hover:underline flex items-center gap-1 text-left cursor-pointer"
                            >
                              {row.os_number}
                              <ExternalLink size={11} />
                            </button>
                            {row.os_data && (
                              <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[180px]">
                                {row.os_data.client_name || row.os_data.vehicle || ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--text-tertiary)] italic">
                            Lote Rede Consolidado
                          </span>
                        )}
                      </td>

                      {/* Status no Banco */}
                      <td className="py-3 px-4 text-center">
                        {isSettled ? (
                          <Badge variant="success" dot className="text-[10px]">
                            LIQUIDADO NO BANCO
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot className="text-[10px]">
                            A COMPENSAR
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes da OS */}
      {selectedOsData && (
        <OsDetailModal
          isOpen={!!selectedOsData}
          onClose={() => setSelectedOsData(null)}
          os={selectedOsData}
          storeId={storeId}
        />
      )}
    </div>
  );
}
