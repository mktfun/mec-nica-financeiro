# Design: Criação de Nova OS com Baixa e Vínculo de Pagamento Manual no Wizard (341)

## Arquitetura e Fluxo de Dados

```
[ Step1UnregisteredPayments ]
         │
         ▼
[ ManualMatchOsModal ] ──(Aba "Criar Nova OS")──► Informa (Nº OS, Loja, Cliente, Placa, Total)
         │
         ▼
[ useManualMatch.createAndLinkOs ]
         │
         ▼
[ Supabase RPC: create_and_link_manual_os ]
         │
         ├─► Se OS não existe: INSERT INTO patio_os (..., total_value, paid_value, pix/credit/debit, status)
         ├─► Se OS existe: UPDATE patio_os (incrementa paid_value, pix/credit/debit, recalcula status)
         ├─► UPDATE ofx_transactions / pos_transactions (matched_os_number = os_number)
         └─► INSERT INTO conciliation_matches
         │
         ▼
[ Invalidação de Queries React Query ] ──► Lista de pendências no Step 1 atualiza em tempo real
```

---

## Interfaces TypeScript

```typescript
export interface CreateAndLinkOsParams {
  transactionType: 'ofx' | 'rede' | 'pix';
  transactionId: string;
  storeId: string;
  osNumber: string;
  clientName?: string;
  plate?: string;
  totalValue: number;
  paymentMethod?: string;
  linkAmount?: number;
}

export interface UseManualMatchResult {
  linkTransactionToOs: (
    transactionId: string, 
    osNumber: string, 
    storeId?: string,
    source?: 'ofx' | 'rede',
    amount?: number
  ) => Promise<{ success: boolean; error?: string }>;
  
  createAndLinkOs: (
    params: CreateAndLinkOsParams
  ) => Promise<{ success: boolean; error?: string; osNumber?: string }>;

  unlinkTransaction: (
    transactionId: string, 
    osNumber?: string,
    source?: 'ofx' | 'rede'
  ) => Promise<{ success: boolean; error?: string }>;

  loading: boolean;
  error: string | null;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

1. `supabase/migrations/20260901000016_create_and_link_manual_os_rpc.sql` [NEW]:
   - Define a RPC `create_and_link_manual_os` e atualiza `link_manual_pix_to_os` e `link_manual_rede_to_os`.

2. `src/hooks/useManualMatch.ts` [MODIFY]:
   - Adiciona `createAndLinkOs` com chamada à RPC `create_and_link_manual_os` e invalidação das queries `['available_store_os']`, `['patio_os']`, `['reconciliation_views']`, `['daily-reconciliation-summary']`.

3. `src/components/conciliacao/ManualMatchOsModal.tsx` [MODIFY]:
   - Adiciona controle de abas (`activeTab: 'search' | 'create'`).
   - Na aba `'create'`: formulário com inputs padronizados de Número de OS, Loja, Cliente, Placa, Valor Total e Forma de Pagamento.
   - Pré-popula loja e valor com base na transação ativa.

4. `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` [MODIFY]:
   - Garante que a transação vinculada/criada seja removida da lista ativa e computada como vinculada na sessão.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1: Criação de Nova OS e Vínculo de PIX de R$ 365,75 (Valter Evangelista em Mauá):**
  - *Estado Inicial:* PIX de R$ 365,75 pendente no Step 1 para a loja Mauá, sem OS correspondente no banco.
  - *Ação:* Operador clica em "Vincular", vai na aba "Criar Nova OS na Loja", digita OS #`9901`, Cliente `Valter Evangelista`, Valor Total `R$ 365,75` e clica em "Criar OS e Vincular Pagamento".
  - *Resultado Esperado:* A OS #`9901` é criada em `patio_os` com `total_value = 365.75`, `paid_value = 365.75`, `pix_transfer_value = 365.75`, `status = 'finalizada'`, a transação bancária é marcada com `matched_os_number = '9901'` e some imediatamente da tabela de pendências do Step 1.

- **Cenário 2: Criação de OS com Pagamento Parcial (Venda REDE de R$ 714,38 para OS de R$ 1.500,00):**
  - *Estado Inicial:* Venda REDE de R$ 714,38 pendente no Step 1.
  - *Ação:* Operador cria OS #`9902` com Valor Total `R$ 1.500,00` e vincula o pagamento de R$ 714,38.
  - *Resultado Esperado:* A OS #`9902` é criada com `total_value = 1500.00`, `paid_value = 714.38`, `debit_value = 714.38`, `status = 'pago_parcial'` (saldo restante em aberto = R$ 785,62) e a transação REDE é dada como liquidada.
