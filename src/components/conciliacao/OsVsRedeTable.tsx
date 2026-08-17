import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, Info, ExternalLink, CreditCard, Percent } from 'lucide-react';
import { useReconciliationViews, useUpdateOsStatus } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';

export function OsVsRedeTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const updateOsStatus = useUpdateOsStatus();
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando transações de maquininha..." /></div>;
  }

  const rows = data?.osVsRede || [];

  const totalRedeBruto = rows.reduce((acc: number, r: any) => acc + Number(r.rede_bruto || 0), 0);
  const totalTaxas = rows.reduce((acc: number, r: any) => acc + Number(r.taxa_brl || 0), 0);
  const totalRedeLiquido = rows.reduce((acc: number, r: any) => acc + Number(r.rede_liquido || 0), 0);

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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Cartão (Rede Bruto)</span>
            <CreditCard size={18} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalRedeBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Soma das vendas passadas na maquininha</span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-warning)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Taxas MDR Retidas (Total)</span>
            <Percent size={18} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--color-accent-warning)]">
            -R$ {totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">
            Média efetiva: {totalRedeBruto > 0 ? ((totalTaxas / totalRedeBruto) * 100).toFixed(2) : '0,00'}%
          </span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Líquido Creditado</span>
            <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[var(--color-accent-teal)]">
            R$ {totalRedeLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Crédito efetivo a ser recebido no banco</span>
        </Card>
      </div>

      {/* Tabela de Vendas por Cartão */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
              <CreditCard size={20} />
              1. Cartão <span className="text-[var(--text-tertiary)] text-sm font-normal">(Maquininha → Extrato Bancário / OS)</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Conferência individual das vendas por cartão: valor bruto, taxa MDR retida e líquido creditado.</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {rows.length} Transações
          </Badge>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação de maquininha encontrada para esta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono">
                  <th className="text-left py-3 px-4 font-medium">Bandeira / Transação</th>
                  <th className="text-right py-3 px-4 font-medium">Rede (Bruto)</th>
                  <th className="text-right py-3 px-4 font-medium">Taxa MDR Retida</th>
                  <th className="text-right py-3 px-4 font-medium">Líquido (Creditado)</th>
                  <th className="text-center py-3 px-4 font-medium">Referência / OS</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasRealOs = !!row.is_real_os;
                  const isEntrou = row.status === 'PAREADO' || row.os_data?.status === 'ENTROU' || row.os_data?.status === 'finalizado';

                  return (
                    <tr
                      key={i}
                      onClick={() => hasRealOs && row.os_data && setSelectedOsData({ ...row.os_data, store_id: storeId, target_date: date })}
                      className={`transition-colors ${hasRealOs ? 'hover:bg-[var(--bg-surface)] cursor-pointer' : 'hover:bg-[var(--bg-canvas)]/50'}`}
                    >
                      {/* 1. Bandeira / Transação */}
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getBrandBadgeColor(row.bandeira)}`}>
                              {row.bandeira || 'Rede'}
                            </span>
                            <span className="text-xs font-semibold">{row.payment_method || row.maquininha_title}</span>
                          </div>
                          {row.installments > 1 && (
                            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                              Parcelado em {row.installments}x
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Valor Bruto */}
                      <td className="py-3.5 px-4 text-right font-mono text-[var(--text-primary)] font-bold">
                        R$ {Number(row.rede_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 3. Taxa MDR Retida */}
                      <td className="py-3.5 px-4 text-right font-mono text-[var(--color-accent-warning)] font-medium">
                        <div className="flex flex-col items-end">
                          <span>-R$ {Number(row.taxa_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] opacity-70">
                            ({Number(row.taxa_percent || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </td>

                      {/* 4. Valor Líquido */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        R$ {Number(row.rede_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 5. Referência / OS */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {hasRealOs ? (
                            <>
                              <button className="flex items-center gap-1 font-bold text-xs text-[var(--color-primary)] hover:underline">
                                <span>{row.os_number}</span>
                                <ExternalLink size={11} />
                              </button>
                              {row.os_data?.client_name && (
                                <span className="text-[10px] text-[var(--text-tertiary)] max-w-[160px] truncate">
                                  {row.os_data.client_name} {row.os_data.vehicle ? `(${row.os_data.vehicle})` : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-[var(--text-secondary)] font-mono">
                              {row.os_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isEntrou ? (
                          <Badge variant="success" className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30 text-[10px] px-2 py-0.5 font-mono">
                            <CheckCircle2 size={10} className="mr-1" /> Pareado / ENTROU
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono text-[var(--text-tertiary)] border-[var(--border-subtle)]">
                            Pendente Lote
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

      <OsDetailModal 
        isOpen={!!selectedOsData}
        osData={selectedOsData} 
        onClose={() => setSelectedOsData(null)} 
      />
    </div>
  );
}
