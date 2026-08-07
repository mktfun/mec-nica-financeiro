import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, QrCode, FileText } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';

export function PixVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato de PIX..." /></div>;
  }

  const osPixList = data?.pixVsOfx?.osPix || [];
  const pixGroups = data?.pixVsOfx?.pixGroups || [];

  // Helper para verificar se a OS teve o PIX correspondido no banco
  const hasEntered = (osNumber: string) => {
    return pixGroups.some((group: any) => 
      group.isMatched && group.matchedOs?.os_number === osNumber
    );
  };

  const totalOsPix = osPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalEntered = osPixList.filter(item => hasEntered(item.os_number)).reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalNotEntered = totalOsPix - totalEntered;

  return (
    <div className="space-y-6">
      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total PIX Pátio</span>
            <QrCode size={18} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PIX Entrou no Banco</span>
            <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-teal)] font-mono">
            R$ {totalEntered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PIX Pendente</span>
            <AlertTriangle size={18} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-warning)] font-mono">
            R$ {totalNotEntered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {/* Tabela Extrato PIX */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
            <QrCode size={20} />
            Extrato de PIX (Ordens de Serviço)
          </h3>
          <Badge variant="outline" className="text-xs">
            {osPixList.length} Transações
          </Badge>
        </div>
        
        {osPixList.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma OS informou pagamento em PIX nesta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <th className="text-left py-3 px-4 font-medium">OS Vinculada</th>
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-right py-3 px-4 font-medium">Valor PIX (Declarado)</th>
                  <th className="text-center py-3 px-4 font-medium">Status OFX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {osPixList.map((pixTx: any, idx: number) => {
                  const entrou = hasEntered(pixTx.os_number);
                  return (
                    <tr key={idx} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer hover:underline text-[var(--color-primary)]"
                          onClick={() => pixTx.raw_os && setSelectedOsData(pixTx.raw_os)}
                        >
                          <FileText size={14} />
                          <span className="font-mono">OS #{pixTx.os_number}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {pixTx.client_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {Number(pixTx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {selectedOsData && (
        <OsDetailModal osData={selectedOsData} onClose={() => setSelectedOsData(null)} />
      )}
    </div>
  );
}
