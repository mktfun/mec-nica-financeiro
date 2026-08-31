# Design: Matching Automático de Saídas OFX × Contas a Pagar e Filtro Estrito de Órfãos (325)

## Arquitetura e Fluxo de Dados

```
[Arquivos de Importação: 10 OFX + BuscaContasAPagar.xls]
  │
  ├── 1. Pré-Match em Memória (Client-side)
  │      - Cruza tx.amount (débito OFX) com conta.amount (BuscaContasAPagar)
  │      - Atribui matched_bill_id e matched_ofx_id nos objetos em memória
  │
  ├── 2. Persistência no Supabase (Batch Atômico)
  │      - Inserção das contas em daily_manual_bills
  │      - Upsert das transações em ofx_transactions (com target_date e type normalizados)
  │
  ├── 3. Motor Backend de 5 Camadas (auto_match_saidas RPC)
  │      - Camada 1: Match por FITID / Código Externo
  │      - Camada 2: Match por Valor Exato + Mesma Filial
  │      - Camada 3: Match por Valor Exato + Filial Matriz / Nula
  │      - Camada 4: Match Global de Valor Único no Dia
  │      - Camada 5: Match Fuzzy Bidirecional (Fornecedor / Título)
  │      - Atualiza matched_bill_id e matched_ofx_id no banco
  │
  ▼
[Passo 5: Justificativas de Movimentações por Loja (UI)]
  │
  ├── Consulta Reativa:
  │      SELECT * FROM ofx_transactions
  │      WHERE target_date = :targetDate
  │        AND type = 'out'
  │        AND matched_bill_id IS NULL;
  │
  ├── Renderização Estrita:
  │      - Se lista vazia (todas casadas): Exibe Card Verde "✅ 100% dos Débitos Vinculados"
  │      - Se lista com itens: Exibe APENAS os débitos que restaram órfãos
  │      - Opções por débito órfão:
  │          * Selecionar Categoria (Peças, Serviços, Tarifa, Transferência, etc.)
  │          * Toggle "Adicionar ao Contas a Pagar (Despesa Extra)?" (Sim / Não)
  │          * Salvar -> dispara resolve_orphan_saida_ofx RPC -> item some da lista
```

---

## Interfaces TypeScript

```typescript
// Transação OFX pendente de justificativa (apenas órfãos reais)
export interface OrphanOFXOutflow {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  date: string;
  fitid: string;
  type: 'out';
  matchedBillId: string | null;
  contabilizarNoSubtotal: boolean;
  manualCategory?: string;
  manualJustification?: string;
}

// Retorno da query de débitos órfãos do Supabase
export interface PendingDbOutflowRow {
  id: string;
  store_id: string;
  bank_name: string;
  type: 'in' | 'out';
  amount: number;
  occurred_at: string;
  fitid: string;
  counterpart_name: string;
  title: string;
  matched_bill_id: string | null;
  match_status: string;
  target_date: string;
  contabilizar_no_subtotal: boolean;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- **Remoção do Fallback Falso-Positivo:**
  - Se `!isLoadingOutflows`, usar exclusivamente os registros de `dbOutflows` retornados pelo banco.
  - Se `dbOutflows.length === 0`, renderizar empty state limpo em Dark UI (sem reintroduzir o array não-casado da memória).
- **Tratamento de Headers Bancários:**
  - Filtrar transações de cabeçalho como `SALDO ANTERIOR`, `SALDO TOTAL DISPONIVEL DIA` via regex `EXCLUDE_BANK_EARNINGS_REGEX`.

### 2. `src/hooks/useTransactions.ts`
- **Correção de Upsert em `useBulkInsertTransactions`:**
  - Remover `ignoreDuplicates: true` na chamada `.upsert(...)` de `ofx_transactions`, permitindo que reimportações atualizem `target_date`, `type`, `amount`, `occurred_at` e `counterpart_name`.

### 3. `src/components/importacoes/CentralImportWizard.tsx` & `src/lib/matchers/expenseMatcher.ts`
- **Pré-Matching em Memória durante o Upload:**
  - Ao carregar `contasPagarResults` e `ofxResults`, executar um cross-match imediato por valor/loja/fornecedor, preenchendo `matched_bill_id` preliminarmente.
  - Chamar `auto_match_saidas(targetDate)` sequencialmente no backend e invalidar queries antes de abrir o Passo 5.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Importação da pasta `31-08` com 47 contas e 52 débitos OFX
- **SCAN:** Usuário carrega os 10 arquivos OFX e `BuscaContasAPagar.xls` da pasta `31-08`.
- **INFER:** 44 débitos coincidem exatamente em valor e favorecido com as contas da planilha; 5 são cabeçalhos de saldo; 3 são débitos residuais (tarifas/sispag avulso).
- **VERIFY:**
  1. Ao abrir o Passo 5, a aba *"Saídas Órfãs"* exibe apenas **3 ou 4 itens** (não 47).
  2. Cada saída casada está associada à sua conta no banco com `matched_bill_id` preenchido.
  3. As 44 contas casadas não aparecem para re-justificativa manual.
- **FIX:** Sem falsos-positivos.

### Cenário 2: Justificativa de débito órfão e inclusão como despesa extra
- **SCAN:** O operador visualiza um débito de R$ 9,14 de tarifa bancária.
- **INFER:** O operador seleciona a categoria *"Tarifa Bancária / Encargos"* e mantém o toggle *"Adicionar ao Contas a Pagar"*.
- **VERIFY:**
  1. Clica em *"Salvar Justificativa"*.
  2. A RPC `resolve_orphan_saida_ofx` insere a despesa extra e vincula o débito.
  3. A contagem de Saídas Órfãs diminui para o total restante.
- **FIX:** Contas a Pagar e DRE atualizados em tempo real.
