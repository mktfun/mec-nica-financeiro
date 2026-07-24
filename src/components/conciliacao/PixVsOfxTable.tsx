import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, QrCode } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function PixVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const osPixList = data?.pixVsOfx?.osPix || [];
  const ofxPixList = data?.pixVsOfx?.ofxPix || [];

  const totalOsPix = osPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalOfxPix = ofxPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const delta = totalOsPix - totalOfxPix;
  const isPareado = Math.abs(delta) < 1.0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">PIX / Transferências (OS Sistema)</p>
          <p className="text-2xl font-display font-bold text-[var(--text-primary)]">
            R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{osPixList.length} vendas em PIX no pátio</p>
        </Card>

        <Card className="p-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Créditos de PIX (Extrato Bancário OFX)</p>
          <p className="text-2xl font-display font-bold text-sky-400">
            R$ {totalOfxPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{ofxPixList.length} entradas de PIX no banco</p>
        </Card>

        <Card className={`p-4 border ${isPareado ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Status PIX Sistema ↔ Banco</p>
          <div className="flex items-center gap-2">
            {isPareado ? (
              <CheckCircle2 size={24} className="text-[var(--color-accent-teal)]" />
            ) : (
              <AlertTriangle size={24} className="text-amber-400" />
            )}
            <div>
              <p className={`text-xl font-display font-bold ${isPareado ? 'text-[var(--color-accent-teal)]' : 'text-amber-400'}`}>
                {isPareado ? 'PAREADO' : `DELTA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Tabela 1: OS PIX */}
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <QrCode size={16} className="text-[var(--color-primary)]" />
              OS Declaradas como PIX
            </h4>
            <Badge variant="outline" className="text-xs font-mono">
              Total R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-[10px] uppercase border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <th className="text-left py-2 px-3">OS / Cliente</th>
                  <th className="text-right py-2 px-3">Valor PIX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {osPixList.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-[var(--text-tertiary)]">Nenhum PIX declarado em OS nesta data</td></tr>
                )}
                {osPixList.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-xs text-[var(--text-primary)]">OS #{item.os_number}</span>
                      {item.client_name && <p className="text-[10px] text-[var(--text-tertiary)]">{item.client_name}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[var(--text-primary)]">
                      R$ {Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabela 2: Entradas OFX PIX */}
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <QrCode size={16} className="text-sky-400" />
              Entradas de PIX no Extrato OFX
            </h4>
            <Badge variant="outline" className="text-xs font-mono">
              Total R$ {totalOfxPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-[10px] uppercase border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <th className="text-left py-2 px-3">Descrição Extrato</th>
                  <th className="text-right py-2 px-3">Crédito Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {ofxPixList.length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-[var(--text-tertiary)]">Nenhum crédito de PIX no extrato bancário</td></tr>
                )}
                {ofxPixList.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2.5 px-3 text-xs text-[var(--text-secondary)] font-mono">
                      {item.title}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-sky-400">
                      R$ {Number(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
