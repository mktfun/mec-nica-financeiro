export type StoreStatus = 'approved' | 'divergence' | 'pending';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface MockStore {
  id: string;
  name: string;
  osTotal: number;
  financialTotal: number;
  divergence: number;
  status: StoreStatus;
  dailyCash: number;
  osCount: number;
  topError?: string;
  avatarUrl: string;
}

export interface MockAlert {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  amount?: number;
  time: string;
}

export interface CashFlowData {
  date: string;
  in: number;
  out: number;
}

export interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'in' | 'out';
  time: string;
  iconType: 'card' | 'bank' | 'cash' | 'alert';
}

export const mockStores: MockStore[] = [
  {
    id: 'st-01',
    name: 'Loja Centro',
    osTotal: 45200.0,
    financialTotal: 45200.0,
    divergence: 0,
    status: 'approved',
    dailyCash: 1250.0,
    osCount: 34,
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LC&backgroundColor=000000',
  },
  {
    id: 'st-02',
    name: 'Oficina Sul',
    osTotal: 32150.5,
    financialTotal: 31000.0,
    divergence: 1150.5,
    status: 'divergence',
    dailyCash: 800.0,
    osCount: 22,
    topError: 'Pix não identificado',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=OS&backgroundColor=16181a',
  },
  {
    id: 'st-03',
    name: 'Mecânica Norte',
    osTotal: 28400.0,
    financialTotal: 28400.0,
    divergence: 0,
    status: 'approved',
    dailyCash: 420.0,
    osCount: 19,
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=MN&backgroundColor=000000',
  },
  {
    id: 'st-04',
    name: 'Express Leste',
    osTotal: 15600.0,
    financialTotal: 15600.0,
    divergence: 0,
    status: 'approved',
    dailyCash: 0,
    osCount: 12,
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=EL&backgroundColor=000000',
  },
  {
    id: 'st-05',
    name: 'Shopping Auto',
    osTotal: 52300.0,
    financialTotal: 53000.0,
    divergence: -700.0,
    status: 'divergence',
    dailyCash: 2100.0,
    osCount: 45,
    topError: 'Sobra de Caixa Múltipla',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SA&backgroundColor=16181a',
  },
];

export const mockAlerts: MockAlert[] = [
  {
    id: 'al-01',
    storeId: 'st-02',
    storeName: 'Oficina Sul',
    title: 'Divergência de Pix',
    description: '3 transferências Pix não constam no extrato bancário do dia.',
    severity: 'critical',
    amount: 1150.5,
    time: '10:23',
  },
  {
    id: 'al-02',
    storeId: 'st-05',
    storeName: 'Shopping Auto',
    title: 'Sobra de Caixa Registrada',
    description: 'O fechamento de maquininha foi menor que o apurado no sistema.',
    severity: 'warning',
    amount: 700.0,
    time: '09:45',
  },
  {
    id: 'al-03',
    storeId: 'st-01',
    storeName: 'Loja Centro',
    title: 'Conciliação Concluída',
    description: 'Todos os 34 registros do dia bateram perfeitamente.',
    severity: 'info',
    time: '08:12',
  },
];

export const mockCashFlow: CashFlowData[] = Array.from({ length: 30 }).map((_, i) => ({
  date: `Dia ${i + 1}`,
  in: Math.floor(Math.random() * 50000) + 10000,
  out: Math.floor(Math.random() * 30000) + 5000,
}));

export const mockTransactions: Transaction[] = [
  { id: 'tx-1', title: 'Pagamento de Fornecedor', subtitle: 'AutoPeças Silva', amount: 4500.0, type: 'out', time: 'Hoje, 14:30', iconType: 'bank' },
  { id: 'tx-2', title: 'Recebimento de Lote', subtitle: 'Loja Centro', amount: 12500.0, type: 'in', time: 'Hoje, 12:15', iconType: 'card' },
  { id: 'tx-3', title: 'Sangria de Caixa', subtitle: 'Oficina Sul', amount: 800.0, type: 'in', time: 'Ontem, 18:45', iconType: 'cash' },
  { id: 'tx-4', title: 'Divergência Automática', subtitle: 'Ajuste Sistêmico', amount: 1150.5, type: 'out', time: 'Ontem, 17:20', iconType: 'alert' },
];

export const summaryData = {
  totalIn: mockStores.reduce((acc, s) => acc + s.financialTotal, 0),
  totalOut: 125400.0,
  totalDivergences: mockStores.reduce((acc, s) => acc + Math.abs(s.divergence), 0),
  motorStatus: 'processing' as const,
};
