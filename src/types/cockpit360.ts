export type SettlementStatusType = 
  | 'entrou' 
  | 'nao_entrou' 
  | 'a_compensar' 
  | 'divergente' 
  | 'sem_movimento' 
  | 'parcial';

export type CockpitGlobalStatus = 'conforme' | 'atencao' | 'critico';

export interface CockpitBrandDetail {
  brand: string;
  bruto: number;
  liquido: number;
  taxas: number;
  taxa_efetiva_pct?: number;
  entrou: number;
  nao_entrou: number;
  a_compensar: number;
  tx_count: number;
  status: SettlementStatusType;
}

export interface CockpitStoreDetail {
  store_id: string;
  store_name: string;
  rede_bruto: number;
  rede_liquido: number;
  rede_taxas: number;
  rede_devolucoes: number;
  ofx_maquininhas: number;
  entrou_valor: number;
  nao_entrou_valor: number;
  a_compensar_valor: number;
  divergencia_valor: number;
  total_transacoes: number;
  transacoes_com_os: number;
  transacoes_sem_os: number;
  status_compensacao: SettlementStatusType;
  brands: CockpitBrandDetail[];
  ofx_transacoes?: Array<{ id: string; amount: number; fitid: string; counterpart: string }>;
  total_vendas_rede?: number;
}

export interface CockpitFlaggedTransaction {
  id: string;
  store_id: string;
  store_name: string;
  brand: string;
  payment_method: string;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  settlement_status: SettlementStatusType;
  matched_os_number: string | null;
  occurred_at: string;
}

export interface CockpitKpis {
  total_rede_bruto: number;
  total_rede_liquido: number;
  total_rede_taxas: number;
  total_rede_devolucoes: number;
  total_ofx_maquininhas: number;
  total_entrou: number;
  total_nao_entrou: number;
  total_a_compensar: number;
  total_divergente: number;
  taxa_efetiva_global_pct: number;
  status_geral: CockpitGlobalStatus;
}

export interface Cockpit360DiagnosticResponse {
  target_date: string;
  kpis: CockpitKpis;
  by_brand: CockpitBrandDetail[];
  stores: CockpitStoreDetail[];
  flagged_transactions: CockpitFlaggedTransaction[];
  // Retrocompatibilidade estrita:
  total_rede_bruto: number;
  total_rede_liquido: number;
  total_rede_taxas: number;
  total_rede_devolucoes: number;
  total_devolucoes?: number;
  total_ofx_maquininhas: number;
  total_nao_entrou: number;
}

export interface CockpitFilterState {
  search: string;
  statusFilter: 'all' | SettlementStatusType;
  brandFilter: string;
  onlyDivergent: boolean;
}
