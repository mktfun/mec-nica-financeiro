import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, Info, QrCode, FileText, Unlink, Link2, Landmark } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { useManualMatch } from '@/hooks/useManualMatch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';
import { LinkOfxToOsModal } from './LinkOfxToOsModal';
import { toast } from 'sonner';

export function PixVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const { unlinkTransaction, loading: unlinking } = useManualMatch();
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);
  const [linkingOsData, setLinkingOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando extrato de PIX..." /></div>;
  }

  const osPixList = data?.pixVsOfx?.osPix || [];
  const pixGroups = data?.pixVsOfx?.pixGroups || [];

  // Helper para verificar se a OS teve o PIX correspondido no banco
  const getPixGroup = (osNumber: string) => {
    return pixGroups.find((group: any) => 
      group.osPix?.os_number === osNumber || group.matchedOs?.os_number === osNumber
    );
  };

  const totalOsPix = osPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalEntered = osPixList.filter(item => {
    const group = getPixGroup(item.os_number);
    return group?.isMatched;
  }).reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalNotEntered = totalOsPix - totalEntered;

  const handleUnlink = async (ofxPixId: string, osNumber: string) => {
    try {
      const res = await unlinkTransaction(ofxPixId, osNumber);
      if (res.success) {
        toast.success(`Vínculo da OS #${osNumber} desfeito! Transação retornou para Entradas Avulsas.`);
      } else {
        toast.error(`Falha ao desvincular: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao desvincular: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total PIX Pátio (Declarado)</span>
            <QrCode size={18} className="text-[var(--text-tertiary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Soma das OSs com pagamento em PIX</span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-teal)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PIX Confirmado no Banco</span>
            <CheckCircle2 size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-teal)] font-mono">
            R$ {totalEntered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Lançamentos identificados no extrato Itaú</span>
        </Card>

        <Card variant="elevated" className="p-5 border-[var(--color-accent-warning)]/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PIX Pendente de Confirmação</span>
            <AlertTriangle size={18} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-warning)] font-mono">
            R$ {totalNotEntered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block mt-1">Aguardando correspondente bancário</span>
        </Card>
      </div>

      {/* Tabela Extrato PIX */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-panel)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg flex items-center gap-2 text-[var(--color-primary)]">
              <QrCode size={20} />
              Extrato de PIX (Ordens de Serviço vs Extrato Bancário)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Conferência individual se cada PIX informado pelo cliente na OS realmente caiu na conta bancária.</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
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
                <tr className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] font-mono">
                  <th className="text-left py-3 px-4 font-medium">OS Vinculada</th>
                  <th className="text-left py-3 px-4 font-medium">Cliente / Veículo</th>
                  <th className="text-right py-3 px-4 font-medium">Valor PIX (OS)</th>
                  <th className="text-left py-3 px-4 font-medium">Lançamento OFX (Banco)</th>
                  <th className="text-center py-3 px-4 font-medium">Status no Banco</th>
                  <th className="text-center py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {osPixList.map((pixTx: any, idx: number) => {
                  const group = getPixGroup(pixTx.os_number);
                  const entrou = group?.isMatched;
                  const ofxPix = group?.ofxPix;

                  return (
                    <tr key={idx} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        <div 
                          className="flex items-center gap-1.5 cursor-pointer hover:underline text-[var(--color-primary)] font-bold"
                          onClick={() => setSelectedOsData({ ...pixTx, store_id: storeId, target_date: date })}
                        >
                          <FileText size={14} />
                          <span className="font-mono">OS #{pixTx.os_number}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">{pixTx.client_name || '-'}</span>
                          {pixTx.plate && <span className="text-[10px] text-[var(--text-tertiary)] font-mono">Placa: {pixTx.plate}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--text-primary)]">
                        R$ {Number(pixTx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-[var(--text-secondary)]">
                        {ofxPix ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <Landmark size={11} className="shrink-0" />
                              {ofxPix.title}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              R$ {Number(ofxPix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-tertiary)] italic">Aguardando correspondente no extrato</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entrou ? (
                          <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                            <CheckCircle2 size={12} className="mr-1" /> Entrou no Banco
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-mono">
                            <AlertTriangle size={12} className="mr-1" /> Pendente no Extrato
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entrou && ofxPix?.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={unlinking}
                            onClick={() => handleUnlink(ofxPix.id, pixTx.os_number)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-7 px-2 font-mono gap-1"
                            title="Desvincular (caso o pagamento tenha sido em dinheiro ou outra forma)"
                          >
                            <Unlink size={12} />
                            Desvincular
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="teal"
                            onClick={() => setLinkingOsData({
                              os_number: pixTx.os_number,
                              client_name: pixTx.client_name,
                              plate: pixTx.plate,
                              amount: Number(pixTx.amount || 0),
                              store_id: storeId,
                              target_date: date,
                            })}
                            className="text-xs h-7 px-2 font-mono gap-1"
                            title="Buscar lançamento bancário correspondente no extrato"
                          >
                            <Link2 size={12} />
                            Vincular Extrato
                          </Button>
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
      <OsDetailModal 
        isOpen={!!selectedOsData}
        osData={selectedOsData} 
        onClose={() => setSelectedOsData(null)} 
      />

      {/* Modal de Vínculo de Extrato para OS */}
      {linkingOsData && (
        <LinkOfxToOsModal
          isOpen={!!linkingOsData}
          onClose={() => setLinkingOsData(null)}
          osData={linkingOsData}
        />
      )}
    </div>
  );
}
