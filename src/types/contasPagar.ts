export interface IntercompanyEntity {
  id: string;
  name: string;
  type: 'socio' | 'filial' | 'holding' | 'parceiro';
  cpf_cnpj?: string;
  pix_keys: string[];
  store_id?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ExpenseCategoryRule {
  id: string;
  pattern: string;
  category: string;
  priority: number;
  created_at?: string;
}

export interface RawContaAPagarRow {
  emp: string;
  codigo: string;
  parc: string;
  clienteFornecedor: string;
  descricao: string;
  tipo: string;
  dtVecto: string;
  dtPrevisao: string;
  vlAPagar: number;
  status: string;
  dtPgto?: string;
  vlPago: number;
}

export interface ParsedContaAPagar {
  id?: string;
  external_code: string;
  installment: string;
  store_id: string;
  store_name: string;
  recipient_name: string;
  description: string;
  category: string;
  due_date: string;
  payment_date?: string;
  amount: number;
  status: 'PAG' | 'ABER' | 'CANCELADA';
  matched_os_number?: string;
  is_intercompany: boolean;
  intercompany_entity_id?: string;
}

export interface ContasAPagarParseResult {
  success: boolean;
  fileName: string;
  targetDate: string;
  totalBills: number;
  totalAmount: number;
  bills: ParsedContaAPagar[];
  storeTotals: Record<string, { storeName: string; total: number; count: number }>;
  categoryTotals: Record<string, { label: string; total: number; count: number }>;
  error?: string;
}
