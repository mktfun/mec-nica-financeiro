import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function RedeVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const redeTxs = data?.redeVsOfx?.rede || [];
  const ofxTxs = data?.redeVsOfx?.ofx || [];
  
  const redeTotal = redeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const ofxTotal = ofxTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const delta = redeTotal - ofxTotal;

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
          <p className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Depositado Banco (Extrato OFX)</p>
          <p className="text-2xl font-display font-bold text-[var(--text-primary)]">
            R$ {ofxTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{ofxTxs.length} entradas importadas</p>
        </Card>
        <Card className={`p-4 border ${Math.abs(delta) < 1.0 ? 'bg-[var(--color-accent-teal)]/10 border-[var(--color-accent-teal)]/30' : 'bg-[var(--color-accent-danger)]/10 border-[var(--color-accent-danger)]/30'}`}>
          <p className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Status do Fechamento</p>
          <div className="flex items-center gap-2">
            {Math.abs(delta) < 1.0 ? (
              <CheckCircle2 size={24} className="text-[var(--color-accent-teal)]" />
            ) : (
              <AlertTriangle size={24} className="text-[var(--color-accent-danger)]" />
            )}
            <div>
              <p className={`text-xl font-display font-bold ${Math.abs(delta) < 1.0 ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'}`}>
                {Math.abs(delta) < 1.0 ? 'PAREADO' : (delta > 0 ? `FALTA R$ ${delta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `SOBRA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)]">
            <h4 className="font-medium text-sm">Transações (Maquininha/PIX)</h4>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {redeTxs.length === 0 && (
                  <tr><td className="p-4 text-center text-[var(--text-tertiary)]">Nenhuma transação</td></tr>
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

        <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
          <div className="bg-[var(--bg-panel)] p-3 border-b border-[var(--border-subtle)]">
            <h4 className="font-medium text-sm">Entradas (Banco OFX)</h4>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {ofxTxs.length === 0 && (
                  <tr><td className="p-4 text-center text-[var(--text-tertiary)]">Nenhuma entrada</td></tr>
                )}
                {ofxTxs.map((t, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-canvas)]/50">
                    <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[200px]" title={t.title}>{t.title}</td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--color-primary)]">R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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

