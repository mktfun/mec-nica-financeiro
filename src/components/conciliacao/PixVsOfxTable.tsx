import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle, Info, QrCode, FileText, ChevronRight } from 'lucide-react';
import { useReconciliationViews } from '@/hooks/useConciliacao';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';

export function PixVsOfxTable({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useReconciliationViews(storeId, date);
  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando..." /></div>;
  }

  const osPixList = data?.pixVsOfx?.osPix || [];
  const ofxPixList = data?.pixVsOfx?.ofxPix || [];
  const pixGroups = data?.pixVsOfx?.pixGroups || [];

  const totalOsPix = osPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const totalOfxPix = ofxPixList.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0);
  const delta = totalOsPix - totalOfxPix;
  const isPareado = Math.abs(delta) < 1.0;

  return (
    <div className="space-y-8">
      {/* 3 Cards Superiores — usando Card nativo do sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PIX (OS Sistema Pátio)</span>
            <QrCode size={18} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">
            R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{osPixList.length} vendas em PIX declaradas</p>
        </Card>

        <Card variant="elevated" className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Entradas PIX (Extrato OFX)</span>
            <QrCode size={18} className="text-[var(--color-accent-light-blue)]" />
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-light-blue)] font-mono">
            R$ {totalOfxPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{ofxPixList.length} entradas no banco</p>
        </Card>

        <Card variant="elevated" className={`p-5 ${isPareado ? 'border-[var(--color-accent-teal)]/30' : 'border-[var(--color-accent-warning)]/30'}`}>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">Status PIX Sistema ↔ Banco</span>
          <div className="flex items-center gap-3">
            {isPareado ? (
              <CheckCircle2 size={28} className="text-[var(--color-accent-teal)] shrink-0" />
            ) : (
              <AlertTriangle size={28} className="text-[var(--color-accent-warning)] shrink-0" />
            )}
            <div>
              <p className={`text-xl font-bold font-mono ${isPareado ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-warning)]'}`}>
                {isPareado ? 'PAREADO (R$ 0,00)' : `DELTA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isPareado ? 'Todos os PIXs do pátio caíram no banco' : 'Diferença entre OSs e Extrato PIX'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Título */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
          <QrCode size={20} className="text-[var(--color-accent-light-blue)]" />
          Pareamento Agrupado de Entradas PIX
        </h3>
        <Badge variant="neutral" className="text-xs font-mono text-[var(--text-secondary)]">
          {pixGroups.length} Lançamentos de PIX
        </Badge>
      </div>

      {pixGroups.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center text-[var(--text-tertiary)] flex flex-col items-center">
          <Info size={36} className="opacity-20 mb-3" />
          Nenhum lançamento de PIX no extrato bancário para esta data.
        </Card>
      ) : (
        <div className="space-y-4">
          {pixGroups.map((group: any, idx: number) => {
            const { ofxPix, matchedOs, isMatched } = group;

            return (
              <Card key={idx} variant="elevated" className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Lado Banco OFX */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light-blue)]/10 text-[var(--color-accent-light-blue)] flex items-center justify-center shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-accent-light-blue)] uppercase tracking-widest">Crédito PIX no Extrato OFX</span>
                    <h4 className="font-mono text-sm font-semibold text-[var(--text-primary)] mt-0.5">{ofxPix.title}</h4>
                    <span className="font-mono text-base font-bold text-[var(--color-accent-light-blue)] block mt-1">
                      R$ {Number(ofxPix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block text-[var(--text-tertiary)]">
                  <ChevronRight size={24} />
                </div>

                {/* Lado OS Vinculada */}
                <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-strong)]">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">OS do Sistema Pátio</span>

                  {matchedOs ? (
                    <div
                      onClick={() => matchedOs.raw_os && setSelectedOsData(matchedOs.raw_os)}
                      className="cursor-pointer hover:bg-[var(--bg-canvas)] p-2 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[var(--color-primary)]" />
                          <span className="font-bold text-sm text-[var(--text-primary)] hover:underline">OS #{matchedOs.os_number}</span>
                        </div>
                        {matchedOs.client_name && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{matchedOs.client_name}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-[var(--color-accent-teal)] block">
                          R$ {Number(matchedOs.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge variant="success" className="text-[10px] mt-1">
                          <CheckCircle2 size={10} className="mr-1" /> PIX Pareado
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2">
                      <span className="text-xs text-[var(--text-tertiary)] italic">Sem OS correspondente com valor de R$ {Number(ofxPix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <Badge variant="warning" className="text-[10px]">
                        <AlertTriangle size={10} className="mr-1" /> Sem OS
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <OsDetailModal
        isOpen={!!selectedOsData}
        onClose={() => setSelectedOsData(null)}
        osData={selectedOsData}
      />
    </div>
  );
}
