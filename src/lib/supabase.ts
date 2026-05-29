import { createClient } from '@supabase/supabase-js';

// Fallback para strings vazias para não quebrar o build (SSR) do Lovable se as variáveis não estiverem injetadas no momento do build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes! O cliente Supabase usará valores falsos e as chamadas falharão. Verifique as configurações do Lovable.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Database Types ──────────────────────────────────────────────────────────

export type StoreRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager: string | null;
  mechanics: string[];
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ReconciliationRow = {
  id: string;
  store_id: string;
  date: string;
  os_total: number;
  financial_total: number;
  divergence: number;
  daily_cash: number;
  os_count: number;
  status: 'approved' | 'divergence' | 'pending';
  top_error: string | null;
  bot_run_id: string | null;
  processed_at: string | null;
  created_at: string;
};

export type AlertRow = {
  id: string;
  store_id: string | null;
  store_name: string;
  title: string;
  description: string | null;
  severity: 'critical' | 'warning' | 'info';
  amount: number | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  date: string;
  time: string | null;
  os_number: string | null;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  store_id: string | null;
  store_name: string | null;
  title: string;
  subtitle: string | null;
  amount: number;
  type: 'in' | 'out';
  icon_type: 'card' | 'bank' | 'cash' | 'alert' | null;
  payment_method: string | null;
  os_number: string | null;
  occurred_at: string;
  created_at: string;
};

export type PatioOSRow = {
  id: string;
  os_number: string;
  store_id: string | null;
  store_name: string | null;
  plate: string;
  total_value: number;
  paid_value: number;
  payment_method: string | null;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado';
  days_open: number;
  opened_at: string;
  closed_at: string | null;
  updated_at: string;
};

export type ReceivableRow = {
  id: string;
  store_id: string | null;
  store_name: string | null;
  type: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Boleto';
  value: number;
  status: 'pendente' | 'recebido' | 'vencido';
  date: string;
  due_date: string;
  received_at: string | null;
  created_at: string;
};

export type BotRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  stores_processed: number;
  errors: unknown[];
  screenshot_urls: string[];
  log_text: string | null;
  triggered_by: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'viewer';
  created_at: string;
};
