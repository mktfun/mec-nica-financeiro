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

      const ofxEntradas = Number(rawLog?.entradas_realizadas ?? rawLog?.ofx_entradas_total ?? rawLog?.realizado_total ?? 0);
      const concEntradas = rawLog?.entradas_conciliadas !== undefined
        ? Number(rawLog.entradas_conciliadas)
        : rawLog?.entradas_previsto !== undefined
        ? Number(rawLog.entradas_previsto)
        : (rawLog?.ofx_maquininhas != null || rawLog?.pix_total != null || rawLog?.entradas_justificadas != null)
        ? ((Number(rawLog?.ofx_maquininhas) || 0) + (Number(rawLog?.pix_total) || 0) + (Number(rawLog?.entradas_justificadas) || 0))
        : Math.max(0, ofxEntradas - Number(rawLog?.entradas_orfas || 0));

      const orfasEntradas = rawLog?.diferenca_entradas !== undefined
        ? Number(rawLog.diferenca_entradas)
        : rawLog?.dif_entradas !== undefined
        ? Number(rawLog.dif_entradas)
        : rawLog?.entradas_orfas !== undefined
        ? Number(rawLog.entradas_orfas)
        : Math.max(0, ofxEntradas - concEntradas);

      const ofxSaidas = Number(rawLog?.saidas_ofx ?? rawLog?.ofx_saidas_total ?? 0);
      const concSaidas = rawLog?.contas_conciliadas !== undefined
        ? Number(rawLog.contas_conciliadas)
        : rawLog?.contas_loja !== undefined
        ? Number(rawLog.contas_loja)
        : rawLog?.contas_loja_total !== undefined
        ? (Number(rawLog.contas_loja_total) + (Number(rawLog?.saidas_justificadas) || 0))
        : Math.max(0, ofxSaidas - Number(rawLog?.saidas_orfas || 0));

      const orfasSaidas = rawLog?.diferenca_saidas !== undefined
        ? Number(rawLog.diferenca_saidas)
        : rawLog?.dif_saidas !== undefined
        ? Number(rawLog.dif_saidas)
        : rawLog?.saidas_orfas !== undefined
        ? Number(rawLog.saidas_orfas)
        : Math.max(0, ofxSaidas - concSaidas);

      return {
        storeId: store.id,
        storeName: store.name,
        avatarUrl: store.avatar_url,
        saldoBanco: isMissing ? null : Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_itau ?? rawLog?.saldo_banco_ofx ?? 0),
        maquininha: isMissing ? null : Number(rawLog?.maquininha ?? rawLog?.rede_liquido ?? 0),
        pix: isMissing ? null : Number(rawLog?.pix ?? rawLog?.pix_os ?? rawLog?.pix_total ?? 0),
        naLojaOs: isMissing ? null : Number(rawLog?.na_loja_os ?? rawLog?.patio_os ?? 0),
        previsto: isMissing ? null : Number(rawLog?.previsto_ofx ?? rawLog?.previsto ?? rawLog?.previsto_total ?? concEntradas),
        diferenca: isMissing ? null : Number(rawLog?.diferenca ?? rawLog?.diferenca_total ?? (orfasEntradas - orfasSaidas)),
        entradasRealizadas: isMissing ? null : ofxEntradas,
        entradasPrevisto: isMissing ? null : concEntradas,
        diferencaEntradas: isMissing ? null : orfasEntradas,
        saidasOfx: isMissing ? null : ofxSaidas,
        contasLoja: isMissing ? null : concSaidas,
        diferencaSaidas: isMissing ? null : orfasSaidas,
        dinheiroLoja: isMissing ? null : Number(rawLog?.dinheiro_loja ?? rawLog?.cofre_total ?? 0),
        ofxMaquininhas: isMissing ? null : Number(rawLog?.ofx_maquininhas ?? 0),
        pixTotal: isMissing ? null : Number(rawLog?.pix_total ?? 0),
        statusCompensacao: (
          rawLog?.status_compensacao ||
          (rawLog?.rede_status === 'batido' ? 'entrou' : rawLog?.rede_status === 'divergente' ? 'a_compensar' : rawLog?.rede_status) ||
          'sem_movimento'
        ) as StoreCardData['statusCompensacao'],
        naoEntrouValor: isMissing ? null : Number(rawLog?.nao_entrou_valor ?? Math.max(0, (Number(rawLog?.rede_liquido) || 0) - (Number(rawLog?.ofx_maquininhas) || 0))),
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
