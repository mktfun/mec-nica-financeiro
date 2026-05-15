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
  manager: string;
  mechanics: string[];
  address: string;
  phone: string;
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
  storeName?: string;
  osNumber?: string;
  paymentMethod?: string;
}

export interface MockPatioOS {
  id: string;
  osNumber: string;
  storeId: string;
  storeName: string;
  plate: string;
  totalValue: number;
  paidValue: number;
  paymentMethod: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado';
  daysOpen: number;
}

export interface MockReceivable {
  id: string;
  date: string;
  storeName: string;
  type: 'Cartão Crédito' | 'Cartão Débito' | 'PIX' | 'Boleto';
  value: number;
  status: 'pendente' | 'recebido' | 'vencido';
  dueDate: string;
}

export interface MockConciliacaoDetalhe {
  storeId: string;
  storeName: string;
  entradas: number;
  dinheiro: number;
  contas: number;
  resultado: number;
  status: 'OK' | 'Divergência';
}

export interface MockConciliacaoResumo {
  cartaoCredito: number;
  cartaoDebito: number;
  dinheiroFisico: number;
  totalEntradas: number;
  contasPagar: number;
  caixaAnterior: number;
  caixaAtual: number;
  recebiveisAberto: number;
  somaPatio: number;
  jurosParcelamento: number;
  resultado: number;
}

// ============ 10 LOJAS ============
export const mockStores: MockStore[] = [
  {
    id: 'st-01', name: 'Dom Pedro', osTotal: 9240, financialTotal: 9240, divergence: 0, status: 'approved',
    dailyCash: 1820, osCount: 12, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DP&backgroundColor=000000',
    manager: 'Roberto Almeida', mechanics: ['Carlos Silva', 'Fernando Souza', 'André Lima'],
    address: 'Av. Dom Pedro I, 1200 - Centro', phone: '(11) 98765-4321',
  },
  {
    id: 'st-02', name: 'Jabaquara', osTotal: 7180, financialTotal: 7180, divergence: 0, status: 'approved',
    dailyCash: 1240, osCount: 9, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JB&backgroundColor=000000',
    manager: 'Carla Dias', mechanics: ['Marcelo Silva', 'Tiago Ramos'],
    address: 'Av. Jabaquara, 3000 - Jabaquara', phone: '(11) 91234-5678',
  },
  {
    id: 'st-03', name: 'Jorge Bereta', osTotal: 6450, financialTotal: 6130, divergence: -320, status: 'divergence',
    dailyCash: 980, osCount: 8, topError: 'Diferença em 1 OS',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JB&backgroundColor=16181a',
    manager: 'Eduardo Martins', mechanics: ['Luís Ferreira', 'Marcos Paulo', 'Rafael Costa'],
    address: 'Rua Jorge Bereta, 500 - Vila Mariana', phone: '(11) 94567-8901',
  },
  {
    id: 'st-04', name: 'Kennedy', osTotal: 8920, financialTotal: 8920, divergence: 0, status: 'approved',
    dailyCash: 1640, osCount: 11, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=KN&backgroundColor=000000',
    manager: 'Fernanda Oliveira', mechanics: ['Vitor Pereira', 'Ricardo Gomes'],
    address: 'Av. Kennedy, 2500 - Interlagos', phone: '(11) 93456-7890',
  },
  {
    id: 'st-05', name: 'Piraporinha', osTotal: 7630, financialTotal: 7630, divergence: 0, status: 'approved',
    dailyCash: 1320, osCount: 10, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PP&backgroundColor=000000',
    manager: 'Amanda Santos', mechanics: ['José Carlos', 'Matheus Oliveira', 'Bruno Silva'],
    address: 'Rua Piraporinha, 800 - Diadema', phone: '(11) 92345-6789',
  },
  {
    id: 'st-06', name: 'Planalto', osTotal: 0, financialTotal: 0, divergence: 0, status: 'pending',
    dailyCash: 0, osCount: 0, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PL&backgroundColor=16181a',
    manager: 'Daniel Costa', mechanics: ['Augusto Lima'],
    address: 'Av. do Planalto, 300 - SBC', phone: '(11) 95678-1234',
  },
  {
    id: 'st-07', name: 'Ruge', osTotal: 11200, financialTotal: 11200, divergence: 0, status: 'approved',
    dailyCash: 2180, osCount: 15, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=RG&backgroundColor=000000',
    manager: 'Patricia Ruge', mechanics: ['Samuel Nunes', 'Diego Torres', 'Leonardo Barros'],
    address: 'Rua Ruge, 450 - Santo Amaro', phone: '(11) 96789-2345',
  },
  {
    id: 'st-08', name: 'Santo André', osTotal: 8470, financialTotal: 8470, divergence: 0, status: 'approved',
    dailyCash: 1480, osCount: 11, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SA&backgroundColor=000000',
    manager: 'Marcos Andrade', mechanics: ['Gabriel Souza', 'Pedro Henrique'],
    address: 'Av. Industrial, 1800 - Santo André', phone: '(11) 97890-3456',
  },
  {
    id: 'st-09', name: 'Rei do Módulo', osTotal: 9880, financialTotal: 9880, divergence: 0, status: 'approved',
    dailyCash: 1720, osCount: 13, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=RM&backgroundColor=000000',
    manager: 'Lucas Módulo', mechanics: ['Thiago Reis', 'João Victor', 'Caio Mendes'],
    address: 'Rua dos Módulos, 100 - Guarulhos', phone: '(11) 98901-4567',
  },
  {
    id: 'st-10', name: 'Rei do Óleo', osTotal: 15350, financialTotal: 15350, divergence: 0, status: 'approved',
    dailyCash: 2540, osCount: 20, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=RO&backgroundColor=000000',
    manager: 'Ana Paula Reis', mechanics: ['Renato Cruz', 'Fabio Lopes', 'Alexandre Santos', 'Igor Nascimento'],
    address: 'Av. do Óleo, 700 - Osasco', phone: '(11) 99012-5678',
  },
];

