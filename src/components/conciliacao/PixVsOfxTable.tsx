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
      {/* 3 Cards Superiores (Dark UI Zinc-950) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">PIX (OS Sistema Pátio)</span>
            <QrCode size={18} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            R$ {totalOsPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{osPixList.length} vendas em PIX declaradas</p>
        </Card>

        <Card className="p-5 bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Entradas PIX (Extrato OFX)</span>
            <QrCode size={18} className="text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-sky-400 font-mono">
            R$ {totalOfxPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{ofxPixList.length} entradas no banco</p>
        </Card>

        <Card className={`p-5 rounded-2xl border ${isPareado ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'} shadow-xl`}>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Status PIX Sistema ↔ Banco</span>
          <div className="flex items-center gap-3">
            {isPareado ? (
              <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={28} className="text-amber-400 shrink-0" />
            )}
            <div>
              <p className={`text-xl font-bold font-mono ${isPareado ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPareado ? 'PAREADO (R$ 0,00)' : `DELTA R$ ${Math.abs(delta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
              <p className="text-xs text-zinc-300 mt-0.5">
                {isPareado ? 'Todos os PIXs do pátio caíram no banco' : 'Diferença entre OSs e Extrato PIX'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* CARDS AGRUPADOS DE PIX */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <QrCode size={20} className="text-sky-400" />
          Pareamento Agrupado de Entradas PIX
        </h3>
        <Badge variant="outline" className="text-xs font-mono text-zinc-400 border-zinc-700">
          {pixGroups.length} Lançamentos de PIX
        </Badge>
      </div>

      {pixGroups.length === 0 ? (
        <Card className="p-12 text-center text-zinc-500 flex flex-col items-center bg-[#050711] border border-zinc-800">
          <Info size={36} className="opacity-20 mb-3" />
          Nenhum lançamento de PIX no extrato bancário para esta data.
        </Card>
      ) : (
        <div className="space-y-4">
          {pixGroups.map((group: any, idx: number) => {
            const { ofxPix, matchedOs, isMatched } = group;

            return (
              <Card key={idx} className="p-5 bg-[#050711] border border-zinc-800 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Lado Banco */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Crédito PIX no Extrato OFX</span>
                    <h4 className="font-mono text-sm font-semibold text-white mt-0.5">{ofxPix.title}</h4>
                    <span className="font-mono text-base font-bold text-sky-400 block mt-1">
                      R$ {Number(ofxPix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block text-zinc-600">
                  <ChevronRight size={24} />
                </div>

                {/* Lado OS Vinculada */}
                <div className="flex-1 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">OS do Sistema Pátio</span>
                  
                  {matchedOs ? (
                    <div 
                      onClick={() => matchedOs.raw_os && setSelectedOsData(matchedOs.raw_os)}
                      className="cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-[var(--color-primary)]" />
                          <span className="font-bold text-sm text-white hover:underline">OS #{matchedOs.os_number}</span>
                        </div>
                        {matchedOs.client_name && (
                          <p className="text-xs text-zinc-400 mt-0.5">{matchedOs.client_name}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-emerald-400 block">
                          R$ {Number(matchedOs.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] mt-1">
                          <CheckCircle2 size={10} className="mr-1" /> PIX Pareado
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2">
                      <span className="text-xs text-zinc-500 italic">Sem OS correspondente com valor de R$ {Number(ofxPix.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
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

      {/* Modal de Detalhes da OS */}
      <OsDetailModal 
        isOpen={!!selectedOsData}
        onClose={() => setSelectedOsData(null)}
        osData={selectedOsData}
      />
    </div>
  );
}
