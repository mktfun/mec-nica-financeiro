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
      const isMissing = !rawLog;

      const ofxEntradas = isMissing ? null : Number(rawLog?.ofx_entradas_total ?? rawLog?.entradas_realizadas ?? 0);
      const concEntradas = isMissing ? null : Number(rawLog?.entradas_conciliadas ?? rawLog?.entradas_previsto ?? rawLog?.previsto_ofx ?? 0);
      const difEntradas = isMissing ? null : (rawLog?.dif_entradas !== undefined && rawLog?.dif_entradas !== null ? Number(rawLog.dif_entradas) : (rawLog?.diferenca_entradas !== undefined && rawLog?.diferenca_entradas !== null ? Number(rawLog.diferenca_entradas) : null));

      const ofxSaidas = isMissing ? null : Number(rawLog?.ofx_saidas_total ?? rawLog?.saidas_ofx ?? 0);
      const concSaidas = isMissing ? null : Number(rawLog?.contas_conciliadas ?? rawLog?.contas_loja_total ?? rawLog?.contas_loja ?? 0);
      const difSaidas = isMissing ? null : (rawLog?.dif_saidas !== undefined && rawLog?.dif_saidas !== null ? Number(rawLog.dif_saidas) : (rawLog?.diferenca_saidas !== undefined && rawLog?.diferenca_saidas !== null ? Number(rawLog.diferenca_saidas) : null));

      const difGeral = isMissing ? null : (rawLog?.diferenca !== undefined && rawLog?.diferenca !== null ? Number(rawLog.diferenca) : null);

      return {
        storeId: store.id,
        storeName: store.name,
        avatarUrl: store.avatar_url,
        saldoBanco: isMissing ? null : Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_ofx ?? 0),
        maquininha: isMissing ? null : Number(rawLog?.maquininha ?? rawLog?.rede_liquido ?? 0),
        pix: isMissing ? null : Number(rawLog?.pix ?? 0),
        naLojaOs: isMissing ? null : Number(rawLog?.na_loja_os ?? rawLog?.patio_os ?? 0),
        previsto: isMissing ? null : Number(rawLog?.previsto_ofx ?? concEntradas ?? 0),
        diferenca: difGeral,
        entradasRealizadas: ofxEntradas,
        entradasPrevisto: concEntradas,
        diferencaEntradas: difEntradas,
        saidasOfx: ofxSaidas,
        contasLoja: concSaidas,
        contasCentralizadas: isMissing ? null : Number(rawLog?.contas_centralizadas ?? 0),
        contasLocais: isMissing ? null : Number(rawLog?.contas_locais ?? 0),
        diferencaSaidas: difSaidas,
        dinheiroLoja: isMissing ? null : Number(rawLog?.dinheiro_loja ?? 0),
        ofxMaquininhas: isMissing ? null : Number(rawLog?.ofx_maquininhas ?? 0),
        pixTotal: isMissing ? null : Number(rawLog?.pix ?? 0),
        statusCompensacao: (rawLog?.status_compensacao || 'sem_movimento') as StoreCardData['statusCompensacao'],
        naoEntrouValor: isMissing ? null : Number(rawLog?.nao_entrou_valor ?? 0),
        status: (rawLog?.status || 'pending') as StoreCardData['status'],
        isMissingData: isMissing
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
