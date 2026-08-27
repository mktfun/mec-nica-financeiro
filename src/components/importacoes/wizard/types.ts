// src/components/importacoes/wizard/types.ts

export type PaymentMethodType = 
  | 'PIX'
  | 'Cartao de Debito'
  | 'Cartao de Credito'
  | 'Dinheiro'
  | 'Transferencia'
  | 'Boleto'
  | string;

export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix' | 'ofx_outros';
  storeId: string;
  storeName: string;
  amount: number;
  date: string;
  paymentMethod: string; // Já detectado na transação (ex: 'Cartão de Crédito Visa', 'PIX')
  description: string;
  nsu?: string;
  clientName?: string;
  matchedOsId?: string;
  matchedOsNumber?: string;
  status: 'pendente' | 'vinculada' | 'justificada';
}

export interface LinkTransactionToOsPayload {
  transactionId: string;
  osId: string;
  storeId: string;
  amount: number;
  paymentMethod: string; // Herança direta sem dropdowns redundantes
  osNumber?: string;
}

export type NonRevenueCategory = 
  | 'transferencia_filiais'
  | 'aporte_capital'
  | 'devolucao_estorno'
  | 'tarifa_bancaria'
  | 'receita_avulsa';

export interface NonRevenueJustificationItem {
  transactionId: string;
  storeId: string;
  amount: number;
  category: NonRevenueCategory;
  destinationStoreId?: string;
  reasonText: string;
  createdAt: string;
}

export interface DanielVaultPickup {
  storeId: string;
  storeName: string;
  currentVaultBalance: number;
  amountCollected: number;
  confirmed: boolean;
}

export type WizardStepId = 
  | 'ingestao'         // Upload conjunto + inputs manuais iniciais
  | 'orfaos'           // Passo 1: Transações sem lançamento na OS (vínculo 1 clique)
  | 'justificativas'   // Passo 2: Justificativas de não-faturamento (editáveis/canceláveis)
  | 'daniel_cofre'     // Passo 3: Conferência de cofre do Daniel
  | 'auditoria_final'; // Passo 4: Auditoria dos 5 pilares, IA e fechamento do dia

export interface WizardMasterState {
  currentStep: WizardStepId;
  targetDate: string;
  rawFilesLoaded: boolean;
  manualInputs: {
    odometerAdjustments: Record<string, number>;
    manualBills: Array<{ id: string; storeId: string; description: string; amount: number }>;
    notes?: string;
  };
  unmatchedTransactions: PendingUnmatchedTransaction[];
  justifications: Record<string, NonRevenueJustificationItem>;
  danielVault: {
    hadPickup: boolean | null;
    pickups: Record<string, DanielVaultPickup>;
  };
}
