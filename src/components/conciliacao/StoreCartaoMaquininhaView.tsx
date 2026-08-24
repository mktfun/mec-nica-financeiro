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
      {/* 4 Cards de Resumo da Maquininha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bruto */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Cartão (Bruto)</span>
            <CreditCard size={16} className="text-zinc-400" />
          </div>
          <p className="text-xl font-bold text-zinc-100 font-mono">
            {formatCurrency(totalRedeBruto)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Vendas passadas na maquininha</span>
        </Card>

        {/* Card 2: Taxas MDR */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-amber-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Taxas MDR Retidas</span>
            <Percent size={16} className="text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400">
            - {formatCurrency(totalTaxas)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            Média efetiva: {totalRedeBruto > 0 ? ((totalTaxas / totalRedeBruto) * 100).toFixed(2) : '0,00'}%
          </span>
        </Card>

        {/* Card 3: Líquido Apurado */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800 border-l-2 border-l-emerald-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Líquido das Vendas</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalRedeLiquido)}
          </p>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Crédito calculado das vendas</span>
        </Card>

        {/* Card 4: Creditado no Banco */}
        <Card variant="elevated" className="p-4 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Creditado no Extrato</span>
            <Landmark size={16} className="text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xl font-bold font-mono text-blue-400">
              {formatCurrency(totalCreditadoBanco)}
            </p>
            {isSettled ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ENTROU
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                A COMPENSAR
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {valorACompensar > 0 ? `+ ${formatCurrency(valorACompensar)} a compensar` : 'Lote liquidado no banco'}
          </span>
        </Card>
      </div>

      {/* Tabela Unificada de Vendas por Cartão */}
      <Card className="p-0 overflow-hidden border-zinc-800 bg-zinc-950">
        <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-zinc-100">
              <CreditCard size={18} className="text-emerald-400" />
              1. Vendas em Cartão (Maquininha → Extrato Bancário)
            </h3>
            <p className="text-xs text-zinc-400">
              Conferência individual das vendas: bandeira, valor bruto, taxa MDR retida, OS vinculada e status no extrato bancário.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-zinc-700 text-zinc-300">
            {rows.length} Transações
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
              <thead>
                <tr className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60 font-mono">
                  <th className="text-left py-3 px-4 font-medium">Bandeira / Modalidade</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-medium">Taxa MDR Retida</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Líquido</th>
                  <th className="text-left py-3 px-4 font-medium">Referência / OS</th>
                  <th className="text-center py-3 px-4 font-medium">Status no Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {rows.map((row: any, i: number) => {
                  const hasOs = !!row.os_data || (row.os_number && row.os_number !== 'Lote REDE Consolidado');

                  return (
                    <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Bandeira / Modalidade */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getBrandBadgeColor(row.bandeira)}`}>
                            {row.bandeira}
                          </span>
                          <span className="text-zinc-300 font-medium">{row.payment_method || 'Cartão'}</span>
                        </div>
                      </td>

                      {/* Bruto */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-200">
                        {formatCurrency(row.rede_bruto)}
                      </td>

                      {/* Taxa MDR */}
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        - {formatCurrency(row.taxa_brl)}
                        <span className="text-[10px] text-zinc-500 block">
                          ({row.taxa_percent?.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Líquido */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(row.rede_liquido)}
                      </td>

                      {/* OS Vinculada */}
                      <td className="py-3 px-4">
                        {hasOs ? (
                          <div className="flex flex-col">
                            <button
                              onClick={() => setSelectedOsData(row.os_data || { os_number: row.os_number.replace('OS #', ''), total_value: row.rede_bruto, paid_value: row.rede_liquido, status: 'paga' })}
                              className="font-semibold text-blue-400 hover:underline flex items-center gap-1 text-left"
                            >
                              {row.os_number}
                              <ExternalLink size={11} />
                            </button>
                            {row.os_data && (
                              <span className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                                {row.os_data.client_name || row.os_data.vehicle || ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">
                            Lote Rede Consolidado
                          </span>
                        )}
                      </td>

                      {/* Status no Banco */}
                      <td className="py-3 px-4 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={11} />
                            LIQUIDADO NO BANCO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <AlertTriangle size={11} />
                            A COMPENSAR
                          </span>
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
