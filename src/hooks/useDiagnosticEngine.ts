import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DiagnosticEngineInput, DiagnosticResult, DiagnosticSource, DiagnosticSourceKey } from '../types/diagnostic';

interface SnapshotRow {
  date: string;
  saldo_bancario: number | null;
  dinheiro_mp: number | null;
  a_receber_manual: number | null;
  total_patio: number | null;
  contas_a_pagar: number | null;
  juros_rede: number | null;
  faturamento: number | null;
  caixa_atual: number | null;
}

function classifyDeviation(deviationPct: number, absDeviation: number): 'ok' | 'warning' | 'alert' {
  // Pequenas variações monetárias (abaixo de R$ 50) são consideradas ruído normal
  if (Math.abs(absDeviation) < 50) return 'ok';
  const absPct = Math.abs(deviationPct);
  if (absPct <= 10) return 'ok';
  if (absPct <= 30) return 'warning';
  return 'alert';
}

export function useDiagnosticEngine(inputs: DiagnosticEngineInput) {
  const {
    step,
    targetDate,
    isLoadingMissingOs,
    totalOfxIn,
    totalPatioEstoqueGlobal,
    manualDinheiroMp,
    manualAReceber,
    contasManual,
    jurosRedeTotal = 0
  } = inputs;

  const [history, setHistory] = useState<SnapshotRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!targetDate) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('daily_snapshots')
        .select('date, saldo_bancario, dinheiro_mp, a_receber_manual, total_patio, contas_a_pagar, juros_rede, faturamento, caixa_atual')
        .lt('date', targetDate)
        .order('date', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Aviso ao buscar histórico para diagnóstico:', error);
        setHistory([]);
      } else {
        setHistory((data as SnapshotRow[]) || []);
      }
    } catch (err) {
      console.warn('Erro na consulta de histórico para diagnóstico:', err);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [targetDate]);

  useEffect(() => {
    // Busca o histórico sempre que estiver no Step 3 de conferência
    const isStep3 = step === 3 || step === '3' || step === 3.5;
    if (isStep3) {
      fetchHistory();
    }
  }, [step, fetchHistory]);

  const diagnostic = useMemo<DiagnosticResult | null>(() => {
    const isStep3 = step === 3 || step === '3' || step === 3.5;
    if (!isStep3) return null;

    const daysCount = history.length;

    // Cálculo das médias históricas
    const sum = (field: keyof SnapshotRow) =>
      history.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);

    const historicPatioAvg = daysCount > 0 ? sum('total_patio') / daysCount : 0;
    const historicBancoAvg = daysCount > 0 ? sum('saldo_bancario') / daysCount : 0;
    const historicDinheiroAvg = daysCount > 0 ? sum('dinheiro_mp') / daysCount : 0;
    const historicAReceberAvg = daysCount > 0 ? sum('a_receber_manual') / daysCount : 0;
    const historicContasAvg = daysCount > 0 ? (sum('contas_a_pagar') + sum('juros_rede')) / daysCount : 0;
    const historicFaturamentoAvg = daysCount > 0 ? sum('faturamento') / daysCount : 0;
    const historicCaixaAvg = daysCount > 0 ? sum('caixa_atual') / daysCount : 0;

    // Valores calculados do fechamento atual
    const currentPatio = Number(totalPatioEstoqueGlobal) || 0;
    const currentBanco = Number(totalOfxIn) || 0;
    const currentDinheiro = Number(manualDinheiroMp) || 0;
    const currentAReceber = Number(manualAReceber) || 0;
    const currentContas = (Number(contasManual) || 0) + (Number(jurosRedeTotal) || 0);

    const projectedCaixaAtual = currentBanco + currentDinheiro + currentAReceber + currentPatio;
    const projectedDiff = daysCount > 0 ? projectedCaixaAtual - historicCaixaAvg : 0;

    // Threshold dinâmico: max(500, 2% do faturamento médio diário)
    const threshold = Math.max(500, (historicFaturamentoAvg > 0 ? historicFaturamentoAvg : 25000) * 0.02);
    const isWithinThreshold = daysCount === 0 || Math.abs(projectedDiff) <= threshold;

    const buildSource = (
      key: DiagnosticSourceKey,
      label: string,
      currentValue: number,
      historicAvg: number
    ): DiagnosticSource => {
      const deviation = currentValue - historicAvg;
      const deviationPct = historicAvg > 0 ? (deviation / historicAvg) * 100 : 0;
      const status = daysCount > 0 ? classifyDeviation(deviationPct, deviation) : 'ok';

      return {
        key,
        label,
        currentValue,
        historicAvg,
        deviation,
        deviationPct,
        status
      };
    };

    const sources: DiagnosticSource[] = [
      buildSource('patio', 'Pátio (OSs em Aberto)', currentPatio, historicPatioAvg),
      buildSource('banco', 'Banco (Extratos OFX)', currentBanco, historicBancoAvg),
      buildSource('dinheiro', 'Dinheiro / MP', currentDinheiro, historicDinheiroAvg),
      buildSource('a_receber', 'A Receber', currentAReceber, historicAReceberAvg),
      buildSource('contas', 'Contas a Pagar + Juros', currentContas, historicContasAvg)
    ];

    // Identificação da suspeita principal
    let mainSuspect: DiagnosticSource | null = null;
    if (!isWithinThreshold && daysCount > 0) {
      // Ordena pelas maiores divergências absolutas em R$
      const sortedByAbsDev = [...sources].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
      if (sortedByAbsDev[0] && Math.abs(sortedByAbsDev[0].deviation) >= 100) {
        mainSuspect = sortedByAbsDev[0];
      }
    }

    const hasManualInputMissing = currentDinheiro === 0 && currentAReceber === 0;

    return {
      projectedCaixaAtual,
      historicCaixaAvg,
      projectedDiff,
      threshold,
      isWithinThreshold,
      sources,
      mainSuspect,
      hasManualInputMissing,
      snapshotDaysUsed: daysCount
    };
  }, [
    step,
    history,
    totalOfxIn,
    totalPatioEstoqueGlobal,
    manualDinheiroMp,
    manualAReceber,
    contasManual,
    jurosRedeTotal
  ]);

  return {
    diagnostic,
    isLoading: isLoadingHistory || isLoadingMissingOs,
    refetchHistory: fetchHistory
  };
}