// ============ ALERTS ============
export const mockAlerts: MockAlert[] = [
  { id: 'al-01', storeId: 'st-03', storeName: 'Jorge Bereta', title: 'Pagamento Dividido Incorreto', description: 'Pagamento em 3 formas não fecha o total. Diferença: R$ 320,00', severity: 'critical', amount: 320, time: '07:34' },
  { id: 'al-02', storeId: 'st-02', storeName: 'Jabaquara', title: 'Taxa de Parcelamento Incorreta', description: 'Taxa de parcelamento incorreta. Lançado R$ 45 | Esperado R$ 67', severity: 'warning', amount: 22, time: '07:34' },
  { id: 'al-03', storeId: 'st-04', storeName: 'Kennedy', title: 'OS Finalizada sem Pagamento', description: 'OS finalizada sem pagamento registrado', severity: 'warning', time: '07:35' },
  { id: 'al-04', storeId: 'st-01', storeName: 'Dom Pedro', title: 'Conciliação Concluída', description: 'Todos os 12 registros do dia bateram perfeitamente.', severity: 'info', time: '07:32' },
];

// ============ CASH FLOW (30 days, deterministic) ============
export const mockCashFlow: CashFlowData[] = Array.from({ length: 30 }).map((_, i) => {
  const seed = (i + 1) * 7919;
  return {
    date: `${String(i + 1).padStart(2, '0')}/05`,
    in: 60000 + (seed % 30000),
    out: 40000 + (seed % 20000),
  };
});

// ============ TRANSACTIONS (expanded) ============
export const mockTransactions: Transaction[] = [
  { id: 'tx-01', title: 'Recebimento Cartão Crédito', subtitle: 'Dom Pedro', amount: 3840, type: 'in', time: 'Hoje, 14:30', iconType: 'card', storeName: 'Dom Pedro', osNumber: 'OS #4801', paymentMethod: 'Crédito 6x' },
  { id: 'tx-02', title: 'Recebimento Cartão Débito', subtitle: 'Jabaquara', amount: 2218, type: 'in', time: 'Hoje, 13:45', iconType: 'card', storeName: 'Jabaquara', osNumber: 'OS #4798', paymentMethod: 'Débito' },
  { id: 'tx-03', title: 'Pagamento Fornecedor', subtitle: 'AutoPeças Nacional', amount: 4500, type: 'out', time: 'Hoje, 12:15', iconType: 'bank', storeName: 'Ruge', paymentMethod: 'PIX' },
  { id: 'tx-04', title: 'Recebimento PIX', subtitle: 'Kennedy', amount: 1890, type: 'in', time: 'Hoje, 11:30', iconType: 'bank', storeName: 'Kennedy', osNumber: 'OS #4805', paymentMethod: 'PIX' },
  { id: 'tx-05', title: 'Divergência Detectada', subtitle: 'Jorge Bereta - OS #4821', amount: 320, type: 'out', time: 'Hoje, 07:34', iconType: 'alert', storeName: 'Jorge Bereta', osNumber: 'OS #4821', paymentMethod: 'Crédito à vista' },
  { id: 'tx-06', title: 'Sangria de Caixa', subtitle: 'Piraporinha', amount: 800, type: 'out', time: 'Ontem, 18:45', iconType: 'cash', storeName: 'Piraporinha' },
  { id: 'tx-07', title: 'Recebimento Cartão Crédito', subtitle: 'Rei do Óleo', amount: 5200, type: 'in', time: 'Ontem, 17:20', iconType: 'card', storeName: 'Rei do Óleo', osNumber: 'OS #4790', paymentMethod: 'Crédito 3x' },
  { id: 'tx-08', title: 'Pagamento Fornecedor', subtitle: 'Lubrificantes SP', amount: 3100, type: 'out', time: 'Ontem, 16:00', iconType: 'bank', storeName: 'Santo André', paymentMethod: 'Boleto' },
  { id: 'tx-09', title: 'Recebimento Débito', subtitle: 'Rei do Módulo', amount: 1450, type: 'in', time: 'Ontem, 14:30', iconType: 'card', storeName: 'Rei do Módulo', osNumber: 'OS #4788', paymentMethod: 'Débito' },
  { id: 'tx-10', title: 'Recebimento PIX', subtitle: 'Dom Pedro', amount: 2700, type: 'in', time: 'Ontem, 12:00', iconType: 'bank', storeName: 'Dom Pedro', osNumber: 'OS #4785', paymentMethod: 'PIX' },
  { id: 'tx-11', title: 'Pagamento Funcionários', subtitle: 'Folha Semanal - Ruge', amount: 8500, type: 'out', time: '2 dias atrás', iconType: 'bank', storeName: 'Ruge' },
  { id: 'tx-12', title: 'Recebimento Cartão', subtitle: 'Jabaquara', amount: 3300, type: 'in', time: '2 dias atrás', iconType: 'card', storeName: 'Jabaquara', osNumber: 'OS #4776', paymentMethod: 'Crédito 2x' },
];

