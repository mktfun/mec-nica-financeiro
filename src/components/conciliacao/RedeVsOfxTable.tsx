import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, CreditCard, Info } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato de maquininhas..." /></div>;
  }

  const osVsRede = data?.osVsRede || [];
  const depositGroups = data?.redeVsOfx?.depositGroups || [];

  // Helper para verificar se a transaçÁo entrou no OFX
  const hasEntered = (txId: string) => {
    return depositGroups.some((group: any) => 
      group.childRedeTxs?.some((child: any) => child.id === txId)
    );
  };

  const totalBruto = osVsRede.reduce((acc: number, t: any) => acc + Number(t.rede_bruto || 0), 0);
  const totalLiquido = osVsRede.reduce((acc: number, t: any) => acc + Number(t.rede_liquido || 0), 0);
  const totalTaxas = osVsRede.reduce((acc: number, t: any) => acc + Number(t.taxa_brl || 0), 0);

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
        </Card>

        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Taxas Descontadas</span>
            <AlertTriangle size={18} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-warning)] font-mono">
            R$ {totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Líquido Maquininha</span>
            <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-teal)] font-mono">
            R$ {totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Tabela Extrato Maquininha */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
            <CreditCard size={20} />
            Extrato de Maquininhas
          </h3>
          <Badge variant="outline" className="text-xs">
            {osVsRede.length} Transações
          </Badge>
        </div>
        
        {osVsRede.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transaçÁo de maquininha encontrada nesta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <th className="text-left py-3 px-4 font-medium">OS Vinculada</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-medium">Taxa (%)</th>
                  <th className="text-right py-3 px-4 font-medium">Taxa (R$)</th>
                  <th className="text-right py-3 px-4 font-medium">Valor Líquido</th>
                  <th className="text-center py-3 px-4 font-medium">Status OFX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {osVsRede.map((tx: any) => {
                  const entrou = hasEntered(tx.id);
                  return (
                    <tr key={tx.id} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {tx.os_number && tx.os_number !== 'NÁo Localizada' ? (
                          <span className="font-mono text-[var(--color-primary)]">OS #{tx.os_number}</span>
                        ) : (
                          <span className="text-[var(--text-tertiary)] italic">Sem OS</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        R$ {Number(tx.rede_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--color-accent-warning)]">
                        {Number(tx.taxa_percent || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--color-accent-warning)]">
                        R$ {Number(tx.taxa_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {Number(tx.rede_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entrou ? (
                          <Badge variant="success" className="bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/30">
                            <CheckCircle2 size={12} className="mr-1" /> Entrou
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)] border-[var(--color-accent-danger)]/30">
                            <AlertTriangle size={12} className="mr-1" /> NÁo Entrou
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
