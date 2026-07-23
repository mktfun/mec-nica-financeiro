import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, ArrowUpRight } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const redeTxs = data?.redeVsOfx?.rede || [];
  const ofxAdquirenteTxs = data?.redeVsOfx?.ofx || [];
  const outrasOfxTxs = data?.redeVsOfx?.outrasOfx || [];

  const redeTotal = redeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const ofxAdquirenteTotal = ofxAdquirenteTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const delta = redeTotal - ofxAdquirenteTotal;
  const isPareado = Math.abs(delta) < 1.0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]">
          <p className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Processado Maquininhas (Líquido)</p>
          <p className="text-2xl font-display font-bold text-[var(--text-primary)]">
            R$ {redeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{redeTxs.length} transações importadas</p>
        </Card>

        <Card className="p-4 bg-[var(--bg-panel)] border-[var(--border-subtle)]">
          <p className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Depositado Banco (Adquirente OFX)</p>
          <p className="text-2xl font-display font-bold text-[var(--text-primary)]">
            R$ {ofxAdquirenteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{ofxAdquirenteTxs.length} depósitos de cartão</p>
        </Card>

        <Card className={`p-4 border ${isPareado ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30' : 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30'}`}>
          <p className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Status Maquininha ↔ Banco</p>
          <div className="flex items-center gap-2">
            {isPareado ? (
              <CheckCircle2 size={24} className="text-[var(--color-accent-teal)]" />
            ) : (
              <AlertTriangle size={24} className="text-[var(--color-accent-danger)]" />
            )}
            <div>
              <p className={`text-xl font-display font-bold ${isPareado ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                {isPareado ? 'PAREADO' : (delta > 0 ? `FALTA R$ ${delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `DIVERGÊNCIA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Maquininha Líquido */}
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-medium text-sm">Transações (Maquininha Líquido)</h4>
            <Badge variant="outline" className="text-xs font-mono">
              Total R$ {redeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {redeTxs.length === 0 && (
                  <tr><td className="p-4 text-center text-[var(--text-tertiary)]">Nenhuma transação da maquininha</td></tr>
                )}
                {redeTxs.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2 px-3 text-[var(--text-secondary)]">{t.title}</td>
                    <td className="py-2 px-3 text-right font-medium">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Depósitos no Banco (Adquirente) */}
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-1.5">
              Depósitos de Cartão (Extrato OFX)
            </h4>
            <Badge variant="outline" className="text-xs font-mono">
              Total R$ {ofxAdquirenteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {ofxAdquirenteTxs.length === 0 && (
                  <tr><td className="p-4 text-center text-[var(--text-tertiary)]">Nenhum depósito de adquirente no extrato</td></tr>
                )}
                {ofxAdquirenteTxs.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[200px]" title={t.title}>{t.title}</td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--color-accent-teal)]">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Outras Entradas no Banco (PIX / Transferências) */}
      {outrasOfxTxs.length > 0 && (
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)] bg-[var(--bg-panel)]/50">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-medium text-sm text-[var(--text-tertiary)] flex items-center gap-2">
              <ArrowUpRight size={16} className="text-[var(--text-tertiary)]" />
              Outros Lançamentos no Extrato Bancário (PIX / Transferências Diretas)
            </h4>
            <Badge variant="outline" className="text-xs text-[var(--text-tertiary)] font-mono">
              {outrasOfxTxs.length} lançamentos (R$ {outrasOfxTxs.reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </Badge>
          </div>
          <div className="overflow-x-auto max-h-[200px]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-tertiary)]">
                {outrasOfxTxs.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2 px-3 truncate max-w-[300px]" title={t.title}>{t.title}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