// ============ SUMMARY ============
export const summaryData = {
  totalIn: mockStores.reduce((acc, s) => acc + s.financialTotal, 0),
  totalOut: 79840,
  totalDivergences: mockStores.reduce((acc, s) => acc + Math.abs(s.divergence), 0),
  motorStatus: 'completed' as const,
  saldoConsolidado: 4480,
  carrosNoPatio: 23,
};

// ============ CONCILIAÇÃO DETALHADA ============
export const mockConciliacaoResumo: MockConciliacaoResumo = {
  cartaoCredito: 38420,
  cartaoDebito: 22180,
  dinheiroFisico: 14920,
  totalEntradas: 75520,
  contasPagar: 71040,
  caixaAnterior: 8200,
  caixaAtual: 12680,
  recebiveisAberto: 18430,
  somaPatio: 31200,
  jurosParcelamento: 1240,
  resultado: 0.42,
};

export const mockConciliacaoDetalhes: MockConciliacaoDetalhe[] = [
  { storeId: 'st-01', storeName: 'Dom Pedro', entradas: 9240, dinheiro: 1820, contas: 8800, resultado: 0, status: 'OK' },
  { storeId: 'st-02', storeName: 'Jabaquara', entradas: 7180, dinheiro: 1240, contas: 6900, resultado: -22, status: 'Divergência' },
  { storeId: 'st-03', storeName: 'Jorge Bereta', entradas: 6450, dinheiro: 980, contas: 6100, resultado: -320, status: 'Divergência' },
  { storeId: 'st-04', storeName: 'Kennedy', entradas: 8920, dinheiro: 1640, contas: 8500, resultado: 0, status: 'OK' },
  { storeId: 'st-05', storeName: 'Piraporinha', entradas: 7630, dinheiro: 1320, contas: 7200, resultado: 0, status: 'OK' },
  { storeId: 'st-06', storeName: 'Planalto', entradas: 0, dinheiro: 0, contas: 4200, resultado: 0, status: 'OK' },
  { storeId: 'st-07', storeName: 'Ruge', entradas: 11200, dinheiro: 2180, contas: 10800, resultado: 0, status: 'OK' },
  { storeId: 'st-08', storeName: 'Santo André', entradas: 8470, dinheiro: 1480, contas: 8100, resultado: 0, status: 'OK' },
  { storeId: 'st-09', storeName: 'Rei do Módulo', entradas: 9880, dinheiro: 1720, contas: 9400, resultado: 0, status: 'OK' },
  { storeId: 'st-10', storeName: 'Rei do Óleo', entradas: 15350, dinheiro: 2540, contas: 14600, resultado: 0, status: 'OK' },
];

