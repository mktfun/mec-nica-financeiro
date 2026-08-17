import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, CreditCard, Info, Landmark } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato de maquininhas..." /></div>;
  }

  const osVsRede = data?.osVsRede || [];
  const depositGroups = data?.redeVsOfx?.depositGroups || [];
  const isSettled = data?.redeVsOfx?.isSettled;

  // Helper para verificar se a transação entrou no OFX
  const hasEntered = (txId: string) => {
    if (isSettled) return true;
    return depositGroups.some((group: any) => 
      group.childRedeTxs?.some((child: any) => child.id === txId)
    );
  };

  const totalBruto = osVsRede.reduce((acc: number, t: any) => acc + Number(t.rede_bruto || 0), 0);
  const totalLiquido = osVsRede.reduce((acc: number, t: any) => acc + Number(t.rede_liquido || 0), 0);
  const totalTaxas = osVsRede.reduce((acc: number, t: any) => acc + Number(t.taxa_brl || 0), 0);

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
      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Bruto Maquininha</span>
            <CreditCard size={18} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Soma das vendas da maquininha</span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-warning)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Taxas Descontadas (MDR)</span>
            <AlertTriangle size={18} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-warning)] font-mono">
            -R$ {totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">
            Média: {totalBruto > 0 ? ((totalTaxas / totalBruto) * 100).toFixed(2) : '0,00'}%
          </span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Líquido Creditado</span>
            <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-teal)] font-mono">
            R$ {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Crédito efetivo da adquirente no banco</span>
        </Card>
      </div>

      {/* Tabela Extrato Maquininha */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
              <CreditCard size={20} />
              2. Maquininha → Extrato Bancário (OFX)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Batimento do lote de vendas líquidas das maquininhas contra os depósitos de adquirente no Itaú.</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {osVsRede.length} Transações
          </Badge>
        </div>
        
        {osVsRede.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação de maquininha encontrada nesta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono">
                  <th className="text-left py-3 px-4 font-medium">Bandeira / Modalidade</th>
                  <th className="text-left py-3 px-4 font-medium">Referência / OS</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-medium">Taxa MDR</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Líquido</th>
                  <th className="text-center py-3 px-4 font-medium">Liquidação no Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {osVsRede.map((tx: any) => {
                  const entrou = hasEntered(tx.id);
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getBrandBadgeColor(tx.bandeira)}`}>
                            {tx.bandeira || 'Rede'}
                          </span>
                          <span className="text-xs font-medium">{tx.payment_method || tx.maquininha_title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-[var(--text-secondary)]">
                        {tx.os_number && tx.os_number !== 'Não Localizada' ? (
                          <span className="font-bold text-[var(--color-primary)]">{tx.os_number}</span>
                        ) : (
                          <span className="text-[var(--text-tertiary)] italic">Lote Consolidado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {Number(tx.rede_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--color-accent-warning)]">
                        -R$ {Number(tx.taxa_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({Number(tx.taxa_percent || 0).toFixed(1)}%)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        R$ {Number(tx.rede_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entrou ? (
                          <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                            <CheckCircle2 size={12} className="mr-1" /> Liquidado no Banco
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-mono">
                            <AlertTriangle size={12} className="mr-1" /> Pendente de Crédito
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
    </div>
  );
}
