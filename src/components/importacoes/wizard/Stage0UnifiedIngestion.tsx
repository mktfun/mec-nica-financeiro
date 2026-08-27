import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UploadCloud, FileSpreadsheet, FileText, Calendar, Store, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStores } from '@/hooks/useStores';

interface Stage0UnifiedIngestionProps {
  targetDate: string;
  onDateChange: (date: string) => void;
  onProceed: (files: { ofx: File[]; rede: File[]; os: File[]; contas: File[] }, odometer: Record<string, number>) => void;
}

export function Stage0UnifiedIngestion({ targetDate, onDateChange, onProceed }: Stage0UnifiedIngestionProps) {
  const { data: stores = [] } = useStores();
  const [ofxFiles, setOfxFiles] = useState<File[]>([]);
  const [redeFiles, setRedeFiles] = useState<File[]>([]);
  const [osFiles, setOsFiles] = useState<File[]>([]);
  const [contasFiles, setContasFiles] = useState<File[]>([]);
  const [odometer, setOdometer] = useState<Record<string, number>>({});
  const [showOdometer, setShowOdometer] = useState(false);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = Array.from(e.dataTransfer.files);
    } else if (e.target.files) {
      files = Array.from(e.target.files);
    }

    files.forEach(f => {
      const name = f.name.toLowerCase();
      if (name.endsWith('.ofx')) {
        setOfxFiles(prev => [...prev.filter(p => p.name !== f.name), f]);
      } else if (name.includes('rede') || name.includes('vendas')) {
        setRedeFiles(prev => [...prev.filter(p => p.name !== f.name), f]);
      } else if (name.includes('os') || name.includes('patio') || name.includes('relatorioos')) {
        setOsFiles(prev => [...prev.filter(p => p.name !== f.name), f]);
      } else if (name.includes('contas') || name.includes('pagar')) {
        setContasFiles(prev => [...prev.filter(p => p.name !== f.name), f]);
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        // Fallback inteligente
        setOsFiles(prev => [...prev.filter(p => p.name !== f.name), f]);
      }
    });
  };

  const totalFiles = ofxFiles.length + redeFiles.length + osFiles.length + contasFiles.length;

  const handleStart = () => {
    onProceed({ ofx: ofxFiles, rede: redeFiles, os: osFiles, contas: contasFiles }, odometer);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2.5">
              <UploadCloud className="text-emerald-400" size={24} />
              Ingestão Global Diária — Upload Unificado & Inputs
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Suba todos os arquivos do dia de uma só vez (OFX Itaú, Vendas Rede, OSs do Pátio e Contas a Pagar). O sistema realizará o cruzamento preliminar antes de abrir as decisões guiadas.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
            <Calendar size={16} className="text-zinc-400" />
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Data de Fechamento</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Unified Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-zinc-900/50 rounded-2xl p-8 text-center transition-all cursor-pointer relative group"
      >
        <input
          type="file"
          multiple
          onChange={handleFileDrop}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors shadow-inner">
            <UploadCloud size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Arraste todos os arquivos do dia aqui ou clique para selecionar</p>
            <p className="text-xs text-zinc-500 mt-1">Extratos .OFX das 10 filiais, Relatórios Rede (.xlsx), OSs Pátio (.xlsx/.csv) e Contas a Pagar (.xls)</p>
          </div>
        </div>
      </div>

      {/* Arquivos Carregados por Categoria */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-cyan-500 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Extratos OFX (Itaú)</span>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{ofxFiles.length} <span className="text-xs font-normal text-zinc-500">arquivos</span></p>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {ofxFiles.map((f, i) => <p key={i} className="text-[10px] text-zinc-400 truncate font-mono">• {f.name}</p>)}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Vendas Rede</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{redeFiles.length} <span className="text-xs font-normal text-zinc-500">arquivos</span></p>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {redeFiles.map((f, i) => <p key={i} className="text-[10px] text-zinc-400 truncate font-mono">• {f.name}</p>)}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">OSs do Pátio</span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">{osFiles.length} <span className="text-xs font-normal text-zinc-500">arquivos</span></p>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {osFiles.map((f, i) => <p key={i} className="text-[10px] text-zinc-400 truncate font-mono">• {f.name}</p>)}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Contas a Pagar</span>
          <p className="text-xl font-bold font-mono text-rose-400 mt-1">{contasFiles.length} <span className="text-xs font-normal text-zinc-500">arquivos</span></p>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {contasFiles.map((f, i) => <p key={i} className="text-[10px] text-zinc-400 truncate font-mono">• {f.name}</p>)}
          </div>
        </Card>
      </div>

      {/* Accordion de Ajustes Manuais Iniciais (Odômetro por Loja) */}
      <Card className="p-5 bg-zinc-900/40 border-zinc-800">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowOdometer(!showOdometer)}>
          <div className="flex items-center gap-2">
            <Store size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Ajustes Manuais Preliminares (Odômetro / Faturamento por Filial)</h3>
            <Badge variant="neutral" className="text-[10px] font-mono">{stores.length} lojas</Badge>
          </div>
          <span className="text-xs text-emerald-400 font-semibold">{showOdometer ? 'Recolher ▲' : 'Expandir e Ajustar ▼'}</span>
        </div>

        {showOdometer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
            {stores.map(store => (
              <div key={store.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-zinc-300 truncate">{store.name}</span>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  value={odometer[store.id] || ''}
                  onChange={(e) => setOdometer({ ...odometer, [store.id]: parseFloat(e.target.value) || 0 })}
                  className="w-28 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2.5 py-1 text-xs font-mono text-right text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Botão de Avançar para o Wizard */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleStart}
          disabled={totalFiles === 0}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Processar Ingestão & Abrir Resolução</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
