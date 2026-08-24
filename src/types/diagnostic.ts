export type DiagnosticSourceKey = 'patio' | 'banco' | 'dinheiro' | 'a_receber' | 'contas';

export interface DiagnosticSource {
  key: DiagnosticSourceKey;
  label: string;
  currentValue: number;
  historicAvg: number;
  deviation: number;           // currentValue - historicAvg
  deviationPct: number;        // deviation / historicAvg * 100 (0 se historicAvg = 0)
  status: 'ok' | 'warning' | 'alert';  // ok: |dev| <= 10%, warning: 10–30%, alert: > 30%
}

export interface DiagnosticResult {
  projectedCaixaAtual: number;
  historicCaixaAvg: number;
  projectedDiff: number;       // projectedCaixaAtual - historicCaixaAvg
  threshold: number;           // max(500, historicFaturamentoAvg * 0.02)
  isWithinThreshold: boolean;
  sources: DiagnosticSource[];
  mainSuspect: DiagnosticSource | null;
  hasManualInputMissing: boolean;  // true se dinheiro_mp === 0 E a_receber === 0
  snapshotDaysUsed: number;    // quantos dias de histórico foram encontrados (0–5)
}

export interface DiagnosticEngineInput {
  step: number | string;
  targetDate: string;
  isLoadingMissingOs: boolean;
  totalOfxIn: number;
  totalPatioEstoqueGlobal: number;
  manualDinheiroMp: number;
  manualAReceber: number;
  contasManual: number;
  jurosRedeTotal?: number;
}
