import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FileSpreadsheet, CreditCard, Landmark } from 'lucide-react';
import { useRawOs, useRawRede, useRawOfx } from '@/hooks/useRawImportData';
import { RawOsTable } from './RawOsTable';
import { RawRedeTable } from './RawRedeTable';
import { RawOfxTable } from './RawOfxTable';

interface ImportSourceBadgesProps {
  storeId: string;
  targetDate: string;
}

type ModalType = 'none' | 'os' | 'rede' | 'ofx';

const MODAL_TITLES: Record<Exclude<ModalType, 'none'>, string> = {
  os: 'Raio-X: Pátio OS (Excel)',
  rede: 'Raio-X: Maquininha (Rede)',
  ofx: 'Raio-X: Extrato Bancário (OFX)',
};

export function ImportSourceBadges({ storeId, targetDate }: ImportSourceBadgesProps) {
  const [activeModal, setActiveModal] = useState<ModalType>('none');

  const { data: osData, isLoading: loadingOs } = useRawOs(storeId, targetDate, activeModal === 'os');
  const { data: redeData, isLoading: loadingRede } = useRawRede(storeId, targetDate, activeModal === 'rede');
  const { data: ofxData, isLoading: loadingOfx } = useRawOfx(storeId, targetDate, activeModal === 'ofx');

  const closeModal = () => setActiveModal('none');
  const modalTitle = activeModal !== 'none' ? MODAL_TITLES[activeModal] : '';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mr-1">Raio-X de Lotes:</p>

        <button
          onClick={() => setActiveModal('os')}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Badge
            variant="default"
            className="flex items-center gap-1.5 cursor-pointer bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/50"
          >
            <FileSpreadsheet size={12} /> Pátio OS
          </Badge>
        </button>

        <button
          onClick={() => setActiveModal('rede')}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Badge
            variant="default"
            className="flex items-center gap-1.5 cursor-pointer bg-amber-950/40 text-amber-400 border-amber-900/50 hover:bg-amber-900/50"
          >
            <CreditCard size={12} /> Maquininha
          </Badge>
        </button>

        <button
          onClick={() => setActiveModal('ofx')}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          <Badge
            variant="default"
            className="flex items-center gap-1.5 cursor-pointer bg-sky-950/40 text-sky-400 border-sky-900/50 hover:bg-sky-900/50"
          >
            <Landmark size={12} /> Banco OFX
          </Badge>
        </button>
      </div>

      <Modal
        isOpen={activeModal !== 'none'}
        onClose={closeModal}
        title={modalTitle}
      >
        {activeModal === 'os' && <RawOsTable data={osData ?? []} isLoading={loadingOs} />}
        {activeModal === 'rede' && <RawRedeTable data={redeData ?? []} isLoading={loadingRede} />}
        {activeModal === 'ofx' && <RawOfxTable data={ofxData} isLoading={loadingOfx} />}
      </Modal>
    </>
  );
}
