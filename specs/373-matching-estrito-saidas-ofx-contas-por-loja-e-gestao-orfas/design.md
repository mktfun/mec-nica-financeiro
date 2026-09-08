# Design: Matching Estrito de Saídas OFX x Contas a Pagar (Loja a Loja) & Isolamento de Órfãs (373)

## 1. Arquitetura de Fluxo Ponta a Ponta

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PIPELINE DE BATIMENTO ESTREITO                                      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. INGESTÃO DE DADOS                                                                                   │
│    - BuscaContasAPagar.xls -> Parser (STORE_EMP_MAP) -> daily_manual_bills (store_id, amount, date)   │
│    - Extratos Itaú OFX     -> Store Mapping (Ag/Conta) -> ofx_transactions (store_id, amount, 'out')   │
│                                                                                                        │
│ 2. MOTOR DE BATIMENTO DETERMINÍSTICO (public.auto_match_saidas)                                       │
│    - Camada 1: Código de Barras / FITID exato na mesma loja.                                          │
│    - Camada 2: Valor idêntico (dif <= R$ 0,05) E estritamente na MESMA FILIAL (o.store_id = b.store_id)│
│    - Camada 3: Valor idêntico + Favorecido compatível (tokens) na MESMA FILIAL.                        │
│    - Camada 4: Contas da Matriz (store_id IS NULL / 'master') batendo com débito holding/filial.       │
│    - ZERO auto-categorização no vácuo. ZERO match cruzado entre filiais distintas (Loja A x Loja B).  │
│                                                                                                        │
│ 3. RESULTADO NO POSTGRESQL & NA UI                                                                     │
│    ├─► CONCILIADO (OFX x Conta):                                                                      │
│    │     ofx_transactions.matched_bill_id = bill.id                                                   │
│    │     daily_manual_bills.matched_ofx_id = ofx.id                                                   │
│    │                                                                                                   │
│    └─► SAÍDA ÓRFÃ REAL (Sem correspondente no ERP):                                                   │
│          ofx_transactions.matched_bill_id = NULL                                                       │
│          ofx_transactions.manual_category = NULL                                                       │
│          -> Apresentada na Fila de Órfãs para Justificativa Consciente do Operador:                    │
│             [ Opção A ]: Vincular a Conta Existente                                                   │
│             [ Opção B ]: Lançar como Despesa Extra da Filial (is_extra = true)                         │
│             [ Opção C ]: Justificar como Transferência Intercompany / Tarifa (Não Operacional)         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Interfaces TypeScript Reais

```typescript
// Interface do Batimento entre Débito Bancário e Conta a Pagar
export interface StoreExpenseMatchPair {
  ofxTransactionId: string;
  billId: string;
  storeId: string;
  storeName: string;
  amount: number;
  recipientName: string;
  description: string;
  matchLayer: 'fitid_code' | 'exact_store' | 'exact_store_token' | 'master_shared';
  confidence: number;
}

// Interface de Débito Bancário Órfão (Sem provisão no ERP)
export interface OrphanOutflowTransaction {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  occurredAt: string;
  targetDate: string;
  counterpartName: string;
  bankName: string;
  fitid: string;
  matchedBillId: null;
  manualCategory: null;
}

// Resposta da RPC auto_match_saidas
export interface AutoMatchSaidasResponse {
  success: boolean;
  date: string;
  matchedCount: number;
  unmatchedBillsCount: number;
  orphanOutflowsCount: number;
  matchedPairs: Array<{
    ofxId: string;
    billId: string;
    storeId: string;
    amount: number;
  }>;
}

// Payload para Justificativa de Saída Órfã (resolve_orphan_saida_ofx)
export interface ResolveOrphanSaidaPayload {
  p_ofx_id: string;
  p_category: string;
  p_justification?: string;
  p_contabilizar_no_subtotal: boolean;
  p_store_id?: string;
  p_amount?: number;
  p_target_date?: string;
  p_bill_id?: string;
}
```

---

## 3. Lista de Módulos Tocados

### Database / Migrations:
- **[NEW] `supabase/migrations/20260905000033_strict_store_by_store_auto_match_saidas.sql`**:
  - Atualização da RPC `public.auto_match_saidas(p_date date)` com restrição intra-loja estrita (`o.store_id = bill_rec.store_id`), expurgo da camada cruzada global e suporte prioritário a contas da matriz.
  - Atualização da RPC `public.auto_match_daily_transactions` para disparar `auto_match_saidas` e garantir que nenhuma saída seja auto-categorizada por inferência cega.

### Frontend / Ingestão:
- **[MODIFY] `src/hooks/useContasAPagarImport.ts`**:
  - Adicionar chamada compulsória a `supabase.rpc('auto_match_saidas', { p_date: targetDate })` imediatamente após salvar os lotes de contas no banco de dados.
- **[MODIFY] `src/components/importacoes/CentralImportWizard.tsx`**:
  - No `handleConfirm`, adicionar chamada de `auto_match_saidas` logo após a gravação das transações OFX e contas, garantindo que o banco de dados já persista todos os vínculos antes do fechamento do lote.
- **[MODIFY] `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx`**:
  - Adicionar feedback visual e contadores cristalinos de:
    - *Contas Conciliadas com Débitos da Loja (X de Y)*
    - *Débitos Órfãos a Justificar (Z)*
  - Garantir o fluxo de resolução direta via modalidade de despesa extra ou justificativa corporativa.
- **[MODIFY] `src/components/conciliacao/StoreExtratoBancarioView.tsx`**:
  - Assegurar que os botões de ação rápida reflitam estritamente a relação conta a conta da mesma loja, sem gerar falsos positivos.

---

## 4. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

### Cenário 1: Batimento Exato Conta a Conta na Mesma Filial
- **SCAN:** O operador importa `BuscaContasAPagar.xls` contendo 3 títulos para a Loja Mauá (R$ 500,00 - Fornecedor A, R$ 1.250,00 - Fornecedor B, R$ 340,00 - Fornecedor C). O extrato OFX de Mauá possui 3 débitos com os exatos mesmos valores.
- **INFER:** O sistema deve parear os 3 débitos com os 3 títulos de Mauá, gravando `matched_bill_id` e `matched_ofx_id`.
- **VERIFY:** Na tabela `ofx_transactions`, os 3 débitos têm `matched_bill_id IS NOT NULL`. Na tabela `daily_manual_bills`, os 3 têm `matched_ofx_id IS NOT NULL`. O contador de órfãos de Mauá é 0.
- **FIX:** Se houver empate de valor na mesma loja, usar o token do fornecedor para desempate inequívoco.

### Cenário 2: Isolamento de Débito Órfão e Blindagem Anti-Cross-Store
- **SCAN:** A Loja Jabaquara possui uma conta a pagar de R$ 850,00 (Fornecedor X). A Loja Planalto possui um débito bancário de R$ 850,00 no OFX, mas NENHUMA conta cadastrada.
- **INFER:** O sistema NÃO DEVE casar o débito da Planalto com a conta da Jabaquara, pois são filiais distintas.
- **VERIFY:** O débito da Planalto permanece como **Saída Órfã** (`matched_bill_id = NULL`). A conta da Jabaquara permanece em aberto (`matched_ofx_id = NULL`). O operador visualiza o débito na Planalto como "Débito sem Provisão no ERP" e tem as 3 opções de justificativa explícita.
- **FIX:** Proibir sumariamente `o.store_id != bill_rec.store_id` (a menos que `bill_rec.store_id` seja NULL/master).
