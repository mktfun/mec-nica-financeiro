import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileSpreadsheet, CreditCard, Landmark, X } from 'lucide-react';
import { useRawOs, useRawRede, useRawOfx } from '@/hooks/useRawImportData';
import { RawOsTable } from './RawOsTable';
import { RawRedeTable } from './RawRedeTable';
import { RawOfxTable } from './RawOfxTable';

interface ImportSourceBadgesProps {
  storeId: string;
  targetDate: string;
}

type ModalType = 'none' | 'os' | 'rede' | 'ofx';

export function ImportSourceBadges({ storeId, targetDate }: ImportSourceBadgesProps) {
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  const { data: osData, isLoading: loadingOs } = useRawOs(storeId, targetDate, activeModal === 'os');
  const { data: redeData, isLoading: loadingRede } = useRawRede(storeId, targetDate, activeModal === 'rede');
  const { data: ofxData, isLoading: loadingOfx } = useRawOfx(storeId, targetDate, activeModal === 'ofx');

  const closeModal = () => setActiveModal('none');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mr-1">Raio-X de Lotes:</p>
        
        <button onClick={() => setActiveModal('os')} className="transition-transform hover:scale-105 active:scale-95">
          <Badge variant="default" className="flex items-center gap-1.5 cursor-pointer bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/50">
            <FileSpreadsheet size={12} /> Pátio OS (Excel)
          </Badge>
        </button>

        <button onClick={() => setActiveModal('rede')} className="transition-transform hover:scale-105 active:scale-95">
          <Badge variant="default" className="flex items-center gap-1.5 cursor-pointer bg-amber-950/40 text-amber-400 border-amber-900/50 hover:bg-amber-900/50">
            <CreditCard size={12} /> Maquininha (Rede)
          </Badge>
        </button>

        <button onClick={() => setActiveModal('ofx')} className="transition-transform hover:scale-105 active:scale-95">
          <Badge variant="default" className="flex items-center gap-1.5 cursor-pointer bg-sky-950/40 text-sky-400 border-sky-900/50 hover:bg-sky-900/50">
            <Landmark size={12} /> Banco (OFX)
          </Badge>
        </button>
      </div>

      <Modal
        isOpen={activeModal !== 'none'}
        onClose={closeModal}
        className="max-w-5xl w-full p-0 overflow-hidden bg-[var(--bg-canvas)] border border-[var(--border-subtle)]"
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            <div className="flex items-center gap-3">
              {activeModal === 'os' && <FileSpreadsheet className="text-emerald-500" size={20} />}
              {activeModal === 'rede' && <CreditCard className="text-amber-500" size={20} />}
              {activeModal === 'ofx' && <Landmark className="text-sky-500" size={20} />}
              
              <h2 className="text-lg font-display font-medium text-[var(--text-primary)]">
                {activeModal === 'os' && 'Inspeção Bruta: Arquivo Pátio OS'}
                {activeModal === 'rede' && 'Inspeção Bruta: Arquivo Maquininha (Rede)'}
                {activeModal === 'ofx' && 'Inspeção Bruta: Extrato Bancário (OFX)'}
              </h2>
            </div>
            <button onClick={closeModal} className="p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
            {activeModal === 'os' && <RawOsTable data={osData!} isLoading={loadingOs} />}
            {activeModal === 'rede' && <RawRedeTable data={redeData!} isLoading={loadingRede} />}
            {activeModal === 'ofx' && <RawOfxTable data={ofxData} isLoading={loadingOfx} />}
          </div>
        </div>
      </Modal>
    </>
  );
}
