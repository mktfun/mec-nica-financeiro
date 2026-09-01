import React, { useMemo } from 'react';
import { StoreCardModulo1 } from './StoreCardModulo1';
import { StoreRow } from '@/hooks/useStores';
import { DailyReconciliationSummary, StoreCardData } from '@/hooks/useBackendConciliacao';

interface ConciliacaoLojasViewProps {
  stores: StoreRow[];
  summary: DailyReconciliationSummary | null;
  selectedDate: string;
}

export const ConciliacaoLojasView: React.FC<ConciliacaoLojasViewProps> = ({
  stores,
  summary,
  selectedDate
}) => {
  const storesList = useMemo(() => {
    return summary?.stores || summary?.stores_detail || [];
  }, [summary]);

  const cardsData: StoreCardData[] = useMemo(() => {
    return stores.map(store => {
      const rawLog = storesList.find(l => l.store_id === store.id);
      
      const saldoBanco = Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_itau ?? rawLog?.saldo_banco_ofx ?? 0);
      const maquininha = Number(rawLog?.maquininha ?? rawLog?.rede_liquido ?? 0);
      const pix = Number(rawLog?.pix ?? rawLog?.pix_os ?? 0);
      const naLojaOs = Number(rawLog?.na_loja_os ?? rawLog?.patio_os ?? 0);
      const previsto = Number(rawLog?.previsto_ofx ?? (maquininha + pix));
      const diferenca = Number(rawLog?.diferenca ?? 0);
      const naoEntrouValor = Number(rawLog?.nao_entrou_valor ?? 0);
      const statusCompensacao = (rawLog?.status_compensacao || 'sem_movimento') as StoreCardData['statusCompensacao'];
      const status = (rawLog?.status || 'pending') as StoreCardData['status'];

      return {
        storeId: store.id,
        storeName: store.name,
        avatarUrl: store.avatar_url,
        saldoBanco,
        maquininha,
        pix,
        naLojaOs,
        previsto,
        diferenca,
        statusCompensacao,
        naoEntrouValor,
        status
      };
    });
  }, [stores, storesList]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            Fechamento por Filial
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            Acompanhamento individual de saldo em conta, cartões, PIX, ordens de serviço e divergências.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)]">
          {stores.length} lojas monitoradas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cardsData.map(data => (
          <StoreCardModulo1
            key={data.storeId}
            data={data}
            date={selectedDate}
          />
        ))}
      </div>
    </div>
  );
};