// ============ CARROS NO PÁTIO ============
const plates = ['NNN82N3','XND28P9','DNX55L6','HNT55R8','AAA10A1','KAQ91C2','QAK73Y4','UAG37E8','GAU48W7','EAW64G5','WAE10U1','OAM91I2','RNJ46T7','JNR37H8','BNZ73V4','MPQ28X5','FGH91K3','TYU45M7','PLK82N6','QWE19R4','ZXC55T8','VBN37U2','LKJ64W9'];
const statuses: MockPatioOS['status'][] = ['em_aberto','pago_parcial','finalizado','em_aberto','em_aberto','pago_parcial','em_aberto','pago_parcial','em_aberto','finalizado','em_aberto','finalizado','em_aberto','finalizado','em_aberto','pago_parcial','finalizado','em_aberto','pago_parcial','finalizado','em_aberto','em_aberto','pago_parcial'];
const methods = ['Crédito à vista','PIX','Crédito 6x','Débito','—','Crédito 3x','—','Crédito 6x','—','Crédito à vista','—','PIX','—','Crédito 3x','—','Débito','Crédito à vista','—','PIX','Crédito 6x','—','—','Débito'];
const storeNames = ['Kennedy','Santo André','Rei do Óleo','Jabaquara','Dom Pedro','Dom Pedro','Ruge','Piraporinha','Jorge Bereta','Rei do Módulo','Rei do Módulo','Jorge Bereta','Jabaquara','Planalto','Planalto','Piraporinha','Ruge','Kennedy','Santo André','Rei do Óleo','Dom Pedro','Ruge','Rei do Módulo'];

export const mockPatioOS: MockPatioOS[] = plates.map((plate, i) => {
  const total = 4800 - (i * 130);
  const paid = statuses[i] === 'finalizado' ? total : statuses[i] === 'pago_parcial' ? Math.floor(total * 0.45) : 0;
  return {
    id: `os-${i + 1}`,
    osNumber: `OS #${4773 + i}`,
    storeId: `st-${String((i % 10) + 1).padStart(2, '0')}`,
    storeName: storeNames[i],
    plate,
    totalValue: total,
    paidValue: paid,
    paymentMethod: methods[i],
    status: statuses[i],
    daysOpen: [6,12,12,6,1,5,7,11,1,5,7,11,10,2,4,3,8,1,9,6,2,14,3][i],
  };
});

// ============ RECEBÍVEIS ============
export const mockReceivables: MockReceivable[] = [
  { id: 'rc-01', date: '15/05', storeName: 'Dom Pedro', type: 'Cartão Crédito', value: 3840, status: 'pendente', dueDate: '20/05' },
  { id: 'rc-02', date: '15/05', storeName: 'Jabaquara', type: 'Cartão Débito', value: 2218, status: 'recebido', dueDate: '15/05' },
  { id: 'rc-03', date: '14/05', storeName: 'Kennedy', type: 'PIX', value: 1890, status: 'recebido', dueDate: '14/05' },
  { id: 'rc-04', date: '14/05', storeName: 'Rei do Óleo', type: 'Cartão Crédito', value: 5200, status: 'pendente', dueDate: '19/05' },
  { id: 'rc-05', date: '13/05', storeName: 'Ruge', type: 'Cartão Crédito', value: 4100, status: 'pendente', dueDate: '18/05' },
  { id: 'rc-06', date: '13/05', storeName: 'Rei do Módulo', type: 'Cartão Débito', value: 1450, status: 'recebido', dueDate: '13/05' },
  { id: 'rc-07', date: '12/05', storeName: 'Santo André', type: 'Boleto', value: 3100, status: 'vencido', dueDate: '12/05' },
  { id: 'rc-08', date: '12/05', storeName: 'Jorge Bereta', type: 'Cartão Crédito', value: 2800, status: 'pendente', dueDate: '17/05' },
  { id: 'rc-09', date: '11/05', storeName: 'Piraporinha', type: 'PIX', value: 1200, status: 'recebido', dueDate: '11/05' },
  { id: 'rc-10', date: '11/05', storeName: 'Dom Pedro', type: 'Cartão Crédito', value: 6500, status: 'pendente', dueDate: '16/05' },
  { id: 'rc-11', date: '10/05', storeName: 'Jabaquara', type: 'Boleto', value: 2200, status: 'vencido', dueDate: '10/05' },
  { id: 'rc-12', date: '10/05', storeName: 'Kennedy', type: 'Cartão Crédito', value: 3700, status: 'pendente', dueDate: '15/05' },
];

// ============ CONCILIATION REPORT (legacy compat) ============
export interface MockConciliationReport {
  date: string;
  totalProcessedOs: number;
  totalApprovedAmount: number;
  divergenceCount: number;
  topDivergences: string[];
  processedStores: number;
  pendingStores: number;
}

export const mockConciliationReport: MockConciliationReport = {
  date: new Date().toLocaleDateString('pt-BR'),
  totalProcessedOs: 132,
  totalApprovedAmount: 173200.00,
  divergenceCount: 2,
  topDivergences: ['Pagamento dividido em Jorge Bereta (OS #4821)', 'Taxa parcelamento em Jabaquara (OS #4798)'],
  processedStores: 10,
  pendingStores: 0,
};
