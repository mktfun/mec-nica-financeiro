import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DailyReconciliationSummary } from './useBackendConciliacao';

export type InsightPillar = 'saldo_banco' | 'dinheiro_mp' | 'a_receber' | 'na_loja_os' | 'contas';
export type InsightSeverity = 'warning' | 'critical';

export interface ReconciliationObservation {
  id: string;
  pillar: InsightPillar;
  pillarLabel: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  delta?: number;
}

export interface PillarDot {
  severity: InsightSeverity;
  tooltip: string;
}

export interface ReconciliationInsights {
  dots: Record<InsightPillar, PillarDot | null>;
  observations: ReconciliationObservation[];
  totalObservations: number;
}

const PILLAR_LABELS: Record<InsightPillar, string> = {
  saldo_banco: 'Saldo Banco Itaú',
  dinheiro_mp: 'Dinheiro MP',
  a_receber: 'A Receber',
  na_loja_os: 'Na Loja OS',
  contas: 'Contas (Manual)'
};

export function useReconciliationInsights(
  date: string,
  summary?: DailyReconciliationSummary | null
) {
  return useQuery({
    queryKey: ['reconciliation-insights', date],
    queryFn: async (): Promise<ReconciliationInsights> => {
      const observations: ReconciliationObservation[] = [];
      const dots: Record<InsightPillar, PillarDot | null> = {
        saldo_banco: null,
        dinheiro_mp: null,
        a_receber: null,
        na_loja_os: null,
        contas: null
      };

      if (!date) {
        return { dots, observations, totalObservations: 0 };
      }

      try {
        // 1. Consulta transações OFX do dia
        const { data: ofxData } = await supabase
          .from('transactions')
          .select('id, store_id, title, amount, type, source, occurred_at')
          .eq('target_date', date);

        const ofxInTxs = (ofxData || []).filter(t => t.type === 'in' && t.source === 'ofx');
        const ofxOutTxs = (ofxData || []).filter(t => t.type === 'out' && t.source === 'ofx');
        const posTxs = (ofxData || []).filter(t => t.source === 'rede' || t.source === 'maquininha');

        // 2. Análise 1: Cartões a Compensar (Vendas de maquininha que não caíram no extrato do dia)
        const cartoesCompensarBackend = summary?.cartoes_a_compensar || 0;
        const totalPosAmount = posTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalOfxMaq = ofxInTxs
          .filter(t => (t.title || '').toUpperCase().includes('REDE') || (t.title || '').toUpperCase().includes('MAQUINA'))
          .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const deltaCartoes = cartoesCompensarBackend > 0 ? cartoesCompensarBackend : (totalPosAmount - totalOfxMaq);

        if (deltaCartoes > 10) {
          const formattedDelta = deltaCartoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          observations.push({
            id: 'cartoes-a-compensar',
            pillar: 'saldo_banco',
            pillarLabel: PILLAR_LABELS.saldo_banco,
            severity: 'warning',
            title: 'Maquininhas Não Entradas (A Compensar)',
            description: `${formattedDelta} em vendas de cartão somadas ao Saldo Caixa, pendentes de crédito no extrato bancário.`,
            delta: deltaCartoes
          });

          dots.saldo_banco = {
            severity: 'warning',
            tooltip: `Maquininhas a compensar: ${formattedDelta} somados no saldo consolidado.`
          };
        }

        // 3. Análise 2: PIX sem vínculo direto com OS
        const pixTxs = ofxInTxs.filter(t => (t.title || '').toUpperCase().includes('PIX'));
        if (pixTxs.length > 0) {
          const totalPix = pixTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
          // Se houver volume expressivo de PIX que possa ser de adiantamento/balcão
          if (totalPix > 100) {
            observations.push({
              id: 'pix-extrato',
              pillar: 'saldo_banco',
              pillarLabel: PILLAR_LABELS.saldo_banco,
              severity: 'warning',
              title: 'Entradas PIX no Extrato',
              description: `${pixTxs.length} transação(ões) PIX totalizando ${totalPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebidas no banco.`,
              delta: totalPix
            });
          }
        }

        // 4. Análise 3: Contas a Pagar vs Saídas OFX
        const totalOfxOut = ofxOutTxs.reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);
        const subtotalContas = (summary?.contas_manual || 0) + (summary?.juros_rede || 0);

        if (totalOfxOut > 0 && subtotalContas > 0 && Math.abs(totalOfxOut - subtotalContas) > 50) {
          const deltaContas = totalOfxOut - subtotalContas;
          const formattedOfxOut = totalOfxOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const formattedSubtotal = subtotalContas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

          observations.push({
            id: 'contas-vs-ofx',
            pillar: 'contas',
            pillarLabel: PILLAR_LABELS.contas,
            severity: 'warning',
            title: 'Diferença em Contas / Saídas',
            description: `Saídas no extrato OFX (${formattedOfxOut}) diferem das contas lançadas + juros (${formattedSubtotal}).`,
            delta: Math.abs(deltaContas)
          });

          dots.contas = {
            severity: 'warning',
            tooltip: `Saídas OFX (${formattedOfxOut}) vs Contas Lançadas (${formattedSubtotal}).`
          };
        }

        // 5. Análise 4: Pátio OS - Ordens ativas
        const { data: patioData } = await supabase
          .from('patio_os')
          .select('id, os_number, total_value, paid_value, status, opened_at')
          .lte('opened_at', `${date}T23:59:59`);

        if (patioData && patioData.length > 0) {
          const activeOrders = patioData.filter(o => 
            !['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(String(o.status || '').toLowerCase())
          );
          
          const osWithPartialPayments = activeOrders.filter(o => Number(o.paid_value) > 0);
          if (osWithPartialPayments.length > 0) {
            const totalPaidInOpen = osWithPartialPayments.reduce((acc, o) => acc + Number(o.paid_value || 0), 0);
            observations.push({
              id: 'patio-partial-payments',
              pillar: 'na_loja_os',
              pillarLabel: PILLAR_LABELS.na_loja_os,
              severity: 'warning',
              title: 'Pagamentos Parciais em OSs no Pátio',
              description: `${osWithPartialPayments.length} OS(s) no pátio possuem pagamentos parciais registrados (${totalPaidInOpen.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}), já abatidos do saldo pendente.`,
              delta: totalPaidInOpen
            });

            dots.na_loja_os = {
              severity: 'warning',
              tooltip: `${osWithPartialPayments.length} OSs com pagamentos parciais abatidos do pátio.`
            };
          }
        }
      } catch (err) {
        console.warn('[useReconciliationInsights] Erro ao analisar divergências discretas:', err);
      }

      return {
        dots,
        observations,
        totalObservations: observations.length
      };
    },
    enabled: !!date,
    staleTime: 1000 * 45 // 45s cache
  });
}
