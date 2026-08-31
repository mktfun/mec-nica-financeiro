# Design: Idempotência do Motor de Conciliação, Conciliação de Saídas OFX x Contas e Justificativa de Despesas Órfãs (322)

## Arquitetura e Fluxo de Dados

```
1. PREVIEW GERAL (Step 3)
   │
   ▼ [Processar e Conciliar com IA] (EXECUTA UMA ÚNICA VEZ)
   ├── Salva em lote: patio_os, pos_transactions, ofx_transactions, daily_manual_bills
   ├── Executa RPCs: auto_match_transactions, auto_match_saidas, calculate_daily_conciliation
   └── Executa Reconciliação Pericial com IA (Gemini)
   │
   ▼
2. RESOLUÇÃO DE PENDÊNCIAS RESIDUAIS
   ├── Step 4: Vínculo de Pagamentos sem OS (Entradas / Vendas Órfãs via ManualMatchOsModal)
   ├── Step 5: Justificativas de Não-Faturamento (Entradas) & Despesas Órfãs (Saídas OFX)
   │    ├── Aba 1: Entradas Órfãs -> Justifica & define se entra no Faturamento do Dia
   │    └── Aba 2: Saídas Órfãs -> Justifica & define se Adiciona no Contas (Despesa Extra) ou Apenas Justifica
   ├── Step 6: Conferência de Cofre do Daniel
   └── Step 7: Auditoria Final dos 5 Pilares
        │
        ▼ [Finalizar e Salvar Fechamento] (ATÔMICO - RPC close_daily_snapshot)
        └── Atualiza daily_snapshots.is_closed = true & sela o dia
```

## Interfaces TypeScript

```typescript
export interface OFXOutflowEntry {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  counterpartName?: string;
  date: string;
  fitid: string;
  matchedBillId?: string;
}

export interface ResolveSaidaPayload {
  ofxId: string;
  category: string;
  justification?: string;
  adicionaNoContas: boolean;
  storeId?: string;
  amount?: number;
  targetDate?: string;
  billId?: string;
}
```

## Mutações em Arquivos Existentes [MODIFY]

### 1. `supabase/migrations/20260831000008_resolve_orphan_saida_ofx.sql`
- Cria as RPCs `public.resolve_orphan_saida_ofx` e `public.close_daily_snapshot`.

### 2. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- Adiciona abas `Entradas Órfãs` e `Saídas Órfãs`.
- Corrige inserção indevida de créditos bancários na tabela `daily_manual_bills`.
- Renderiza tabela de débitos do OFX com seleção de categoria, toggle *"Adicionar no Contas (Despesa Extra)"* e botão de vínculo rápido a contas existentes.

### 3. `src/components/importacoes/CentralImportWizard.tsx`
- Atualiza o Step 7 para invocar `close_daily_snapshot` sem reexecutar inserções do lote.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Saída do OFX com Adicionar no Contas (Despesa Extra)
- **SCAN:** Débito de R$ 350,00 no OFX da Loja 01 sem correspondência em `daily_manual_bills`.
- **INFER:** O operador seleciona "Despesa Avulsa / Peças" e marca o toggle *"Adicionar ao Contas a Pagar"*.
- **VERIFY:** A RPC `resolve_orphan_saida_ofx` insere uma conta em `daily_manual_bills` com `is_extra = true` e `contabilizar_no_subtotal = true`. O `Subtotal Contas` é recalculado e reflete a nova despesa.
- **FIX:** Nenhuma discrepância contábil gerada.

### Cenário 2: Saída do OFX como Transferência Financeira (Sem Adicionar no Contas)
- **SCAN:** Débito de R$ 5.000,00 no OFX referente a transferência entre filiais.
- **INFER:** O operador seleciona "Transferência Entre Lojas" com toggle desativado (`adiciona_no_contas = false`).
- **VERIFY:** A transação OFX é atualizada para `match_status = 'JUSTIFIED'`. O `Subtotal Contas` operacional permanece inalterado.
