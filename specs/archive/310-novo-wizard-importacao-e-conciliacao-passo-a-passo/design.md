# Design: Novo Wizard Modular de Importação e Conciliação (310)

## Fluxo de Vínculo de 1 Clique (Herança Direta de Valor e Forma de Pagamento)

```
[ TRANSAÇÃO PENDENTE (OFX ou REDE) ]
  ├── Valor: R$ 350,00 (já lido do arquivo)
  ├── Meio: "Crédito Visa" ou "PIX" (já lido do arquivo)
  └── Loja: "Dom Pedro - DP" (já mapeada)
            │
            ▼ (Operador clica em "Vincular a uma OS")
[ LISTA DE OSs DA MESMA LOJA NO PÁTIO ]
  ├── OS #542 • Honda Civic • Marcos (R$ 500 em aberto)  <── [Operador Clica Aqui]
  ├── OS #543 • Onix • Ana (R$ 300 em aberto)
  └── OS #544 • Corolla • Carlos (R$ 1.200 em aberto)
            │
            ▼ (Sistema aplica sem perguntas redundantes)
[ BANCO DE DADOS (patio_os & conciliation_matches) ]
  ├── patio_os: paid_value += 350.00
  ├── patio_os: payment_method = 'Crédito Visa' (ou concatena se parcial)
  ├── patio_os: status = (paid_value >= total_value ? 'finalizada' : 'pago_parcial')
  ├── conciliation_matches: INSERT (transaction_id, os_id, amount, match_type)
  └── Abatimento imediato em NA LOJA OS (Pátio) daquela filial
```

## Interfaces TypeScript
```typescript
export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix' | 'ofx_outros';
  storeId: string;
  storeName: string;
  amount: number;
  date: string;
  paymentMethod: string; // Já extraído do arquivo de origem (ex: 'PIX', 'Cartão Crédito', 'Débito')
  description: string;
  nsu?: string;
  clientName?: string;
}

export interface LinkTransactionToOsPayload {
  transactionId: string;
  osId: string;
  storeId: string;
  amount: number;
  paymentMethod: string; // Herança direta da transação
}

export interface NonRevenueJustificationItem {
  transactionId: string;
  storeId: string;
  amount: number;
  category: 'transferencia_filiais' | 'aporte_capital' | 'devolucao_estorno' | 'tarifa_bancaria' | 'receita_avulsa';
  destinationStoreId?: string;
  reasonText: string;
  isDraft: boolean;
}

export interface DanielVaultPickup {
  storeId: string;
  storeName: string;
  currentVaultBalance: number;
  amountCollected: number;
  confirmed: boolean;
}
```
