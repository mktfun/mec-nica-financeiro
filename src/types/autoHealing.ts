export interface AutoHealingStep {
  step: string;
  status: 'conforme' | 'auto_ajustado' | 'investigando' | 'divergente' | 'ignorado';
  details: string;
  store_id?: string;
  amount?: number;
  delta?: number;
  delta_final?: number;
}

export interface AutonomousReconciliationResult {
  audit_log_id: string;
  target_date: string;
  initial_delta: number;
  final_delta: number;
  is_conforme: boolean;
  iterations_count: number;
  steps_executed: AutoHealingStep[];
  summary: Record<string, any>;
}
